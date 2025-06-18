
import { supabase } from '@/integrations/supabase/client';

export interface SyncLogData {
  connection_id: string;
  sync_type: string;
  webinar_id?: string;
  sync_status?: string;
  sync_stage?: string;
  current_webinar_id?: string;
  stage_progress_percentage?: number;
  total_items?: number;
  processed_items?: number;
  failed_items?: number;
  error_message?: string;
  completed_at?: string;
  duration_seconds?: number;
}

/**
 * Enhanced sync progress tracker with proper completion handling
 */
export class EnhancedSyncProgressTracker {
  private syncStartTimes: Map<string, number> = new Map();

  /**
   * Create a new sync log entry with proper initialization
   */
  async createSyncLog(connectionId: string, syncType: string, webinarId?: string): Promise<string> {
    try {
      const { data, error } = await supabase
        .from('zoom_sync_logs')
        .insert({
          connection_id: connectionId,
          sync_type: syncType,
          webinar_id: webinarId || null,
          sync_status: 'started',
          sync_stage: 'initializing',
          stage_progress_percentage: 0,
          total_items: null,
          processed_items: 0,
          failed_items: 0,
          error_message: null
        })
        .select('id')
        .single();

      if (error) {
        console.error('❌ Failed to create sync log:', error);
        throw new Error(`Failed to create sync log: ${error.message}`);
      }

      const syncLogId = data.id;
      this.syncStartTimes.set(syncLogId, Date.now());
      
      console.log(`📝 SYNC LOG CREATED: ${syncLogId} for ${syncType} sync`);
      return syncLogId;
      
    } catch (error) {
      console.error('❌ Error creating sync log:', error);
      throw error;
    }
  }

  /**
   * Update sync stage with progress information
   */
  async updateSyncStage(
    syncLogId: string, 
    webinarId: string | null, 
    stage: string, 
    progressPercentage: number
  ): Promise<void> {
    try {
      const updateData: Partial<SyncLogData> = {
        sync_stage: stage,
        stage_progress_percentage: Math.min(100, Math.max(0, progressPercentage))
      };

      if (webinarId) {
        updateData.current_webinar_id = webinarId;
      }

      const { error } = await supabase
        .from('zoom_sync_logs')
        .update(updateData)
        .eq('id', syncLogId);

      if (error) {
        console.error(`❌ Failed to update sync stage for ${syncLogId}:`, error);
      } else {
        console.log(`📊 STAGE UPDATE: ${syncLogId} - ${stage} (${progressPercentage}%)`);
      }
    } catch (error) {
      console.error(`❌ Error updating sync stage for ${syncLogId}:`, error);
    }
  }

  /**
   * Update sync log with general data
   */
  async updateSyncLog(syncLogId: string, data: Partial<SyncLogData>): Promise<void> {
    try {
      const { error } = await supabase
        .from('zoom_sync_logs')
        .update(data)
        .eq('id', syncLogId);

      if (error) {
        console.error(`❌ Failed to update sync log ${syncLogId}:`, error);
      } else {
        console.log(`📊 SYNC LOG UPDATE: ${syncLogId} updated`);
      }
    } catch (error) {
      console.error(`❌ Error updating sync log ${syncLogId}:`, error);
    }
  }

  /**
   * Log webinar completion with success/failure status
   */
  async logWebinarCompletion(
    syncLogId: string, 
    webinarId: string, 
    success: boolean, 
    errorMessage?: string
  ): Promise<void> {
    try {
      const stage = success ? 'webinar_completed' : 'webinar_failed';
      const progressPercentage = success ? 100 : 0;

      await this.updateSyncStage(syncLogId, webinarId, stage, progressPercentage);

      if (!success && errorMessage) {
        console.error(`❌ WEBINAR FAILED: ${webinarId} in sync ${syncLogId} - ${errorMessage}`);
        
        // Also update the failed items count
        const { data: currentLog } = await supabase
          .from('zoom_sync_logs')
          .select('failed_items')
          .eq('id', syncLogId)
          .single();

        const currentFailedItems = currentLog?.failed_items || 0;
        
        await this.updateSyncLog(syncLogId, {
          failed_items: currentFailedItems + 1,
          error_message: errorMessage
        });
      } else {
        console.log(`✅ WEBINAR SUCCESS: ${webinarId} completed in sync ${syncLogId}`);
      }
    } catch (error) {
      console.error(`❌ Error logging webinar completion for ${syncLogId}:`, error);
    }
  }

  /**
   * Complete sync log with final status and duration
   */
  async completeSyncLog(syncLogId: string): Promise<void> {
    try {
      const startTime = this.syncStartTimes.get(syncLogId);
      const duration = startTime ? Math.round((Date.now() - startTime) / 1000) : null;

      const updateData: Partial<SyncLogData> = {
        sync_status: 'completed',
        sync_stage: 'completed',
        stage_progress_percentage: 100,
        completed_at: new Date().toISOString()
      };

      if (duration) {
        updateData.duration_seconds = duration;
      }

      const { error } = await supabase
        .from('zoom_sync_logs')
        .update(updateData)
        .eq('id', syncLogId);

      if (error) {
        console.error(`❌ Failed to complete sync log ${syncLogId}:`, error);
      } else {
        console.log(`🎉 SYNC COMPLETED: ${syncLogId} finished in ${duration || 'unknown'} seconds`);
      }

      // Clean up tracking data
      this.syncStartTimes.delete(syncLogId);
      
    } catch (error) {
      console.error(`❌ Error completing sync log ${syncLogId}:`, error);
    }
  }

  /**
   * Fail sync log with error information
   */
  async failSyncLog(syncLogId: string, error: any): Promise<void> {
    try {
      const startTime = this.syncStartTimes.get(syncLogId);
      const duration = startTime ? Math.round((Date.now() - startTime) / 1000) : null;

      const errorMessage = error instanceof Error ? error.message : String(error);

      const updateData: Partial<SyncLogData> = {
        sync_status: 'failed',
        sync_stage: 'failed',
        stage_progress_percentage: 0,
        error_message: errorMessage,
        completed_at: new Date().toISOString()
      };

      if (duration) {
        updateData.duration_seconds = duration;
      }

      const { error: updateError } = await supabase
        .from('zoom_sync_logs')
        .update(updateData)
        .eq('id', syncLogId);

      if (updateError) {
        console.error(`❌ Failed to fail sync log ${syncLogId}:`, updateError);
      } else {
        console.error(`💥 SYNC FAILED: ${syncLogId} - ${errorMessage}`);
      }

      // Clean up tracking data
      this.syncStartTimes.delete(syncLogId);
      
    } catch (updateError) {
      console.error(`❌ Error failing sync log ${syncLogId}:`, updateError);
    }
  }
}
