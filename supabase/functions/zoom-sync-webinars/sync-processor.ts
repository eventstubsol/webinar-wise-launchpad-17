
import { updateSyncLog, updateSyncStage, saveWebinarToDatabase } from './database-operations.ts';
import { SyncOperation } from './types.ts';

export async function processSequentialSync(
  supabase: any,
  operation: SyncOperation,
  connection: any,
  syncLogId: string
): Promise<void> {
  console.log(`Starting sequential sync for operation: ${operation.syncType}`);
  
  try {
    // Set up cleanup on function shutdown
    const cleanup = async () => {
      console.log('Function shutting down, cleaning up sync...');
      await updateSyncLog(supabase, syncLogId, {
        sync_status: 'failed',
        completed_at: new Date().toISOString(),
        error_message: 'Sync interrupted by function shutdown'
      });
    };

    // Listen for shutdown events
    addEventListener('beforeunload', cleanup);
    
    // Set a maximum execution time (25 minutes for edge functions)
    const maxExecutionTime = 25 * 60 * 1000; // 25 minutes
    const startTime = Date.now();
    
    // Update sync status to in_progress
    await updateSyncLog(supabase, syncLogId, {
      sync_status: 'in_progress',
      total_items: 0,
      processed_items: 0
    });

    // Mock Zoom API calls for now (replace with actual implementation)
    console.log('Simulating Zoom API calls...');
    
    let processedCount = 0;
    const totalItems = operation.syncType === 'initial' ? 10 : 5; // Mock counts
    
    await updateSyncLog(supabase, syncLogId, {
      total_items: totalItems
    });

    for (let i = 0; i < totalItems; i++) {
      // Check if we're approaching timeout
      if (Date.now() - startTime > maxExecutionTime - 60000) { // Stop 1 minute before timeout
        throw new Error('Approaching execution timeout, stopping sync');
      }

      await updateSyncStage(supabase, syncLogId, `mock-webinar-${i}`, 'processing_webinar', 
        Math.round(((i + 1) / totalItems) * 100));
      
      // Simulate processing time
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      processedCount++;
      await updateSyncLog(supabase, syncLogId, {
        processed_items: processedCount
      });
      
      console.log(`Processed ${processedCount}/${totalItems} items`);
    }

    // Complete the sync
    await updateSyncLog(supabase, syncLogId, {
      sync_status: 'completed',
      completed_at: new Date().toISOString(),
      processed_items: processedCount,
      sync_stage: 'completed',
      stage_progress_percentage: 100
    });

    // Update connection last sync time
    await supabase
      .from('zoom_connections')
      .update({
        last_sync_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', operation.connectionId);

    console.log('Sequential sync completed successfully');
    
    // Remove event listener
    removeEventListener('beforeunload', cleanup);
    
  } catch (error) {
    console.error('Sequential sync failed:', error);
    
    await updateSyncLog(supabase, syncLogId, {
      sync_status: 'failed',
      completed_at: new Date().toISOString(),
      error_message: error instanceof Error ? error.message : 'Unknown error occurred',
      sync_stage: 'failed'
    });
    
    throw error;
  }
}
