
import { supabase } from '@/integrations/supabase/client';
import { SyncType, SyncStatus } from '@/types/zoom';
import { ZoomWebinarDataService, type SyncProgress } from './ZoomWebinarDataService';

/**
 * Service for handling webinar sync operations and logging
 */
export class ZoomWebinarSyncService {
  /**
   * Batch operation: Sync all webinars for a user
   */
  static async syncAllWebinars(
    userId: string,
    syncType: 'initial' | 'incremental',
    onProgress?: (progress: SyncProgress) => void
  ): Promise<{ success: number; failed: number; errors: string[] }> {
    const syncLogId = await this.createSyncLog(userId, 'full_sync', syncType as SyncType);
    const errors: string[] = [];
    let successCount = 0;
    let failedCount = 0;

    try {
      // Determine date range for incremental sync
      const options: any = {};
      if (syncType === 'incremental') {
        // Get last sync date from database
        const lastSync = await this.getLastSyncDate(userId);
        if (lastSync) {
          options.from = new Date(lastSync);
        }
      }

      // Get all webinars
      const webinars = await ZoomWebinarDataService.listWebinars(userId, options, onProgress);

      // Update total count in sync log
      await this.updateSyncLog(syncLogId, {
        total_items: webinars.length,
        sync_status: SyncStatus.IN_PROGRESS
      });

      // Sync each webinar
      for (let i = 0; i < webinars.length; i++) {
        try {
          await this.syncWebinarDetails(webinars[i].id);
          successCount++;
        } catch (error) {
          failedCount++;
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          errors.push(`Webinar ${webinars[i].id}: ${errorMessage}`);
        }

        // Update progress
        if (onProgress) {
          onProgress({
            total: webinars.length,
            processed: i + 1,
            failed: failedCount,
            current: `Syncing webinar: ${webinars[i].topic}`
          });
        }

        // Update sync log
        await this.updateSyncLog(syncLogId, {
          processed_items: i + 1,
          failed_items: failedCount
        });
      }

      // Complete sync
      await this.updateSyncLog(syncLogId, {
        sync_status: SyncStatus.COMPLETED,
        completed_at: new Date().toISOString(),
        error_details: errors.length > 0 ? { errors } : null
      });

      return { success: successCount, failed: failedCount, errors };
    } catch (error) {
      await this.updateSyncLog(syncLogId, {
        sync_status: SyncStatus.FAILED,
        error_message: error instanceof Error ? error.message : 'Unknown error',
        completed_at: new Date().toISOString()
      });
      throw error;
    }
  }

  /**
   * Batch operation: Sync detailed data for a specific webinar
   */
  static async syncWebinarDetails(webinarId: string): Promise<void> {
    const tasks = [
      ZoomWebinarDataService.getWebinar(webinarId),
      ZoomWebinarDataService.getWebinarRegistrants(webinarId),
      ZoomWebinarDataService.getWebinarParticipants(webinarId),
      ZoomWebinarDataService.getWebinarPolls(webinarId),
      ZoomWebinarDataService.getWebinarQA(webinarId)
    ];

    const [webinar, registrants, participants, polls, qa] = await Promise.allSettled(tasks);

    // Process results and save to database
    // This would involve transforming the data and inserting into respective tables
    // Implementation would depend on the specific database operations service
    
    if (webinar.status === 'rejected') {
      throw new Error(`Failed to sync webinar: ${webinar.reason}`);
    }
  }

  /**
   * Create a sync log entry
   */
  private static async createSyncLog(
    userId: string,
    resourceType: string,
    syncType: SyncType
  ): Promise<string> {
    // Get user's primary connection
    const { data: connections } = await supabase
      .from('zoom_connections')
      .select('id')
      .eq('user_id', userId)
      .eq('is_primary', true)
      .limit(1);

    if (!connections || connections.length === 0) {
      throw new Error('No active Zoom connection found');
    }

    const { data, error } = await supabase
      .from('zoom_sync_logs')
      .insert({
        connection_id: connections[0].id,
        sync_type: syncType,
        status: 'in_progress', // Add the required status field
        sync_status: SyncStatus.STARTED,
        resource_type: resourceType,
        started_at: new Date().toISOString(),
        total_items: 0,
        processed_items: 0,
        failed_items: 0
      })
      .select('id')
      .single();

    if (error) {
      throw new Error(`Failed to create sync log: ${error.message}`);
    }

    return data.id;
  }

  /**
   * Update sync log with progress
   */
  private static async updateSyncLog(
    syncLogId: string,
    updates: Partial<{
      total_items: number;
      processed_items: number;
      failed_items: number;
      sync_status: SyncStatus;
      error_message: string;
      error_details: any;
      completed_at: string;
    }>
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
   * Get last sync date for incremental sync
   */
  private static async getLastSyncDate(userId: string): Promise<string | null> {
    const { data: connections } = await supabase
      .from('zoom_connections')
      .select('last_sync_at')
      .eq('user_id', userId)
      .eq('is_primary', true)
      .limit(1);

    return connections?.[0]?.last_sync_at || null;
  }
}
