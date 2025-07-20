
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { syncId } = await req.json();

    if (!syncId) {
      return new Response(
        JSON.stringify({ success: false, error: 'syncId is required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Get sync progress
    const { data: syncLog, error } = await supabase
      .from('zoom_sync_logs')
      .select('*')
      .eq('id', syncId)
      .single();

    if (error || !syncLog) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Sync log not found' 
        }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const progressPercentage = syncLog.total_items > 0 
      ? Math.round((syncLog.processed_items / syncLog.total_items) * 100)
      : 0;

    const response = {
      success: true,
      status: syncLog.sync_status,
      progress: {
        percentage: progressPercentage,
        processed: syncLog.processed_items || 0,
        total: syncLog.total_items || 0,
        currentWebinar: `Processing webinar ${syncLog.processed_items || 0} of ${syncLog.total_items || 0}`
      },
      error_message: syncLog.error_message,
      started_at: syncLog.started_at,
      completed_at: syncLog.completed_at
    };

    return new Response(
      JSON.stringify(response),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('[ZOOM-SYNC-PROGRESS] Unexpected error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
