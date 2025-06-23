
/**
 * Enhanced database operations with bulletproof completion
 */

// Export all existing operations for backward compatibility
export * from './sync-log-operations.ts';
export * from './webinar-operations.ts';

// Export new bulletproof operations
export { TransactionManager } from './transaction-manager.ts';
export { BulletproofSyncOperations } from './bulletproof-sync-operations.ts';

// Enhanced sync log operations with transaction safety
export async function updateSyncLogEnhanced(
  supabase: any, 
  syncLogId: string, 
  updates: Record<string, any>
): Promise<void> {
  const { TransactionManager } = await import('./transaction-manager.ts');
  const transactionManager = new TransactionManager(supabase);
  
  await transactionManager.updateSyncLogSafely(
    syncLogId,
    updates,
    'Enhanced sync log update'
  );
}

export async function updateSyncStageEnhanced(
  supabase: any, 
  syncLogId: string, 
  webinarId: string | null, 
  stage: string, 
  progress: number
): Promise<void> {
  const { TransactionManager } = await import('./transaction-manager.ts');
  const transactionManager = new TransactionManager(supabase);
  
  await transactionManager.updateSyncLogSafely(
    syncLogId,
    {
      current_webinar_id: webinarId,
      sync_stage: stage,
      stage_progress_percentage: Math.max(0, Math.min(100, progress))
    },
    `Stage update: ${stage} (${progress}%)`
  );
  
  console.log(`Enhanced Sync ${syncLogId}: ${stage} (${progress}%) - Webinar: ${webinarId || 'N/A'}`);
}

// Basic sync stage update function for backward compatibility
export async function updateSyncStage(
  supabase: any, 
  syncLogId: string, 
  webinarId: string | null, 
  stage: string, 
  progress: number
): Promise<void> {
  try {
    const { error } = await supabase
      .from('zoom_sync_logs')
      .update({
        current_webinar_id: webinarId,
        sync_stage: stage,
        stage_progress_percentage: Math.max(0, Math.min(100, progress)),
        updated_at: new Date().toISOString()
      })
      .eq('id', syncLogId);

    if (error) {
      console.error('Failed to update sync stage:', error);
      throw new Error(`Failed to update sync stage: ${error.message}`);
    }

    console.log(`Sync ${syncLogId}: ${stage} (${progress}%) - Webinar: ${webinarId || 'N/A'}`);
  } catch (error) {
    console.error('Error updating sync stage:', error);
    throw error;
  }
}
