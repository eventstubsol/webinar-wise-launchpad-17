
import { supabase } from '@/integrations/supabase/client';
import { SyncStatus, ZoomSyncLog, SyncErrorDetails } from '@/types/zoom';

/**
 * Handles sync progress tracking and database operations
 */
export class SyncProgressTracker {
  /**
   * Create sync log entry
   */
  async createSyncLog(connectionId: string, syncType: string, resourceId?: string): Promise<string> {
    const { data, error } = await supabase
      .from('zoom_sync_logs')
      .insert({
        connection_id: connectionId,
        sync_type: syncType,
        status: 'in_progress', // Add required status field
        sync_status: SyncStatus.STARTED,
        resource_type: resourceId ? 'webinar' : 'webinars',
        resource_id: resourceId,
        started_at: new Date().toISOString(),
        total_items: 0,
        processed_items: 0,
        failed_items: 0
      })
      .select('id')
      .single();

    if (error) throw error;
    return data.id;
  }

  /**
   * Update sync log with progress
   */
  async updateSyncLog(
    syncLogId: string,
    updates: Partial<Omit<ZoomSyncLog, 'id' | 'created_at'>>
  ): Promise<void> {
    await supabase
      .from('zoom_sync_logs')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', syncLogId);
  }

  /**
   * Update progress and emit real-time updates
   */
  async updateProgress(
    syncLogId: string,
    progress: { total: number; processed: number; failed: number; current: string }
  ): Promise<void> {
    await this.updateSyncLog(syncLogId, {
      total_items: progress.total,
      processed_items: progress.processed,
      failed_items: progress.failed,
      sync_status: SyncStatus.IN_PROGRESS
    });
  }

  /**
   * Complete sync log
   */
  async completeSyncLog(syncLogId: string): Promise<void> {
    await this.updateSyncLog(syncLogId, {
      sync_status: SyncStatus.COMPLETED,
      completed_at: new Date().toISOString()
    });
  }

  /**
   * Mark sync log as failed
   */
  async failSyncLog(syncLogId: string, error: any): Promise<void> {
    const errorDetails: SyncErrorDetails = {
      error_message: error instanceof Error ? error.message : 'Unknown error',
      error_code: error.code || 'UNKNOWN_ERROR',
      retry_count: 0,
      last_retry_at: new Date().toISOString()
    };

    await this.updateSyncLog(syncLogId, {
      sync_status: SyncStatus.FAILED,
      error_message: error instanceof Error ? error.message : 'Unknown error',
      error_details: errorDetails,
      completed_at: new Date().toISOString()
    });
  }
}
