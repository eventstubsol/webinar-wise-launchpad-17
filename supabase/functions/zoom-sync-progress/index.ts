import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders } from "./cors.ts";

interface ProgressRequest {
  syncId: string;
}

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
    const { syncId } = await req.json() as ProgressRequest;

    // Get sync log details
    const { data: syncLog, error: syncError } = await supabase
      .from('zoom_sync_logs')
      .select('*')
      .eq('id', syncId)
      .single();

    if (syncError || !syncLog) {
      throw new Error('Sync not found');
    }

    // Get recent progress updates
    const { data: progressUpdates } = await supabase
      .from('sync_progress_updates')
      .select('*')
      .eq('sync_id', syncId)
      .order('created_at', { ascending: false })
      .limit(50);

    // Get queue status
    const { data: queueStats } = await supabase
      .from('webinar_sync_queue')
      .select('processing_status')
      .eq('sync_id', syncId);

    const processedCount = queueStats?.filter(q => q.processing_status === 'completed').length || 0;
    const failedCount = queueStats?.filter(q => q.processing_status === 'failed').length || 0;
    const pendingCount = queueStats?.filter(q => q.processing_status === 'pending').length || 0;
    const totalCount = queueStats?.length || 0;

    // Calculate estimated time remaining
    let estimatedTimeRemaining = 0;
    if (syncLog.started_at && processedCount > 0 && pendingCount > 0) {
      const elapsedSeconds = (Date.now() - new Date(syncLog.started_at).getTime()) / 1000;
      const averageTimePerWebinar = elapsedSeconds / processedCount;
      estimatedTimeRemaining = Math.round(averageTimePerWebinar * pendingCount);
    }

    // Get current webinar being processed
    let currentWebinar = '';
    const lastWebinarUpdate = progressUpdates?.find(u => u.update_type === 'webinar');
    if (lastWebinarUpdate) {
      currentWebinar = lastWebinarUpdate.message;
    }

    // Determine current status
    let status = syncLog.status;
    if (status === 'running' && syncLog.progress_percentage >= 100) {
      status = 'completed';
    }

    const response = {
      status,
      progress: {
        percentage: syncLog.progress_percentage || 0,
        currentWebinar,
        processedCount,
        failedCount,
        pendingCount,
        totalCount,
        estimatedTimeRemaining
      },
      messages: progressUpdates?.map(u => ({
        type: u.update_type,
        message: u.message,
        timestamp: u.created_at
      })) || []
    };

    return new Response(
      JSON.stringify(response),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error: any) {
    console.error('Progress fetch error:', error);
    
    return new Response(
      JSON.stringify({
        error: error.message || 'An error occurred while fetching progress'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});
