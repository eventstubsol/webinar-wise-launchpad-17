// Fix for sync tracking issue - webinars_synced not being updated
// This file contains the patches needed to properly track sync progress

export const SYNC_TRACKING_FIX = `
## Issue: Sync logs show webinars_synced as 0 even though webinars are being synced

### Root Cause:
The EnhancedSyncProgressTracker is updating 'processed_items' but not 'webinars_synced' field.

### Solution:
Update the EnhancedSyncProgressTracker to also update the webinars_synced field.

### Files to modify:
1. src/services/zoom/sync/EnhancedSyncProgressTracker.ts
   - Update the updateProgress method to also update webinars_synced
   - Update the completeSyncLog method to set final webinars_synced count

2. src/services/zoom/sync/processors/SyncStrategyExecutor.ts
   - Ensure processedCount is passed as webinars_synced

### Implementation:
`;

// Patch for EnhancedSyncProgressTracker.ts
export const enhancedSyncProgressTrackerPatch = `
  /**
   * Update progress with enhanced tracking
   */
  async updateProgress(
    syncLogId: string,
    progress: { 
      total: number; 
      processed: number; 
      failed: number; 
      current: string;
      overallProgress?: number;
    }
  ): Promise<void> {
    if (!this.isValidUUID(syncLogId)) {
      console.error('Invalid sync log ID format:', syncLogId);
      return;
    }

    const overallProgress = progress.overallProgress || 
      Math.round((progress.processed / progress.total) * 100);

    await this.updateSyncLog(syncLogId, {
      total_items: progress.total,
      processed_items: progress.processed,
      failed_items: progress.failed,
      webinars_synced: progress.processed, // ADD THIS LINE
      status: SyncStatus.IN_PROGRESS
    });

    console.log(\`Sync \${syncLogId}: \${progress.processed}/\${progress.total} (\${overallProgress}%) - \${progress.current}\`);
  }
`;

// Patch for completeSyncLog method
export const completeSyncLogPatch = `
  /**
   * Complete sync log
   */
  async completeSyncLog(syncLogId: string): Promise<void> {
    if (!this.isValidUUID(syncLogId)) {
      console.error('Invalid sync log ID format:', syncLogId);
      return;
    }

    // Get the final count of processed items to set webinars_synced
    const { data: syncLog } = await supabase
      .from('zoom_sync_logs')
      .select('processed_items')
      .eq('id', syncLogId)
      .single();

    await this.updateSyncLog(syncLogId, {
      status: SyncStatus.COMPLETED,
      completed_at: new Date().toISOString(),
      current_webinar_id: null,
      sync_stage: 'completed',
      stage_progress_percentage: 100,
      webinars_synced: syncLog?.processed_items || 0 // ADD THIS LINE
    });
  }
`;

// Additional patch for SyncStrategyExecutor to ensure webinars_synced is updated
export const syncStrategyExecutorPatch = `
  // In executeInitialSync, executeIncrementalSync, and executeSingleWebinarSync
  // After processing webinars, update the final count:
  
  await progressTracker.updateSyncLog(syncLogId, {
    processed_items: processedCount,
    failed_items: failedCount,
    webinars_synced: processedCount, // ADD THIS LINE
    error_details: failedWebinars.length > 0 ? { 
      error_message: \`\${failedWebinars.length} webinars failed to sync\`,
      error_code: 'PARTIAL_SYNC_FAILURE',
      retry_count: 0,
      last_retry_at: new Date().toISOString(),
      failed_webinars: failedWebinars 
    } : null
  });
`;
