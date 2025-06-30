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

    console.log('=== RESYNCING LOW ATTENDEE WEBINARS ===');
    
    // Find webinars with suspiciously low attendee counts
    const { data: webinars, error: webinarsError } = await supabase
      .from('zoom_webinars')
      .select('id, zoom_webinar_id, topic, total_registrants, total_attendees, connection_id')
      .eq('status', 'ended')
      .gt('total_registrants', 100) // High registration
      .lt('total_attendees', 10)    // But very low attendees
      .order('total_registrants', { ascending: false })
      .limit(50);

    if (webinarsError) {
      throw new Error(`Failed to fetch webinars: ${webinarsError.message}`);
    }

    console.log(`Found ${webinars?.length || 0} webinars with suspiciously low attendee counts`);

    const results = [];
    let successCount = 0;
    let failureCount = 0;

    // Process each webinar
    for (const webinar of webinars || []) {
      try {
        console.log(`\nProcessing: ${webinar.topic}`);
        console.log(`Registrants: ${webinar.total_registrants}, Current attendees: ${webinar.total_attendees}`);

        // Call the sync-webinar-attendees function
        const response = await fetch(`${supabaseUrl}/functions/v1/sync-webinar-attendees`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${supabaseServiceKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            webinarId: webinar.zoom_webinar_id,
            connectionId: webinar.connection_id,
            forceSync: true
          })
        });

        if (response.ok) {
          const result = await response.json();
          console.log(`✓ Success: ${result.details?.uniqueAttendees || 0} unique attendees found`);
          successCount++;
          results.push({
            webinarId: webinar.zoom_webinar_id,
            topic: webinar.topic,
            success: true,
            oldAttendees: webinar.total_attendees,
            newAttendees: result.details?.uniqueAttendees || 0,
            registrants: webinar.total_registrants
          });
        } else {
          const error = await response.text();
          console.error(`✗ Failed: ${error}`);
          failureCount++;
          results.push({
            webinarId: webinar.zoom_webinar_id,
            topic: webinar.topic,
            success: false,
            error: error
          });
        }

        // Add a small delay to avoid rate limits
        await new Promise(resolve => setTimeout(resolve, 1000));

      } catch (error) {
        console.error(`Error processing webinar ${webinar.zoom_webinar_id}:`, error);
        failureCount++;
        results.push({
          webinarId: webinar.zoom_webinar_id,
          topic: webinar.topic,
          success: false,
          error: error.message
        });
      }
    }

    // Generate summary
    const summary = {
      totalProcessed: results.length,
      successful: successCount,
      failed: failureCount,
      significantlyIncreased: results.filter(r => r.success && r.newAttendees > r.oldAttendees * 10).length,
      results: results
    };

    console.log('\n=== RESYNC COMPLETED ===');
    console.log(`Total processed: ${summary.totalProcessed}`);
    console.log(`Successful: ${summary.successful}`);
    console.log(`Failed: ${summary.failed}`);
    console.log(`Significantly increased: ${summary.significantlyIncreased}`);

    return new Response(JSON.stringify(summary, null, 2), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    });

  } catch (error: any) {
    console.error('Error in resync process:', error);
    
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
