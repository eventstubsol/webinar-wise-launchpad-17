
import { updateSyncLog, updateSyncStage } from './database-operations.ts';
import { SyncOperation } from './types.ts';
import { processSimpleWebinarSync } from './simple-sync-processor.ts';

export async function processEnhancedWebinarSync(
  supabase: any,
  syncOperation: SyncOperation,
  connection: any,
  syncLogId: string
): Promise<void> {
  console.log(`Starting enhanced sync processor for operation: ${syncOperation.syncType}`);
  
  try {
    // FIXED: Handle manual syncs with webinarIds as participants-only syncs
    const isParticipantsOnly = syncOperation.syncType === 'manual' && 
                              syncOperation.webinarIds && 
                              syncOperation.webinarIds.length > 0;
    
    if (isParticipantsOnly) {
      console.log(`🔄 Processing manual sync as participants-only for ${syncOperation.webinarIds.length} webinars`);
      
      await updateSyncStage(supabase, syncLogId, 'participants_sync', 0);
      
      // Use the enhanced simple sync processor with participant-only logic
      await processSimpleWebinarSync(supabase, syncOperation, connection, syncLogId);
    } else {
      // Use standard sync processing
      await processSimpleWebinarSync(supabase, syncOperation, connection, syncLogId);
    }
    
    console.log(`✅ Enhanced sync completed successfully`);
    
  } catch (error) {
    console.error('Enhanced sync failed:', error);
    
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
