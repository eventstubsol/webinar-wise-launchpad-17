
import { ZoomWebinarDataService } from '../../api/ZoomWebinarDataService';
import { ZoomConnectionService } from '../../ZoomConnectionService';
import { SyncOperation } from '../types';
import { EnhancedSyncProgressTracker } from '../EnhancedSyncProgressTracker';
import { processWebinarSequentially } from './WebinarSyncProcessor';

/**
 * Execute initial sync with sequential processing and extended 90-day range
 */
export async function executeInitialSync(
  operation: SyncOperation,
  syncLogId: string,
  progressTracker: EnhancedSyncProgressTracker,
  signal: AbortSignal
): Promise<void> {
  await progressTracker.updateSyncStage(syncLogId, null, 'fetching_webinar_list', 5);
    
  // Use extended range method for comprehensive sync (90 days past + 90 days future)
  const webinars = await ZoomWebinarDataService.listWebinarsWithExtendedRange(
    operation.connectionId,
    { 
      dayRange: 90,
      pageSize: 100 
    },
    (progress) => {
      // Update progress for webinar fetching phase
      progressTracker.updateProgress(syncLogId, {
        total: progress.total,
        processed: progress.processed,
        failed: progress.failed,
        current: progress.current
      });
    }
  );

  if (signal.aborted) throw new Error('Sync cancelled');

  await progressTracker.updateSyncLog(syncLogId, {
    total_items: webinars.length
  });

  let processedCount = 0;
  let failedCount = 0;
  const failedWebinars: Array<{ id: string; error: string }> = [];

  for (let i = 0; i < webinars.length; i++) {
    const webinar = webinars[i];
    
    if (signal.aborted) throw new Error('Sync cancelled');

    try {
      await progressTracker.updateSyncStage(syncLogId, webinar.id, 'starting_webinar', 0);
      await processWebinarSequentially(webinar.id, syncLogId, operation.connectionId, progressTracker);
      processedCount++;
      
      const overallProgress = Math.round(((i + 1) / webinars.length) * 100);
      await progressTracker.updateProgress(syncLogId, {
        total: webinars.length,
        processed: processedCount,
        failed: failedCount,
        current: `Completed: ${webinar.topic}`,
        overallProgress
      });
    } catch (error) {
      failedCount++;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      failedWebinars.push({ id: webinar.id, error: errorMessage });
      
      console.error(`Failed to sync webinar ${webinar.id}:`, error);
      
      await progressTracker.logWebinarCompletion(syncLogId, webinar.id, false, errorMessage);
      await progressTracker.updateProgress(syncLogId, {
        total: webinars.length,
        processed: processedCount,
        failed: failedCount,
        current: `Failed: ${webinar.topic} - ${errorMessage}`
      });
    }
  }

  await progressTracker.updateSyncLog(syncLogId, {
    processed_items: processedCount,
    failed_items: failedCount,
    error_details: failedWebinars.length > 0 ? { 
      error_message: `${failedWebinars.length} webinars failed to sync`,
      error_code: 'PARTIAL_SYNC_FAILURE',
      retry_count: 0,
      last_retry_at: new Date().toISOString(),
      failed_webinars: failedWebinars 
    } : null
  });
}

/**
 * Execute incremental sync with extended range for recent changes
 */
export async function executeIncrementalSync(
  operation: SyncOperation,
  syncLogId: string,
  progressTracker: EnhancedSyncProgressTracker,
  signal: AbortSignal
): Promise<void> {
  // Get user connections to find the specific connection
  const connections = await ZoomConnectionService.getUserConnections('user-id-placeholder');
  const connection = connections.find(c => c.id === operation.connectionId);
  
  const lastSyncDate = connection?.last_sync_at ? 
    new Date(connection.last_sync_at) : 
    new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  await progressTracker.updateSyncStage(syncLogId, null, 'fetching_recent_webinars', 5);
  
  // For incremental sync, use extended range to catch any changes in the past 30 days
  // and upcoming 30 days from last sync
  const dayRange = 30;
  const fromDate = new Date(Math.min(lastSyncDate.getTime(), Date.now() - (dayRange * 24 * 60 * 60 * 1000)));
  const toDate = new Date(Date.now() + (dayRange * 24 * 60 * 60 * 1000));

  const webinars = await ZoomWebinarDataService.listWebinarsWithExtendedRange(
    operation.connectionId,
    { 
      dayRange: dayRange,
      pageSize: 50 
    }
  );

  if (signal.aborted) throw new Error('Sync cancelled');

  await progressTracker.updateSyncLog(syncLogId, {
    total_items: webinars.length
  });

  let processedCount = 0;
  let failedCount = 0;

  for (let i = 0; i < webinars.length; i++) {
    const webinar = webinars[i];
    
    if (signal.aborted) throw new Error('Sync cancelled');

    try {
      await progressTracker.updateSyncStage(syncLogId, webinar.id, 'starting_webinar', 0);
      await processWebinarSequentially(webinar.id, syncLogId, operation.connectionId, progressTracker);
      processedCount++;
      
      const overallProgress = Math.round(((i + 1) / webinars.length) * 100);
      await progressTracker.updateProgress(syncLogId, {
        total: webinars.length,
        processed: processedCount,
        failed: failedCount,
        current: `Updated: ${webinar.topic}`,
        overallProgress
      });
    } catch (error) {
      failedCount++;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      await progressTracker.logWebinarCompletion(syncLogId, webinar.id, false, errorMessage);
      console.error(`Failed to sync webinar ${webinar.id}:`, error);
    }
  }

  await ZoomConnectionService.updateConnection(operation.connectionId, {
    last_sync_at: new Date().toISOString()
  });

  await progressTracker.updateSyncLog(syncLogId, {
    processed_items: processedCount,
    failed_items: failedCount
  });
}

/**
 * Execute single webinar sync
 */
export async function executeSingleWebinarSync(
  operation: SyncOperation,
  syncLogId: string,
  progressTracker: EnhancedSyncProgressTracker,
  signal: AbortSignal
): Promise<void> {
  const webinarId = operation.options?.webinarId!;

  await progressTracker.updateSyncLog(syncLogId, {
    total_items: 1,
    resource_id: webinarId
  });

  if (signal.aborted) throw new Error('Sync cancelled');

  try {
    await processWebinarSequentially(webinarId, syncLogId, operation.connectionId, progressTracker);

    await progressTracker.updateProgress(syncLogId, {
      total: 1,
      processed: 1,
      failed: 0,
      current: 'Webinar sync completed'
    });
  } catch (error) {
    await progressTracker.updateProgress(syncLogId, {
      total: 1,
      processed: 0,
      failed: 1,
      current: `Failed to sync webinar: ${error instanceof Error ? error.message : 'Unknown error'}`
    });
    throw error;
  }
}
