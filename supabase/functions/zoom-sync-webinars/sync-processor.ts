
import { SyncOperation } from './types.ts';
import { makeZoomApiCall, retryApiCall } from './zoom-api.ts';
import { updateSyncLog, updateSyncStage, saveWebinarToDatabase } from './database-operations.ts';

const SYNC_TIMEOUT_MS = 45 * 60 * 1000;

export async function processSequentialSync(
  supabase: any, 
  operation: SyncOperation, 
  connection: any,
  syncLogId: string
): Promise<void> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), SYNC_TIMEOUT_MS);

  try {
    console.log(`Starting sequential background sync: ${operation.id}`);
    await updateSyncLog(supabase, syncLogId, { sync_status: 'in_progress' });

    let result;
    switch (operation.syncType) {
      case 'single':
        result = await syncSingleWebinar(supabase, operation, connection, controller.signal, syncLogId);
        break;
      case 'incremental':
        result = await syncIncrementalWebinars(supabase, operation, connection, controller.signal, syncLogId);
        break;
      case 'initial':
        result = await syncInitialWebinars(supabase, operation, connection, controller.signal, syncLogId);
        break;
      default:
        throw new Error(`Unknown sync type: ${operation.syncType}`);
    }
    
    await updateSyncLog(supabase, syncLogId, {
      sync_status: 'completed',
      completed_at: new Date().toISOString(),
      total_items: result.total,
      processed_items: result.processed,
      failed_items: result.failed,
      sync_stage: 'completed',
    });

    // Clean up sync progress
    await supabase.from('sync_progress').delete().eq('sync_id', syncLogId);

    await supabase.from('zoom_connections').update({ last_sync_at: new Date().toISOString() }).eq('id', operation.connectionId);
    console.log(`Sequential sync completed successfully: ${operation.id}`);

  } catch (error) {
    console.error(`Sequential sync failed: ${operation.id}`, error);
    await updateSyncLog(supabase, syncLogId, {
      sync_status: 'failed',
      completed_at: new Date().toISOString(),
      error_message: error instanceof Error ? error.message : 'Unknown error',
      error_details: { error: error instanceof Error ? error.stack : String(error) },
      sync_stage: 'failed',
    });

    // Clean up sync progress on failure
    await supabase.from('sync_progress').delete().eq('sync_id', syncLogId);
  } finally {
    clearTimeout(timeoutId);
  }
}

async function syncSingleWebinar(supabase: any, op: SyncOperation, conn: any, signal: AbortSignal, logId: string) {
  if (!op.webinarId) throw new Error('Webinar ID is required');
  
  // Initialize progress
  await createSyncProgress(supabase, logId, 1);
  
  await updateSyncStage(supabase, logId, op.webinarId, 'starting_webinar', 0);
  await updateSyncProgress(supabase, logId, 1, 0, 'Single webinar sync', 'starting_webinar');
  
  await processWebinar(supabase, op.webinarId, conn, logId, op.connectionId, signal);
  
  await updateSyncProgress(supabase, logId, 1, 1, 'Single webinar sync', 'completed');
  return { total: 1, processed: 1, failed: 0 };
}

async function syncIncrementalWebinars(supabase: any, op: SyncOperation, conn: any, signal: AbortSignal, logId: string) {
  await updateSyncStage(supabase, logId, null, 'fetching_recent_webinars', 5);
  const { webinars } = await makeZoomApiCall(conn, '/users/me/webinars?type=past&page_size=50');
  
  // Initialize progress
  await createSyncProgress(supabase, logId, webinars.length);
  
  return processWebinarList(supabase, webinars, conn, logId, op.connectionId, signal);
}

async function syncInitialWebinars(supabase: any, op: SyncOperation, conn: any, signal: AbortSignal, logId: string) {
  await updateSyncStage(supabase, logId, null, 'fetching_webinar_list', 5);
  const { webinars } = await makeZoomApiCall(conn, '/users/me/webinars?type=past&page_size=100');
  
  // Initialize progress
  await createSyncProgress(supabase, logId, webinars.length);
  
  return processWebinarList(supabase, webinars, conn, logId, op.connectionId, signal);
}

async function processWebinarList(supabase: any, list: any[], conn: any, logId: string, connId: string, signal: AbortSignal) {
  await updateSyncLog(supabase, logId, { total_items: list.length });
  let processed = 0, failed = 0;
  const failedWebinars: any[] = [];

  for (let i = 0; i < list.length; i++) {
    if (signal.aborted) throw new Error('Sync operation was cancelled');
    const webinar = list[i];
    
    try {
      // Update real-time progress
      await updateSyncProgress(
        supabase, 
        logId, 
        list.length, 
        i, 
        webinar.topic || `Webinar ${webinar.id}`, 
        'starting_webinar'
      );
      
      await processWebinar(supabase, webinar.id, conn, logId, connId, signal);
      processed++;
      
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
      console.error(`Failed to process webinar ${webinar.id}:`, error);
    }
    
    await updateSyncLog(supabase, logId, {
      processed_items: processed,
      failed_items: failed,
      stage_progress_percentage: Math.round(((i + 1) / list.length) * 100),
      error_details: failedWebinars.length > 0 ? { failed_webinars } : null,
    });
  }
  return { total: list.length, processed, failed };
}

async function processWebinar(supabase: any, webinarId: string, conn: any, logId: string, connId: string, signal: AbortSignal) {
  await updateSyncStage(supabase, logId, webinarId, 'webinar_details', 15);
  const webinarData = await retryApiCall(() => makeZoomApiCall(conn, `/webinars/${webinarId}`));
  
  await updateSyncProgress(supabase, logId, null, null, webinarData.topic, 'webinar_details');
  
  // Simplified for demo - in production would fetch all webinar data
  await updateSyncStage(supabase, logId, webinarId, 'saving_to_db', 95);
  await updateSyncProgress(supabase, logId, null, null, webinarData.topic, 'saving_to_db');
  
  await saveWebinarToDatabase(supabase, webinarData, connId);
  
  await updateSyncStage(supabase, logId, webinarId, 'webinar_completed', 100);
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
