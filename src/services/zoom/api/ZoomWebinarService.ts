
import { zoomApiClient, ApiResponse } from './ZoomApiClient';
import { ZoomWebinar, ZoomRegistrant, ZoomParticipant, ZoomPoll, ZoomQna, SyncType, SyncStatus } from '@/types/zoom';
import { supabase } from '@/integrations/supabase/client';

/**
 * Zoom API response for webinar list
 */
interface ZoomWebinarListResponse {
  page_count: number;
  page_number: number;
  page_size: number;
  total_records: number;
  webinars: ZoomWebinarApiResponse[];
}

/**
 * Zoom API webinar response format
 */
interface ZoomWebinarApiResponse {
  id: string;
  uuid: string;
  host_id: string;
  host_email: string;
  topic: string;
  agenda?: string;
  type: number;
  status: string;
  start_time: string;
  duration: number;
  timezone: string;
  join_url: string;
  registration_url?: string;
  settings: {
    approval_type: number;
    registration_type: number;
    alternative_hosts?: string;
    [key: string]: any;
  };
  occurrences?: Array<{
    occurrence_id: string;
    start_time: string;
    duration: number;
    status: string;
  }>;
}

/**
 * Options for listing webinars
 */
interface ListWebinarsOptions {
  from?: Date;
  to?: Date;
  type?: 'past' | 'upcoming' | 'live';
  pageSize?: number;
}

/**
 * Sync progress callback for batch operations
 */
interface SyncProgress {
  total: number;
  processed: number;
  failed: number;
  current: string;
}

/**
 * Enhanced Zoom Webinar Service with comprehensive data fetching and sync capabilities
 */
export class ZoomWebinarService {
  /**
   * List webinars with automatic pagination and date filtering
   */
  static async listWebinars(
    userId: string, 
    options: ListWebinarsOptions = {},
    onProgress?: (progress: SyncProgress) => void
  ): Promise<ZoomWebinarApiResponse[]> {
    const {
      from,
      to,
      type = 'past',
      pageSize = 100
    } = options;

    const allWebinars: ZoomWebinarApiResponse[] = [];
    let pageNumber = 1;
    let hasMore = true;

    // Create sync log entry
    const syncLogId = await this.createSyncLog(userId, 'webinar_list', SyncType.MANUAL);

    try {
      while (hasMore) {
        const params = new URLSearchParams({
          page_size: pageSize.toString(),
          page_number: pageNumber.toString(),
          type,
        });

        if (from) {
          params.append('from', from.toISOString().split('T')[0]);
        }
        if (to) {
          params.append('to', to.toISOString().split('T')[0]);
        }

        const response = await zoomApiClient.get<ZoomWebinarListResponse>(
          `/users/me/webinars?${params}`
        );

        if (!response.success || !response.data) {
          throw new Error(response.error || 'Failed to fetch webinars');
        }

        const { webinars, page_count, page_number: currentPage } = response.data;
        allWebinars.push(...webinars);

        // Update progress
        if (onProgress) {
          onProgress({
            total: response.data.total_records,
            processed: allWebinars.length,
            failed: 0,
            current: `Page ${currentPage} of ${page_count}`
          });
        }

        hasMore = currentPage < page_count;
        pageNumber++;

        // Update sync log
        await this.updateSyncLog(syncLogId, {
          total_items: response.data.total_records,
          processed_items: allWebinars.length,
          sync_status: SyncStatus.IN_PROGRESS
        });
      }

      // Complete sync log
      await this.updateSyncLog(syncLogId, {
        sync_status: SyncStatus.COMPLETED,
        completed_at: new Date().toISOString()
      });

      return allWebinars;
    } catch (error) {
      // Log error in sync log
      await this.updateSyncLog(syncLogId, {
        sync_status: SyncStatus.FAILED,
        error_message: error instanceof Error ? error.message : 'Unknown error',
        completed_at: new Date().toISOString()
      });
      throw error;
    }
  }

  /**
   * Get detailed information about a specific webinar
   */
  static async getWebinar(webinarId: string): Promise<ZoomWebinarApiResponse | null> {
    const response = await zoomApiClient.get<ZoomWebinarApiResponse>(
      `/webinars/${webinarId}`
    );

    if (response.success) {
      return response.data || null;
    }

    console.error(`Failed to fetch webinar ${webinarId}:`, response.error);
    return null;
  }

  /**
   * Get webinar registrants with pagination support
   */
  static async getWebinarRegistrants(
    webinarId: string,
    options: { pageSize?: number; status?: 'pending' | 'approved' | 'denied' } = {}
  ) {
    const { pageSize = 100, status = 'approved' } = options;
    const allRegistrants = [];
    let pageNumber = 1;
    let hasMore = true;

    while (hasMore) {
      const params = new URLSearchParams({
        page_size: pageSize.toString(),
        page_number: pageNumber.toString(),
        status,
      });

      const response = await zoomApiClient.get(
        `/webinars/${webinarId}/registrants?${params}`
      );

      if (!response.success || !response.data) {
        console.error(`Failed to fetch registrants for webinar ${webinarId}:`, response.error);
        break;
      }

      const { registrants, page_count, page_number: currentPage } = response.data;
      allRegistrants.push(...registrants);

      hasMore = currentPage < page_count;
      pageNumber++;
    }

    return allRegistrants;
  }

  /**
   * Get webinar participants with engagement metrics
   */
  static async getWebinarParticipants(
    webinarId: string,
    options: { pageSize?: number } = {}
  ) {
    const { pageSize = 100 } = options;
    const allParticipants = [];
    let nextPageToken = '';
    let hasMore = true;

    while (hasMore) {
      const params = new URLSearchParams({
        page_size: pageSize.toString(),
      });

      if (nextPageToken) {
        params.append('next_page_token', nextPageToken);
      }

      const response = await zoomApiClient.get(
        `/report/webinars/${webinarId}/participants?${params}`
      );

      if (!response.success || !response.data) {
        console.error(`Failed to fetch participants for webinar ${webinarId}:`, response.error);
        break;
      }

      const { participants, next_page_token } = response.data;
      
      // Calculate engagement metrics for each participant
      const enhancedParticipants = participants.map((participant: any) => ({
        ...participant,
        engagement_score: this.calculateEngagementScore(participant),
        total_duration: participant.duration || 0,
        join_leave_count: participant.details?.length || 1
      }));

      allParticipants.push(...enhancedParticipants);

      hasMore = !!next_page_token;
      nextPageToken = next_page_token || '';
    }

    return allParticipants;
  }

  /**
   * Get webinar polls
   */
  static async getWebinarPolls(webinarId: string) {
    const response = await zoomApiClient.get(
      `/webinars/${webinarId}/polls`
    );

    if (response.success) {
      return response.data;
    }

    console.error(`Failed to fetch polls for webinar ${webinarId}:`, response.error);
    return null;
  }

  /**
   * Get webinar Q&A
   */
  static async getWebinarQA(webinarId: string) {
    const response = await zoomApiClient.get(
      `/report/webinars/${webinarId}/qa`
    );

    if (response.success) {
      return response.data;
    }

    console.error(`Failed to fetch Q&A for webinar ${webinarId}:`, response.error);
    return null;
  }

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
      const options: ListWebinarsOptions = {};
      if (syncType === 'incremental') {
        // Get last sync date from database
        const lastSync = await this.getLastSyncDate(userId);
        if (lastSync) {
          options.from = new Date(lastSync);
        }
      }

      // Get all webinars
      const webinars = await this.listWebinars(userId, options, onProgress);

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
      this.getWebinar(webinarId),
      this.getWebinarRegistrants(webinarId),
      this.getWebinarParticipants(webinarId),
      this.getWebinarPolls(webinarId),
      this.getWebinarQA(webinarId)
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
   * Transform Zoom API webinar response to database format
   */
  static transformWebinarForDatabase(
    apiWebinar: ZoomWebinarApiResponse,
    connectionId: string
  ): Omit<ZoomWebinar, 'id' | 'created_at' | 'updated_at'> {
    return {
      connection_id: connectionId,
      webinar_id: apiWebinar.id,
      webinar_uuid: apiWebinar.uuid,
      host_id: apiWebinar.host_id,
      host_email: apiWebinar.host_email || null,
      topic: apiWebinar.topic,
      agenda: apiWebinar.agenda || null,
      type: apiWebinar.type,
      status: apiWebinar.status as any,
      start_time: apiWebinar.start_time || null,
      duration: apiWebinar.duration || null,
      timezone: apiWebinar.timezone || null,
      registration_required: !!apiWebinar.registration_url,
      registration_type: apiWebinar.settings?.registration_type || null,
      registration_url: apiWebinar.registration_url || null,
      join_url: apiWebinar.join_url || null,
      approval_type: apiWebinar.settings?.approval_type || null,
      alternative_hosts: apiWebinar.settings?.alternative_hosts ? 
        apiWebinar.settings.alternative_hosts.split(',').map(h => h.trim()) : null,
      max_registrants: null, // Not provided in basic API response
      max_attendees: null, // Not provided in basic API response
      occurrence_id: apiWebinar.occurrences?.[0]?.occurrence_id || null,
      total_registrants: null, // Needs to be calculated from registrants API
      total_attendees: null, // Needs to be calculated from participants API
      total_minutes: null, // Needs to be calculated from participants
      avg_attendance_duration: null, // Needs to be calculated from participants
      synced_at: new Date().toISOString(),
    };
  }

  /**
   * Calculate engagement score for a participant
   */
  private static calculateEngagementScore(participant: any): number {
    let score = 0;
    
    // Base score from duration (0-40 points)
    const duration = participant.duration || 0;
    score += Math.min(40, (duration / 60) * 10); // 10 points per 6 minutes, max 40
    
    // Engagement activities (60 points total)
    if (participant.answered_polling) score += 20;
    if (participant.asked_question) score += 20;
    if (participant.posted_chat) score += 10;
    if (participant.raised_hand) score += 10;
    
    return Math.round(Math.min(100, score));
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
