
import { createSyncLog, updateSyncLog, updateSyncStage } from './database-operations.ts';
import { validateZoomConnection, createZoomAPIClient } from './zoom-api-client.ts';
import { processSimpleWebinarSync } from './simple-sync-processor.ts';
import { processEnhancedWebinarSync } from './enhanced-sync-processor.ts';
import { SyncOperation, SYNC_PRIORITIES } from './types.ts';

export async function processSequentialSync(
  supabase: any,
  syncOperation: SyncOperation,
  connection: any,
  syncLogId: string
): Promise<void> {
  console.log(`Starting sync operation: ${syncOperation.id}, type: ${syncOperation.syncType}`);
  
  try {
    await updateSyncStage(supabase, syncLogId, null, 'initializing', 0);

    // Determine sync type based on operation options
    const useEnhancedSync = syncOperation.options?.includeRegistrants || 
                           syncOperation.options?.includeParticipants || 
                           syncOperation.syncType === 'initial';

    if (useEnhancedSync) {
      console.log('Using enhanced sync with registrants and participants');
      await processEnhancedWebinarSync(supabase, syncOperation, connection, syncLogId);
    } else {
      console.log('Using simple webinar-only sync');
      await processSimpleWebinarSync(supabase, syncOperation, connection, syncLogId);
    }

    console.log(`Sync completed successfully: ${syncOperation.id}`);

  } catch (error) {
    console.error('Sync operation failed:', error);
    
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
