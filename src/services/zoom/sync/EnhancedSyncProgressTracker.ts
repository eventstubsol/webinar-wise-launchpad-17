import { supabase } from '@/integrations/supabase/client';
import { SyncStatus, ZoomSyncLog, SyncErrorDetails } from '@/types/zoom';

/**
 * Enhanced sync progress tracker with granular webinar-level tracking
 */
export class EnhancedSyncProgressTracker {
  /**
   * Validate UUID format
   */
  private isValidUUID(uuid: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
  }

  /**
   * Create sync log entry with proper UUID and error handling
   */
  async createSyncLog(connectionId: string, syncType: string, resourceId?: string): Promise<string> {
    // Validate connection ID format
    if (!this.isValidUUID(connectionId)) {
      console.error('Invalid connection ID format:', connectionId);
      throw new Error('Invalid connection ID format');
    }

    // Generate a proper UUID for the sync log - use crypto.randomUUID for consistency
    const syncLogId = crypto.randomUUID();
    
    // Validate generated sync log ID
    if (!this.isValidUUID(syncLogId)) {
      console.error('Failed to generate valid UUID for sync log');
      throw new Error('Failed to generate valid UUID for sync log');
    }

    console.log('Creating sync log with ID:', syncLogId, 'for connection:', connectionId);
    
    try {
      const { data, error } = await supabase
        .from('zoom_sync_logs')
        .insert({
          id: syncLogId, // Explicitly set the UUID
          connection_id: connectionId,
          sync_type: syncType,
          status: SyncStatus.STARTED, // Only set status, sync_status is generated automatically
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

      if (error) {
        console.error('Failed to create sync log:', error);
        throw new Error(`Failed to create sync log: ${error.message}`);
      }
      
      console.log('Sync log created successfully:', data.id);
      
      // Verify the record was created
      const { data: verifyData, error: verifyError } = await supabase
        .from('zoom_sync_logs')
        .select('id')
        .eq('id', syncLogId)
        .maybeSingle();
        
      if (verifyError || !verifyData) {
        console.error('Sync log verification failed:', verifyError);
        throw new Error('Sync log was not properly created');
      }
      
      return data.id;
    } catch (error) {
      console.error('Database error creating sync log:', error);
      throw new Error(`Failed to create sync log: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Update sync log with progress
   */
  async updateSyncLog(
    syncLogId: string,
    updates: Record<string, any>
  ): Promise<void> {
    // Validate that syncLogId is a proper UUID
    if (!this.isValidUUID(syncLogId)) {
      console.error('Invalid sync log ID format:', syncLogId);
      return;
    }

    try {
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
    } catch (error) {
      console.error('Database error updating sync log:', error);
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
    if (!this.isValidUUID(syncLogId)) {
      console.error('Invalid sync log ID format:', syncLogId);
      return;
    }

    // Validate webinar ID if provided
    if (webinarId && !this.isValidUUID(webinarId)) {
      console.error('Invalid webinar ID format:', webinarId);
      return;
    }

    try {
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
    } catch (error) {
      console.error('Database error updating sync stage:', error);
    }
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
      status: SyncStatus.IN_PROGRESS // Only set status, sync_status is generated automatically
    });

    console.log(`Sync ${syncLogId}: ${progress.processed}/${progress.total} (${overallProgress}%) - ${progress.current}`);
  }

  /**
   * Complete sync log
   */
  async completeSyncLog(syncLogId: string): Promise<void> {
    if (!this.isValidUUID(syncLogId)) {
      console.error('Invalid sync log ID format:', syncLogId);
      return;
    }

    await this.updateSyncLog(syncLogId, {
      status: SyncStatus.COMPLETED, // Only set status, sync_status is generated automatically
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
    if (!this.isValidUUID(syncLogId)) {
      console.error('Invalid sync log ID format:', syncLogId);
      return;
    }

    const errorDetails: SyncErrorDetails = {
      error_message: error instanceof Error ? error.message : 'Unknown error',
      error_code: error.code || 'UNKNOWN_ERROR',
      retry_count: 0,
      last_retry_at: new Date().toISOString()
    };

    await this.updateSyncLog(syncLogId, {
      status: SyncStatus.FAILED, // Only set status, sync_status is generated automatically
      error_message: error instanceof Error ? error.message : 'Unknown error',
      error_details: errorDetails,
      completed_at: new Date().toISOString(),
      sync_stage: 'failed',
      stage_progress_percentage: 0
    });
  }

  /**
   * Get current sync status for a connection with better error handling
   */
  async getCurrentSyncStatus(connectionId: string): Promise<any> {
    if (!this.isValidUUID(connectionId)) {
      console.error('Invalid connection ID format:', connectionId);
      return null;
    }

    try {
      const { data, error } = await supabase
        .from('zoom_sync_logs')
        .select('*')
        .eq('connection_id', connectionId)
        .in('status', [SyncStatus.STARTED, SyncStatus.IN_PROGRESS])
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error('Failed to get current sync status:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Database error getting sync status:', error);
      return null;
    }
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
    if (!this.isValidUUID(syncLogId)) {
      console.error('Invalid sync log ID format:', syncLogId);
      return;
    }

    if (!this.isValidUUID(webinarId)) {
      console.error('Invalid webinar ID format:', webinarId);
      return;
    }

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
