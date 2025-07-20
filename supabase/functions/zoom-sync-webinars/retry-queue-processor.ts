
import { ParticipantRetryService, RetryScheduleEntry } from './participant-retry-service.ts';

/**
 * Standalone processor for handling retry queues
 * Can be called independently or as part of sync operations
 */
export class RetryQueueProcessor {
  /**
   * Process all pending retries across all sync logs
   */
  static async processAllPendingRetries(supabase: any): Promise<void> {
    console.log('=== PROCESSING ALL PENDING RETRIES ===');
    
    // Find sync logs with pending retries
    const { data: syncLogs, error } = await supabase
      .from('zoom_sync_logs')
      .select(`
        id,
        connection_id,
        retry_schedule,
        retry_attempts,
        max_participant_retries,
        zoom_connections!inner(*)
      `)
      .not('retry_schedule', 'eq', '[]')
      .eq('sync_status', 'completed')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching sync logs with retries:', error);
      return;
    }

    if (!syncLogs || syncLogs.length === 0) {
      console.log('No pending retries found');
      return;
    }

    console.log(`Found ${syncLogs.length} sync logs with pending retries`);

    for (const syncLog of syncLogs) {
      try {
        await this.processSyncLogRetries(supabase, syncLog);
      } catch (error) {
        console.error(`Error processing retries for sync log ${syncLog.id}:`, error);
      }
    }
  }

  /**
   * Process retries for a specific sync log
   */
  static async processSyncLogRetries(supabase: any, syncLog: any): Promise<void> {
    const retrySchedule: RetryScheduleEntry[] = syncLog.retry_schedule || [];
    
    if (retrySchedule.length === 0) {
      return;
    }

    console.log(`Processing ${retrySchedule.length} pending retries for sync log ${syncLog.id}`);

    // Create Zoom API client
    const connection = syncLog.zoom_connections;
    const zoomApiClient = await this.createZoomAPIClient(connection);

    // Execute retries
    const results = await ParticipantRetryService.executeRetries(
      supabase,
      syncLog.id,
      retrySchedule,
      zoomApiClient,
      connection.id
    );

    console.log(`Retry results for sync log ${syncLog.id}:`, results);

    // If no more retries are pending, clean up the schedule
    if (results.deferred === 0) {
      await supabase
        .from('zoom_sync_logs')
        .update({
          retry_schedule: [],
          updated_at: new Date().toISOString()
        })
        .eq('id', syncLog.id);

      console.log(`Cleared retry schedule for sync log ${syncLog.id}`);
    }
  }

  /**
   * Get retry statistics across all sync logs
   */
  static async getRetryStatistics(supabase: any): Promise<any> {
    const { data: syncLogs, error } = await supabase
      .from('zoom_sync_logs')
      .select('retry_schedule, retry_attempts, max_participant_retries, created_at')
      .not('retry_schedule', 'eq', '[]');

    if (error || !syncLogs) {
      return {
        total_sync_logs_with_retries: 0,
        total_pending_retries: 0,
        retry_attempts_distribution: {},
        oldest_pending_retry: null
      };
    }

    const totalPendingRetries = syncLogs.reduce((sum, log) => {
      return sum + (log.retry_schedule?.length || 0);
    }, 0);

    const retryAttemptsDistribution = syncLogs.reduce((dist: any, log) => {
      const attempts = log.retry_attempts || 0;
      dist[attempts] = (dist[attempts] || 0) + 1;
      return dist;
    }, {});

    // Find oldest pending retry
    let oldestRetry: any = null;
    for (const log of syncLogs) {
      for (const retry of (log.retry_schedule || [])) {
        if (!oldestRetry || new Date(retry.scheduledFor) < new Date(oldestRetry.scheduledFor)) {
          oldestRetry = retry;
        }
      }
    }

    return {
      total_sync_logs_with_retries: syncLogs.length,
      total_pending_retries: totalPendingRetries,
      retry_attempts_distribution: retryAttemptsDistribution,
      oldest_pending_retry: oldestRetry
    };
  }

  /**
   * Clean up old completed retry schedules
   */
  static async cleanupOldRetries(supabase: any, olderThanDays: number = 7): Promise<void> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

    const { error } = await supabase
      .from('zoom_sync_logs')
      .update({
        retry_schedule: [],
        updated_at: new Date().toISOString()
      })
      .eq('retry_schedule', '[]')
      .lt('created_at', cutoffDate.toISOString());

    if (error) {
      console.error('Error cleaning up old retries:', error);
    } else {
      console.log(`Cleaned up retry schedules older than ${olderThanDays} days`);
    }
  }

  /**
   * Create Zoom API client (simplified version)
   */
  private static async createZoomAPIClient(connection: any) {
    return {
      async makeRequest(endpoint: string) {
        const response = await fetch(`https://api.zoom.us/v2${endpoint}`, {
          headers: {
            'Authorization': `Bearer ${connection.access_token}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (!response.ok) {
          throw new Error(`Zoom API error: ${response.status} ${response.statusText}`);
        }
        
        return await response.json();
      }
    };
  }
}
