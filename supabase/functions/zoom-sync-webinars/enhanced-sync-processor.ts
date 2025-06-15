// Enhanced sync processor with comprehensive monitoring integration

import { SyncOperation } from './types.ts';
import { makeZoomApiCall, retryApiCall } from './zoom-api.ts';
import { updateSyncLog, updateSyncStage, saveWebinarToDatabase } from './database-operations.ts';

const SYNC_TIMEOUT_MS = 45 * 60 * 1000;

export async function processSequentialSyncWithMonitoring(
  supabase: any, 
  operation: SyncOperation, 
  connection: any,
  syncLogId: string
): Promise<void> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), SYNC_TIMEOUT_MS);
  const startTime = Date.now();

  try {
    console.log(`Starting enhanced sequential sync: ${operation.id}`);
    await updateSyncLog(supabase, syncLogId, { sync_status: 'in_progress' });

    // Initialize performance tracking
    await recordPerformanceMetric(supabase, syncLogId, 'sync_started', 1, 'count');

    // Get webinars to sync
    let webinars = [];
    switch (operation.syncType) {
      case 'single':
        if (operation.webinarId) {
          const webinarData = await makeZoomApiCall(connection, `/webinars/${operation.webinarId}`);
          webinars = [webinarData];
        }
        break;
      case 'incremental':
        const { webinars: recentWebinars } = await makeZoomApiCall(connection, '/users/me/webinars?type=past&page_size=50');
        webinars = recentWebinars;
        break;
      case 'initial':
        const { webinars: allWebinars } = await makeZoomApiCall(connection, '/users/me/webinars?type=past&page_size=100');
        webinars = allWebinars;
        break;
    }

    // Initialize sync queue
    await initializeSyncQueue(supabase, syncLogId, webinars);

    // Initialize sync progress tracking
    await createSyncProgress(supabase, syncLogId, webinars.length);

    // Track API calls
    let apiCallsMade = 1; // Initial webinar list call
    let rateLimitHits = 0;

    const result = await processWebinarListWithMonitoring(
      supabase, 
      webinars, 
      connection, 
      syncLogId, 
      operation.connectionId, 
      controller.signal,
      { apiCallsMade, rateLimitHits }
    );

    const endTime = Date.now();
    const durationSeconds = Math.round((endTime - startTime) / 1000);

    // Record final performance metrics
    await recordPerformanceMetric(supabase, syncLogId, 'sync_duration', durationSeconds, 'seconds');
    await recordPerformanceMetric(supabase, syncLogId, 'api_calls_made', result.apiCallsMade, 'count');
    await recordPerformanceMetric(supabase, syncLogId, 'rate_limit_hits', result.rateLimitHits, 'count');
    await recordPerformanceMetric(supabase, syncLogId, 'data_volume_bytes', result.dataVolume || 0, 'bytes');
    await recordPerformanceMetric(supabase, syncLogId, 'success_rate', ((result.processed - result.failed) / result.total) * 100, 'percentage');

    // Update rate limit tracking
    await updateRateLimitTracking(supabase, operation.connectionId, operation.userId, result.apiCallsMade);

    await updateSyncLog(supabase, syncLogId, {
      sync_status: 'completed',
      completed_at: new Date().toISOString(),
      duration_seconds: durationSeconds,
      total_items: result.total,
      processed_items: result.processed,
      failed_items: result.failed,
      api_calls_made: result.apiCallsMade,
      rate_limit_hits: result.rateLimitHits,
      sync_stage: 'completed',
    });

    // Clean up sync progress and queue
    await supabase.from('sync_progress').delete().eq('sync_id', syncLogId);
    await supabase.from('sync_queue').update({ status: 'completed' }).eq('sync_id', syncLogId);

    await supabase.from('zoom_connections').update({ last_sync_at: new Date().toISOString() }).eq('id', operation.connectionId);
    console.log(`Enhanced sequential sync completed: ${operation.id}`);

  } catch (error) {
    console.error(`Enhanced sequential sync failed: ${operation.id}`, error);
    
    const endTime = Date.now();
    const durationSeconds = Math.round((endTime - startTime) / 1000);

    // Record failure metrics
    await recordPerformanceMetric(supabase, syncLogId, 'sync_duration', durationSeconds, 'seconds');
    await recordPerformanceMetric(supabase, syncLogId, 'sync_failed', 1, 'count');

    await updateSyncLog(supabase, syncLogId, {
      sync_status: 'failed',
      completed_at: new Date().toISOString(),
      duration_seconds: durationSeconds,
      error_message: error instanceof Error ? error.message : 'Unknown error',
      error_details: { error: error instanceof Error ? error.stack : String(error) },
      sync_stage: 'failed',
    });

    // Clean up sync progress and mark queue items as failed
    await supabase.from('sync_progress').delete().eq('sync_id', syncLogId);
    await supabase.from('sync_queue').update({ 
      status: 'failed', 
      error_message: error instanceof Error ? error.message : 'Unknown error'
    }).eq('sync_id', syncLogId);
  } finally {
    clearTimeout(timeoutId);
  }
}

async function initializeSyncQueue(supabase: any, syncLogId: string, webinars: any[]): Promise<void> {
  const queueItems = webinars.map((webinar, index) => ({
    sync_id: syncLogId,
    webinar_id: webinar.id.toString(),
    webinar_title: webinar.topic,
    queue_position: index + 1,
    status: 'pending',
    estimated_duration_seconds: 120, // 2 minutes per webinar estimate
  }));

  await supabase.from('sync_queue').insert(queueItems);
}

async function processWebinarListWithMonitoring(
  supabase: any, 
  list: any[], 
  conn: any, 
  logId: string, 
  connId: string, 
  signal: AbortSignal,
  counters: { apiCallsMade: number; rateLimitHits: number }
) {
  await updateSyncLog(supabase, logId, { total_items: list.length });
  let processed = 0, failed = 0, dataVolume = 0;
  const failedWebinars: any[] = [];

  for (let i = 0; i < list.length; i++) {
    if (signal.aborted) throw new Error('Sync operation was cancelled');
    const webinar = list[i];
    
    try {
      // Update queue status
      await supabase.from('sync_queue')
        .update({ 
          status: 'processing', 
          started_at: new Date().toISOString() 
        })
        .eq('sync_id', logId)
        .eq('webinar_id', webinar.id.toString());

      // Update real-time progress
      await updateSyncProgress(
        supabase, 
        logId, 
        list.length, 
        i, 
        webinar.topic || `Webinar ${webinar.id}`, 
        'starting_webinar'
      );
      
      const webinarResult = await processWebinarWithMonitoring(
        supabase, 
        webinar.id, 
        conn, 
        logId, 
        connId, 
        signal,
        counters
      );
      
      processed++;
      dataVolume += webinarResult.dataSize || 0;
      
      // Update queue completion
      await supabase.from('sync_queue')
        .update({ 
          status: 'completed', 
          completed_at: new Date().toISOString() 
        })
        .eq('sync_id', logId)
        .eq('webinar_id', webinar.id.toString());
      
      // Update completion progress
      await updateSyncProgress(
        supabase, 
        logId, 
        list.length, 
        processed, 
        webinar.topic || `Webinar ${webinar.id}`, 
        'webinar_completed'
      );
      
    } catch (error) {
      failed++;
      failedWebinars.push({ id: webinar.id, error: error.message });
      
      // Update queue failure
      await supabase.from('sync_queue')
        .update({ 
          status: 'failed', 
          completed_at: new Date().toISOString(),
          error_message: error instanceof Error ? error.message : 'Unknown error'
        })
        .eq('sync_id', logId)
        .eq('webinar_id', webinar.id.toString());

      console.error(`Failed to process webinar ${webinar.id}:`, error);
    }
    
    await updateSyncLog(supabase, logId, {
      processed_items: processed,
      failed_items: failed,
      stage_progress_percentage: Math.round(((i + 1) / list.length) * 100),
      error_details: failedWebinars.length > 0 ? { failed_webinars: failedWebinars } : null,
    });
  }
  
  return { 
    total: list.length, 
    processed, 
    failed, 
    apiCallsMade: counters.apiCallsMade,
    rateLimitHits: counters.rateLimitHits,
    dataVolume
  };
}

async function processWebinarWithMonitoring(
  supabase: any, 
  webinarId: string, 
  conn: any, 
  logId: string, 
  connId: string, 
  signal: AbortSignal,
  counters: { apiCallsMade: number; rateLimitHits: number }
) {
  const webinarStartTime = Date.now();
  
  await updateSyncStage(supabase, logId, webinarId, 'webinar_details', 15);
  
  try {
    const webinarData = await retryApiCall(() => makeZoomApiCall(conn, `/webinars/${webinarId}`));
    counters.apiCallsMade++;
    
    await updateSyncProgress(supabase, logId, null, null, webinarData.topic, 'webinar_details');
    
    // Simulate data processing and size calculation
    const dataSize = JSON.stringify(webinarData).length;
    
    await updateSyncStage(supabase, logId, webinarId, 'saving_to_db', 95);
    await updateSyncProgress(supabase, logId, null, null, webinarData.topic, 'saving_to_db');
    
    await saveWebinarToDatabase(supabase, webinarData, connId);
    
    await updateSyncStage(supabase, logId, webinarId, 'webinar_completed', 100);
    
    const webinarDuration = Date.now() - webinarStartTime;
    await recordPerformanceMetric(supabase, logId, 'webinar_sync_time', Math.round(webinarDuration / 1000), 'seconds', {
      webinar_id: webinarId,
      webinar_title: webinarData.topic
    });
    
    return { dataSize };
  } catch (error) {
    if (error.message?.includes('rate limit')) {
      counters.rateLimitHits++;
    }
    throw error;
  }
}

async function recordPerformanceMetric(
  supabase: any, 
  syncId: string, 
  metricName: string, 
  metricValue: number, 
  metricUnit: string,
  metadata: any = {}
): Promise<void> {
  try {
    await supabase.from('sync_performance_metrics').insert({
      sync_id: syncId,
      metric_name: metricName,
      metric_value: metricValue,
      metric_unit: metricUnit,
      metadata
    });
  } catch (error) {
    console.error('Failed to record performance metric:', error);
  }
}

async function updateRateLimitTracking(
  supabase: any, 
  connectionId: string, 
  userId: string, 
  apiCallsMade: number
): Promise<void> {
  try {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);

    await supabase.from('rate_limit_tracking').upsert({
      user_id: userId,
      connection_id: connectionId,
      api_calls_made: apiCallsMade,
      api_calls_limit: 100, // Default Zoom daily limit
      reset_time: tomorrow.toISOString(),
      warning_threshold: 80
    }, {
      onConflict: 'user_id,connection_id',
      updateColumns: ['api_calls_made', 'updated_at']
    });
  } catch (error) {
    console.error('Failed to update rate limit tracking:', error);
  }
}

async function createSyncProgress(supabase: any, syncId: string, totalWebinars: number) {
  const estimatedCompletion = new Date(Date.now() + (totalWebinars * 2 * 60 * 1000)).toISOString();
  
  await supabase.from('sync_progress').insert({
    sync_id: syncId,
    total_webinars: totalWebinars,
    completed_webinars: 0,
    current_webinar_index: 0,
    current_stage: 'Initializing sync...',
    estimated_completion: estimatedCompletion
  });
}

async function updateSyncProgress(
  supabase: any, 
  syncId: string, 
  totalWebinars: number | null, 
  completedWebinars: number | null, 
  webinarName: string | null, 
  stage: string
) {
  const updateData: any = {
    current_stage: stage,
    updated_at: new Date().toISOString()
  };
  
  if (totalWebinars !== null) updateData.total_webinars = totalWebinars;
  if (completedWebinars !== null) {
    updateData.completed_webinars = completedWebinars;
    updateData.current_webinar_index = completedWebinars + 1;
  }
  if (webinarName) updateData.current_webinar_name = webinarName;
  
  // Recalculate estimated completion if we have progress
  if (totalWebinars && completedWebinars !== null) {
    const remaining = totalWebinars - completedWebinars;
    if (remaining > 0) {
      const estimatedCompletion = new Date(Date.now() + (remaining * 2 * 60 * 1000)).toISOString();
      updateData.estimated_completion = estimatedCompletion;
    }
  }
  
  await supabase.from('sync_progress')
    .update(updateData)
    .eq('sync_id', syncId);
}
