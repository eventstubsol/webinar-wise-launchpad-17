
import { updateSyncLog, updateSyncStage, saveWebinarToDatabase } from './database-operations.ts';
import { SyncOperation } from './types.ts';
import { processSimpleWebinarSync } from './simple-sync-processor.ts';

export async function processSequentialSync(
  supabase: any,
  syncOperation: SyncOperation,
  connection: any,
  syncLogId: string
): Promise<void> {
  console.log(`Starting sequential sync with enhanced verification for connection: ${connection.id}`);
  
  try {
    // Use the enhanced simple sync processor which now includes comprehensive verification
    await processSimpleWebinarSync(supabase, syncOperation, connection, syncLogId);
    
    console.log(`✅ Sequential sync with verification completed successfully`);
    
  } catch (error) {
    console.error('Sequential sync with verification failed:', error);
    
    await updateSyncLog(supabase, syncLogId, {
      sync_status: 'failed',
      error_message: error.message,
      completed_at: new Date().toISOString(),
      sync_stage: 'failed',
      stage_progress_percentage: 0
    });
    
    throw error;
  }
}
