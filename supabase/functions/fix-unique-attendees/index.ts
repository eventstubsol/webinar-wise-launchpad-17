import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('=== FIXING UNIQUE ATTENDEES COUNT ===');
    
    // First, let's analyze the current situation
    const { data: analysis, error: analysisError } = await supabase.rpc('exec_sql', {
      sql: `
        SELECT 
          COUNT(*) as total_webinars,
          COUNT(CASE WHEN total_attendees > 0 THEN 1 END) as webinars_with_attendees,
          COUNT(CASE WHEN total_attendees != unique_participant_count THEN 1 END) as webinars_needing_fix
        FROM zoom_webinars
        WHERE status = 'ended';
      `
    });

    if (analysisError) {
      console.error('Error analyzing webinars:', analysisError);
    } else {
      console.log('Analysis results:', analysis);
    }

    // Update all webinars with the correct unique attendee count
    // This query will count unique participants by email (or participant_id if email is null)
    const { data: updateResult, error: updateError } = await supabase.rpc('exec_sql', {
      sql: `
        WITH unique_attendee_counts AS (
          SELECT 
            w.id as webinar_id,
            COUNT(DISTINCT COALESCE(p.email, p.participant_id, p.participant_user_id)) as unique_attendees
          FROM zoom_webinars w
          LEFT JOIN zoom_participants p ON p.webinar_id = w.id
          WHERE w.status = 'ended'
          GROUP BY w.id
        )
        UPDATE zoom_webinars w
        SET 
          total_attendees = COALESCE(uac.unique_attendees, 0),
          unique_participant_count = COALESCE(uac.unique_attendees, 0),
          total_absentees = GREATEST(0, w.total_registrants - COALESCE(uac.unique_attendees, 0)),
          updated_at = NOW()
        FROM unique_attendee_counts uac
        WHERE w.id = uac.webinar_id
          AND w.status = 'ended'
        RETURNING w.id, w.topic, w.total_attendees, w.unique_participant_count, w.total_registrants, w.total_absentees;
      `
    });

    if (updateError) {
      throw new Error(`Failed to update attendee counts: ${updateError.message}`);
    }

    const updatedCount = updateResult?.length || 0;
    console.log(`Updated ${updatedCount} webinars with correct unique attendee counts`);

    // Get some examples of the fixes
    const { data: examples, error: examplesError } = await supabase
      .from('zoom_webinars')
      .select('zoom_webinar_id, topic, total_attendees, unique_participant_count, total_registrants, total_absentees')
      .eq('status', 'ended')
      .gt('total_attendees', 0)
      .order('updated_at', { ascending: false })
      .limit(10);

    if (examplesError) {
      console.error('Error fetching examples:', examplesError);
    }

    const response = {
      success: true,
      message: `Successfully updated unique attendee counts for ${updatedCount} webinars`,
      analysis: analysis?.[0] || {},
      updatedWebinars: updatedCount,
      examples: examples || []
    };

    return new Response(JSON.stringify(response, null, 2), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    });

  } catch (error: any) {
    console.error('Error fixing unique attendees:', error);
    
    return new Response(JSON.stringify({
      success: false,
      error: error.message || 'An error occurred',
      details: error.stack
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
    });
  }
});
