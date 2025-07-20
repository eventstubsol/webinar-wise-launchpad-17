import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders } from "../_shared/cors.ts";

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing required environment variables');
    }
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { connectionId } = await req.json();

    console.log('[FIX-SYNC] Starting fix for webinar data columns...');

    // Get all past webinars that have 0 attendees but have registrants
    const { data: webinarsToFix, error: fetchError } = await supabase
      .from('zoom_webinars')
      .select('*')
      .eq('connection_id', connectionId)
      .eq('status', 'ended')
      .gt('total_registrants', 0)
      .eq('total_attendees', 0);

    if (fetchError) {
      throw new Error(`Failed to fetch webinars: ${fetchError.message}`);
    }

    console.log(`[FIX-SYNC] Found ${webinarsToFix?.length || 0} webinars to fix`);

    if (!webinarsToFix || webinarsToFix.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No webinars need fixing' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get access token
    const { data: connection, error: connError } = await supabase
      .from('zoom_connections')
      .select('*')
      .eq('id', connectionId)
      .single();

    if (connError || !connection) {
      throw new Error('Connection not found');
    }

    // Decrypt token (simplified for this example)
    const accessToken = connection.access_token; // Assume it's already decrypted

    let fixedCount = 0;
    const errors = [];

    // Process each webinar
    for (const webinar of webinarsToFix) {
      try {
        console.log(`[FIX-SYNC] Processing webinar: ${webinar.topic}`);

        // Fetch participant data from Zoom API
        const participantResponse = await fetch(
          `https://api.zoom.us/v2/past_webinars/${webinar.zoom_webinar_id}/participants?page_size=300`,
          {
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json'
            }
          }
        );

        if (participantResponse.ok) {
          const data = await participantResponse.json();
          const participants = data.participants || [];
          const totalParticipants = data.total_records || 0;

          // Calculate metrics
          let totalMinutes = 0;
          let totalDuration = 0;
          let validParticipants = 0;

          participants.forEach((p: any) => {
            if (p.duration && p.duration > 0) {
              totalDuration += p.duration;
              totalMinutes += Math.ceil(p.duration / 60);
              validParticipants++;
            }
          });

          const avgDuration = validParticipants > 0 ? Math.round(totalDuration / validParticipants) : 0;
          const totalAbsentees = webinar.total_registrants - totalParticipants;

          // Update webinar with correct data
          const { error: updateError } = await supabase
            .from('zoom_webinars')
            .update({
              total_attendees: totalParticipants,
              total_absentees: totalAbsentees > 0 ? totalAbsentees : 0,
              total_minutes: totalMinutes,
              avg_attendance_duration: avgDuration,
              participant_sync_status: totalParticipants > 0 ? 'completed' : 'pending',
              participant_sync_completed_at: new Date().toISOString(),
              last_synced_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .eq('id', webinar.id);

          if (updateError) {
            throw updateError;
          }

          console.log(`[FIX-SYNC] ✓ Fixed webinar ${webinar.zoom_webinar_id}: ${totalParticipants} attendees, ${avgDuration}s avg duration`);
          fixedCount++;

        } else {
          // If participant endpoint fails, try the general webinar details endpoint
          const detailsResponse = await fetch(
            `https://api.zoom.us/v2/past_webinars/${webinar.zoom_webinar_id}`,
            {
              headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
              }
            }
          );

          if (detailsResponse.ok) {
            const details = await detailsResponse.json();
            
            // Update with available data
            const { error: updateError } = await supabase
              .from('zoom_webinars')
              .update({
                total_attendees: details.participants_count || 0,
                total_absentees: webinar.total_registrants - (details.participants_count || 0),
                last_synced_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              })
              .eq('id', webinar.id);

            if (!updateError) {
              console.log(`[FIX-SYNC] ✓ Partially fixed webinar ${webinar.zoom_webinar_id} using details endpoint`);
              fixedCount++;
            }
          } else {
            throw new Error(`Failed to fetch data: ${participantResponse.status}`);
          }
        }

        // Add a small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 500));

      } catch (error: any) {
        console.error(`[FIX-SYNC] ✗ Failed to fix webinar ${webinar.zoom_webinar_id}: ${error.message}`);
        errors.push({
          webinar_id: webinar.zoom_webinar_id,
          topic: webinar.topic,
          error: error.message
        });
      }
    }

    console.log(`[FIX-SYNC] Fixed ${fixedCount} out of ${webinarsToFix.length} webinars`);

    return new Response(
      JSON.stringify({
        success: true,
        fixed: fixedCount,
        total: webinarsToFix.length,
        errors: errors.length > 0 ? errors : undefined
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('[FIX-SYNC] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});
