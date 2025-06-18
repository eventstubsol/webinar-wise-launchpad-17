import { zoomApiClient } from './ZoomApiClient';
import { ZoomErrorRecovery } from '../utils/transformers/validationUtils';
import type { ApiResponse } from './types';

/**
 * Enhanced Zoom API response for webinar with all missing fields
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
  
  // ADD MISSING: Start URL and access fields
  start_url?: string;
  
  // ADD MISSING: Password and security fields
  password?: string;
  encrypted_passcode?: string;
  encrypted_password?: string; // Alternative field name
  h323_password?: string;
  h323_passcode?: string;
  pstn_password?: string;
  
  // ADD MISSING: Creation metadata
  created_at?: string;
  creation_source?: 'other' | 'open_api' | 'web_portal';
  
  // ADD MISSING: Simulive fields
  is_simulive?: boolean;
  record_file_id?: string;
  transition_to_live?: boolean;
  
  // ADD MISSING: Occurrence for recurring webinars
  occurrence_id?: string;
  
  settings: {
    approval_type: number;
    registration_type?: number;
    alternative_hosts?: string;
    registrants_restrict_number?: number;
    [key: string]: any;
  };
  occurrences?: Array<{
    occurrence_id: string;
    start_time: string;
    duration: number;
    status: string;
  }>;
  recurrence?: any;
  tracking_fields?: any;
  panelists?: any[];
}

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
 * Enhanced options for listing webinars
 */
interface ListWebinarsOptions {
  from?: Date;
  to?: Date;
  type?: 'past' | 'upcoming' | 'live';
  pageSize?: number;
  dayRange?: number;
}

/**
 * Enhanced options for getting single webinar
 */
interface GetWebinarOptions {
  occurrence_id?: string;
  show_previous_occurrences?: boolean;
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
 * Enhanced Zoom-specific error for better error handling
 */
class ZoomApiError extends Error {
  constructor(
    message: string,
    public code?: number,
    public details?: any,
    public isRetryable?: boolean
  ) {
    super(message);
    this.name = 'ZoomApiError';
  }
}

/**
 * Enhanced service for fetching webinar data from Zoom API
 */
export class ZoomWebinarDataService {
  /**
   * Enhanced get webinar with query parameters support and error recovery
   */
  static async getWebinar(
    webinarId: string,
    options?: GetWebinarOptions
  ): Promise<ZoomWebinarApiResponse | null> {
    const params = new URLSearchParams();
    
    // ADD MISSING: Query parameter support
    if (options?.occurrence_id) {
      params.append('occurrence_id', options.occurrence_id);
    }
    if (options?.show_previous_occurrences) {
      params.append('show_previous_occurrences', 'true');
    }
    
    const url = `/webinars/${webinarId}${params.toString() ? `?${params}` : ''}`;
    
    let retryCount = 0;
    const maxRetries = 3;
    
    while (retryCount <= maxRetries) {
      try {
        const response = await zoomApiClient.get<ZoomWebinarApiResponse>(url);
        
        if (response.success) {
          return response.data || null;
        }
        
        // Enhanced error handling with recovery strategies
        const recoveryStrategy = await ZoomErrorRecovery.handleApiError(response.error, {
          operation: 'getWebinar',
          webinarId,
          retryCount,
          maxRetries
        });
        
        if (recoveryStrategy.shouldRetry && retryCount < maxRetries) {
          retryCount++;
          console.log(`Retrying getWebinar for ${webinarId} (attempt ${retryCount}/${maxRetries}) after ${recoveryStrategy.delayMs}ms`);
          await new Promise(resolve => setTimeout(resolve, recoveryStrategy.delayMs));
          continue;
        }
        
        this.handleZoomApiError(response.error, webinarId);
        return null;
        
      } catch (error) {
        ZoomErrorRecovery.logError(error, { operation: 'getWebinar', webinarId, retryCount });
        
        if (retryCount >= maxRetries) {
          console.error(`Failed to fetch webinar ${webinarId} after ${maxRetries} retries:`, error);
          throw error;
        }
        
        retryCount++;
        await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
      }
    }
    
    return null;
  }

  /**
   * Enhanced Zoom API error handling with specific error categorization
   */
  private static handleZoomApiError(error: any, webinarId: string): void {
    const errorCode = error?.code;
    
    switch (errorCode) {
      case 300:
        throw new ZoomApiError(`Invalid webinar ID: ${webinarId}`, 300, error, false);
      case 200:
        throw new ZoomApiError('Webinar plan missing or no permission', 200, error, false);
      case 3001:
        throw new ZoomApiError(`Webinar does not exist: ${webinarId}`, 3001, error, false);
      case 429:
        throw new ZoomApiError('Rate limit exceeded - please retry later', 429, error, true);
      case 124:
        throw new ZoomApiError('Invalid access token', 124, error, false);
      default:
        console.error(`Zoom API error ${errorCode}:`, error);
        throw new ZoomApiError(`Zoom API error: ${error?.message || 'Unknown error'}`, errorCode, error, errorCode >= 500);
    }
  }

  /**
   * List webinars with extended range support (past + upcoming)
   */
  static async listWebinarsWithExtendedRange(
    userId: string,
    options: { dayRange?: number; pageSize?: number } = {},
    onProgress?: (progress: SyncProgress) => void
  ): Promise<ZoomWebinarApiResponse[]> {
    const { dayRange = 90, pageSize = 100 } = options;
    
    const now = new Date();
    const pastDate = new Date(now.getTime() - (dayRange * 24 * 60 * 60 * 1000));
    const futureDate = new Date(now.getTime() + (dayRange * 24 * 60 * 60 * 1000));

    try {
      // Fetch past webinars
      if (onProgress) {
        onProgress({
          total: 2,
          processed: 0,
          failed: 0,
          current: 'Fetching past webinars...'
        });
      }

      const pastWebinars = await this.listWebinars(userId, {
        from: pastDate,
        to: now,
        type: 'past',
        pageSize
      });

      // Fetch upcoming webinars
      if (onProgress) {
        onProgress({
          total: 2,
          processed: 1,
          failed: 0,
          current: 'Fetching upcoming webinars...'
        });
      }

      const upcomingWebinars = await this.listWebinars(userId, {
        from: now,
        to: futureDate,
        type: 'upcoming',
        pageSize
      });

      // Merge and deduplicate webinars
      const allWebinars = [...pastWebinars, ...upcomingWebinars];
      const uniqueWebinars = this.deduplicateWebinars(allWebinars);

      if (onProgress) {
        onProgress({
          total: 2,
          processed: 2,
          failed: 0,
          current: `Found ${uniqueWebinars.length} total webinars`
        });
      }

      return uniqueWebinars;
    } catch (error) {
      console.error('Error fetching extended range webinars:', error);
      throw error;
    }
  }

  /**
   * Deduplicate webinars by ID
   */
  private static deduplicateWebinars(webinars: ZoomWebinarApiResponse[]): ZoomWebinarApiResponse[] {
    const seen = new Set<string>();
    return webinars.filter(webinar => {
      if (seen.has(webinar.id)) {
        return false;
      }
      seen.add(webinar.id);
      return true;
    });
  }

  /**
   * List webinars with automatic pagination and enhanced error handling
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
          this.handleZoomApiError(response.error, 'webinar list');
          break;
        }

        const { webinars, page_count, page_number: currentPage } = response.data;
        allWebinars.push(...webinars);

        // Update progress
        if (onProgress) {
          onProgress({
            total: response.data.total_records,
            processed: allWebinars.length,
            failed: 0,
            current: `Page ${currentPage} of ${page_count} (${type})`
          });
        }

        hasMore = currentPage < page_count;
        pageNumber++;
      }

      return allWebinars;
    } catch (error) {
      if (error instanceof ZoomApiError && error.isRetryable) {
        console.warn(`Retryable error encountered: ${error.message}`);
        // Could implement retry logic here
      }
      throw error;
    }
  }

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
   * Calculate engagement score with enhanced metrics
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
}

// Export enhanced types for use in other services
export type { ZoomWebinarApiResponse, ListWebinarsOptions, SyncProgress, GetWebinarOptions };
export { ZoomApiError };
