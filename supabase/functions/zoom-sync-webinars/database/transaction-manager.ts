
/**
 * Database transaction manager with retry logic and validation
 */

export class TransactionManager {
  private supabase: any;

  constructor(supabase: any) {
    this.supabase = supabase;
  }

  /**
   * Execute operation with transaction safety and retry logic
   */
  async executeWithRetry<T>(
    operation: () => Promise<T>,
    operationName: string,
    maxRetries: number = 3
  ): Promise<T> {
    let lastError: any;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`🔄 TRANSACTION: Attempting ${operationName} (attempt ${attempt}/${maxRetries})`);
        
        const result = await operation();
        
        console.log(`✅ TRANSACTION: ${operationName} succeeded on attempt ${attempt}`);
        return result;
        
      } catch (error) {
        lastError = error;
        console.error(`❌ TRANSACTION: ${operationName} failed on attempt ${attempt}:`, error);
        
        if (attempt < maxRetries) {
          const delay = Math.pow(2, attempt) * 1000; // Exponential backoff
          console.log(`⏳ TRANSACTION: Retrying ${operationName} in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    throw new Error(`Transaction failed after ${maxRetries} attempts: ${lastError.message}`);
  }

  /**
   * Update sync log with transaction safety and validation
   */
  async updateSyncLogSafely(
    syncLogId: string, 
    updates: Record<string, any>,
    operationDescription: string
  ): Promise<void> {
    return this.executeWithRetry(async () => {
      console.log(`🔧 DB UPDATE: ${operationDescription} for sync ${syncLogId}`);
      console.log(`📝 DB UPDATE: Updates:`, JSON.stringify(updates, null, 2));
      
      // Perform the update
      const { data, error } = await this.supabase
        .from('zoom_sync_logs')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', syncLogId)
        .select('id, sync_status, completed_at, stage_progress_percentage');

      if (error) {
        console.error(`❌ DB UPDATE ERROR:`, error);
        throw new Error(`Database update failed: ${error.message}`);
      }

      if (!data || data.length === 0) {
        throw new Error(`No rows updated - sync log ${syncLogId} may not exist`);
      }

      // Validate the update was successful
      const updatedRecord = data[0];
      console.log(`✅ DB UPDATE SUCCESS: Record updated:`, updatedRecord);
      
      // Verify critical completion fields if this is a completion update
      if (updates.sync_status === 'completed') {
        if (!updatedRecord.completed_at) {
          throw new Error('Completion update failed - completed_at not set');
        }
        if (updatedRecord.stage_progress_percentage !== 100) {
          throw new Error('Completion update failed - progress not 100%');
        }
        console.log(`🎯 COMPLETION VERIFIED: Sync ${syncLogId} marked as completed successfully`);
      }

      return updatedRecord;
    }, `Update sync log - ${operationDescription}`);
  }

  /**
   * Force completion with direct SQL execution as emergency fallback
   */
  async forceCompletion(syncLogId: string): Promise<void> {
    console.log(`🚨 EMERGENCY COMPLETION: Force completing sync ${syncLogId}`);
    
    return this.executeWithRetry(async () => {
      const now = new Date().toISOString();
      
      const { data, error } = await this.supabase.rpc('force_sync_completion', {
        p_sync_log_id: syncLogId,
        p_completed_at: now
      });

      if (error) {
        // Fallback to direct update if RPC doesn't exist
        const { data: directData, error: directError } = await this.supabase
          .from('zoom_sync_logs')
          .update({
            sync_status: 'completed',
            completed_at: now,
            sync_stage: 'force_completed',
            stage_progress_percentage: 100,
            updated_at: now
          })
          .eq('id', syncLogId)
          .select('id');

        if (directError) {
          throw new Error(`Emergency completion failed: ${directError.message}`);
        }
        
        if (!directData || directData.length === 0) {
          throw new Error('Emergency completion failed - no rows updated');
        }
      }
      
      console.log(`✅ EMERGENCY COMPLETION: Sync ${syncLogId} force completed`);
    }, 'Emergency force completion');
  }
}
