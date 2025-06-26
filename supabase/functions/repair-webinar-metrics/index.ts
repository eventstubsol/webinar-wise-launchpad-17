
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  console.log('=== WEBINAR METRICS REPAIR FUNCTION START ===');
  
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    const { connectionId, action = 'repair' } = await req.json();

    if (action === 'report') {
      // Generate repair report
      console.log('Generating metrics repair report...');
      
      let baseQuery = supabase.from('zoom_webinars').select('id, total_attendees, participant_sync_status');
      
      if (connectionId) {
        baseQuery = baseQuery.eq('connection_id', connectionId);
      }

      // Get counts for different categories
      const [needingRepair, zeroAttendees, pendingSync, failedSync] = await Promise.all([
        baseQuery.or('total_attendees.is.null,total_attendees.eq.0,participant_sync_status.eq.pending,participant_sync_status.eq.failed'),
        baseQuery.eq('total_attendees', 0),
        baseQuery.eq('participant_sync_status', 'pending'),
        baseQuery.eq('participant_sync_status', 'failed')
      ]);

      const report = {
        webinarsNeedingRepair: needingRepair.data?.length || 0,
        webinarsWithZeroAttendees: zeroAttendees.data?.length || 0,
        webinarsWithPendingSync: pendingSync.data?.length || 0,
        webinarsWithFailedSync: failedSync.data?.length || 0
      };

      return new Response(JSON.stringify({ success: true, report }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Perform batch repair
    console.log('Starting batch metrics repair...');
    
    // Find webinars needing repair
    let query = supabase
      .from('zoom_webinars')
      .select('id, zoom_webinar_id, topic')
      .or('total_attendees.is.null,total_attendees.eq.0,participant_sync_status.eq.pending,participant_sync_status.eq.failed');

    if (connectionId) {
      query = query.eq('connection_id', connectionId);
    }

    const { data: webinars, error } = await query;

    if (error) {
      throw new Error(`Failed to fetch webinars: ${error.message}`);
    }

    if (!webinars || webinars.length === 0) {
      return new Response(JSON.stringify({
        success: true,
        message: 'No webinars found needing repair',
        totalProcessed: 0,
        successCount: 0,
        errorCount: 0
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log(`Found ${webinars.length} webinars needing repair`);

    let successCount = 0;
    let errorCount = 0;
    const errors: string[] = [];

    // Process each webinar
    for (const webinar of webinars) {
      try {
        console.log(`Repairing webinar: ${webinar.zoom_webinar_id}`);
        
        // Get participant metrics
        const { data: participants } = await supabase
          .from('zoom_participants')
          .select('duration')
          .eq('webinar_id', webinar.id);

        // Get registrant count
        const { count: registrantCount } = await supabase
          .from('zoom_registrants')
          .select('*', { count: 'exact', head: true })
          .eq('webinar_id', webinar.id);

        // Calculate metrics
        const totalAttendees = participants?.length || 0;
        const totalRegistrants = registrantCount || 0;
        const totalMinutes = participants?.reduce((sum, p) => sum + (p.duration || 0), 0) || 0;
        const avgDuration = totalAttendees > 0 ? Math.round(totalMinutes / totalAttendees) : 0;
        const totalAbsentees = Math.max(0, totalRegistrants - totalAttendees);

        // Update webinar with metrics
        const updates: any = {
          total_registrants: totalRegistrants,
          total_attendees: totalAttendees,
          total_absentees: totalAbsentees,
          total_minutes: totalMinutes,
          avg_attendance_duration: avgDuration,
          updated_at: new Date().toISOString()
        };

        // Fix sync status
        if (totalAttendees > 0) {
          updates.participant_sync_status = 'completed';
          updates.participant_sync_completed_at = new Date().toISOString();
          updates.participant_sync_error = null;
        } else if (totalRegistrants > 0 && totalAttendees === 0) {
          updates.participant_sync_status = 'no_participants';
        }

        const { error: updateError } = await supabase
          .from('zoom_webinars')
          .update(updates)
          .eq('id', webinar.id);

        if (updateError) {
          throw new Error(`Update failed: ${updateError.message}`);
        }

        successCount++;
        console.log(`✅ Repaired webinar: ${webinar.zoom_webinar_id}`);
        
      } catch (error) {
        errorCount++;
        const errorMsg = `Failed to repair webinar ${webinar.zoom_webinar_id}: ${error.message}`;
        console.error(`❌ ${errorMsg}`);
        errors.push(errorMsg);
      }
    }

    console.log(`Batch repair completed: ${successCount}/${webinars.length} webinars repaired`);

    return new Response(JSON.stringify({
      success: true,
      message: `Repaired metrics for ${successCount} webinars`,
      totalProcessed: webinars.length,
      successCount,
      errorCount,
      errors: errors.slice(0, 10) // Limit errors to first 10
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Metrics repair error:', error);
    
    return new Response(JSON.stringify({
      success: false,
      error: error.message || 'Metrics repair failed'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
