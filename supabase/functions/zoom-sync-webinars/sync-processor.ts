
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
  } finally {
    clearTimeout(timeoutId);
  }
}

async function syncSingleWebinar(supabase: any, op: SyncOperation, conn: any, signal: AbortSignal, logId: string) {
  if (!op.webinarId) throw new Error('Webinar ID is required');
  await updateSyncStage(supabase, logId, op.webinarId, 'starting_webinar', 0);
  await processWebinar(supabase, op.webinarId, conn, logId, op.connectionId, signal);
  return { total: 1, processed: 1, failed: 0 };
}

async function syncIncrementalWebinars(supabase: any, op: SyncOperation, conn: any, signal: AbortSignal, logId: string) {
  await updateSyncStage(supabase, logId, null, 'fetching_recent_webinars', 5);
  const { webinars } = await makeZoomApiCall(conn, '/users/me/webinars?type=past&page_size=50');
  return processWebinarList(supabase, webinars, conn, logId, op.connectionId, signal);
}

async function syncInitialWebinars(supabase: any, op: SyncOperation, conn: any, signal: AbortSignal, logId: string) {
  await updateSyncStage(supabase, logId, null, 'fetching_webinar_list', 5);
  const { webinars } = await makeZoomApiCall(conn, '/users/me/webinars?type=past&page_size=100');
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
      await processWebinar(supabase, webinar.id, conn, logId, connId, signal);
      processed++;
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
  // Simplified for refactoring demo. In a real scenario, fetch registrants, participants, etc.
  
  await updateSyncStage(supabase, logId, webinarId, 'saving_to_db', 95);
  await saveWebinarToDatabase(supabase, webinarData, connId);
  
  await updateSyncStage(supabase, logId, webinarId, 'webinar_completed', 100);
}
