
import { supabase } from '@/integrations/supabase/client';
import { SyncStatus, ZoomSyncLog, SyncErrorDetails } from '@/types/zoom';

/**
 * Enhanced sync progress tracker with granular webinar-level tracking
 */
export class EnhancedSyncProgressTracker {
  /**
   * Create sync log entry
   */
  async createSyncLog(connectionId: string, syncType: string, resourceId?: string): Promise<string> {
    const { data, error } = await supabase
      .from('zoom_sync_logs')
      .insert({
        connection_id: connectionId,
        sync_type: syncType,
        status: SyncStatus.STARTED,
        sync_status: SyncStatus.STARTED,
        resource_type: resourceId ? 'webinar' : 'webinars',
        resource_id: resourceId,
        started_at: new Date().toISOString(),
        total_items: 0,
        processed_items: 0,
        failed_items: 0,
        current_webinar_id: null,
        sync_stage: 'initializing',
        stage_progress_percentage: 0
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
    updates: Record<string, any>
  ): Promise<void> {
    const { error } = await supabase
      .from('zoom_sync_logs')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', syncLogId);

    if (error) {
      console.error('Failed to update sync log:', error);
    }
  }

  /**
   * Update current sync stage and webinar being processed
   */
  async updateSyncStage(
    syncLogId: string,
    webinarId: string | null,
    stage: string,
    stageProgress: number
  ): Promise<void> {
    const { error } = await supabase
      .from('zoom_sync_logs')
      .update({
        current_webinar_id: webinarId,
        sync_stage: stage,
        stage_progress_percentage: Math.max(0, Math.min(100, stageProgress)),
        updated_at: new Date().toISOString()
      })
      .eq('id', syncLogId);

    if (error) {
      console.error('Failed to update sync stage:', error);
    }

    // Log the stage update for debugging
    console.log(`Sync ${syncLogId}: ${stage} (${stageProgress}%) - Webinar: ${webinarId || 'N/A'}`);
  }

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
    const overallProgress = progress.overallProgress || 
      Math.round((progress.processed / progress.total) * 100);

    await this.updateSyncLog(syncLogId, {
      total_items: progress.total,
      processed_items: progress.processed,
      failed_items: progress.failed,
      sync_status: SyncStatus.IN_PROGRESS
    });

    console.log(`Sync ${syncLogId}: ${progress.processed}/${progress.total} (${overallProgress}%) - ${progress.current}`);
  }

  /**
   * Complete sync log
   */
  async completeSyncLog(syncLogId: string): Promise<void> {
    await this.updateSyncLog(syncLogId, {
      sync_status: SyncStatus.COMPLETED,
      completed_at: new Date().toISOString(),
      current_webinar_id: null,
      sync_stage: 'completed',
      stage_progress_percentage: 100
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
      completed_at: new Date().toISOString(),
      sync_stage: 'failed',
      stage_progress_percentage: 0
    });
  }

  /**
   * Get current sync status for a connection
   */
  async getCurrentSyncStatus(connectionId: string): Promise<any> {
    const { data, error } = await supabase
      .from('zoom_sync_logs')
      .select('*')
      .eq('connection_id', connectionId)
      .in('sync_status', [SyncStatus.STARTED, SyncStatus.IN_PROGRESS])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('Failed to get current sync status:', error);
      return null;
    }

    return data;
  }

  /**
   * Log individual webinar sync completion
   */
  async logWebinarCompletion(
    syncLogId: string,
    webinarId: string,
    success: boolean,
    errorMessage?: string
  ): Promise<void> {
    const stage = success ? 'webinar_completed' : 'webinar_failed';
    const progress = success ? 100 : 0;
    
    await this.updateSyncStage(syncLogId, webinarId, stage, progress);
    
    if (!success && errorMessage) {
      console.error(`Webinar ${webinarId} sync failed: ${errorMessage}`);
    } else if (success) {
      console.log(`Webinar ${webinarId} sync completed successfully`);
    }
  }
}
