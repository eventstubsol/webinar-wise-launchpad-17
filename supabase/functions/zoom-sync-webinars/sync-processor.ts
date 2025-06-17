
import { createSyncLog, updateSyncLog, updateSyncStage } from './database-operations.ts';
import { validateZoomConnection, createZoomAPIClient } from './zoom-api-client.ts';
import { processSimpleWebinarSync } from './simple-sync-processor.ts';
import { SyncOperation, SYNC_PRIORITIES } from './types.ts';

export async function processSequentialSync(
  supabase: any,
  syncOperation: SyncOperation,
  connection: any,
  syncLogId: string
): Promise<void> {
  console.log(`Starting simple webinar sync operation: ${syncOperation.id}`);
  
  try {
    await updateSyncStage(supabase, syncLogId, null, 'initializing', 0);

    // Use the simplified webinar-only sync processor
    await processSimpleWebinarSync(supabase, syncOperation, connection, syncLogId);

    console.log(`Simple webinar sync completed successfully: ${syncOperation.id}`);

  } catch (error) {
    console.error('Simple webinar sync operation failed:', error);
    
    const isAuthError = !!error.isAuthError;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    await updateSyncLog(supabase, syncLogId, {
      sync_status: 'failed',
      error_message: errorMessage,
      error_details: { isAuthError },
      completed_at: new Date().toISOString(),
      sync_stage: 'failed',
      stage_progress_percentage: 0
    });
  }
}
