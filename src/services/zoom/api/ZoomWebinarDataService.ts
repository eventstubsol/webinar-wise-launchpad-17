import { zoomApiClient } from './ZoomApiClient';
import type { ApiResponse } from './types';

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
  dayRange?: number; // New option for configurable range
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
 * Service for fetching webinar data from Zoom API
 */
export class ZoomWebinarDataService {
  /**
   * Validate API response structure
   */
  private static validateApiResponse(response: any, endpoint: string): { isValid: boolean; error?: string } {
    if (!response) {
      return { isValid: false, error: `Null response from ${endpoint}` };
    }

    if (typeof response !== 'object') {
      return { isValid: false, error: `Invalid response type from ${endpoint}: ${typeof response}` };
    }

    return { isValid: true };
  }

  /**
   * Enhanced logging for API responses
   */
  private static logApiResponse(endpoint: string, response: any, context?: string) {
    const logPrefix = context ? `[${context}]` : '';
    console.log(`${logPrefix} API Response for ${endpoint}:`, {
      responseType: typeof response,
      hasData: !!response,
      dataType: response ? typeof response : 'null',
      keys: response && typeof response === 'object' ? Object.keys(response) : [],
      webinarsField: response?.webinars ? {
        type: typeof response.webinars,
        isArray: Array.isArray(response.webinars),
        length: Array.isArray(response.webinars) ? response.webinars.length : 'N/A'
      } : 'undefined'
    });
  }

  /**
   * Handle API errors with detailed logging
   */
  private static handleApiError(error: any, endpoint: string, context?: string): string {
    const logPrefix = context ? `[${context}]` : '';
    console.error(`${logPrefix} API Error for ${endpoint}:`, {
      error: error,
      message: error?.message,
      status: error?.status || error?.statusCode,
      isRetryable: this.isRetryableError(error)
    });

    if (error?.status === 401 || error?.status === 403) {
      return 'Authentication or permission error. Please check your Zoom connection.';
    } else if (error?.status === 429) {
      return 'Rate limit exceeded. Please try again later.';
    } else if (error?.status >= 500) {
      return 'Zoom API server error. Please try again later.';
    } else {
      return error?.message || 'Unknown API error occurred';
    }
  }

  /**
   * Check if error is retryable
   */
  private static isRetryableError(error: any): boolean {
    const status = error?.status || error?.statusCode;
    return status >= 500 || status === 429 || status === 408;
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

    console.log('🔄 EXTENDED RANGE SYNC: Starting webinar fetch', {
      dayRange,
      pastDate: pastDate.toISOString(),
      futureDate: futureDate.toISOString(),
      pageSize
    });

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

      console.log('📅 FETCHING PAST WEBINARS...');
      const pastWebinars = await this.listWebinars(userId, {
        from: pastDate,
        to: now,
        type: 'past',
        pageSize
      });

      console.log(`✅ PAST WEBINARS RESULT: ${pastWebinars.length} webinars found`);

      // Fetch upcoming webinars
      if (onProgress) {
        onProgress({
          total: 2,
          processed: 1,
          failed: 0,
          current: 'Fetching upcoming webinars...'
        });
      }

      console.log('📅 FETCHING UPCOMING WEBINARS...');
      const upcomingWebinars = await this.listWebinars(userId, {
        from: now,
        to: futureDate,
        type: 'upcoming',
        pageSize
      });

      console.log(`✅ UPCOMING WEBINARS RESULT: ${upcomingWebinars.length} webinars found`);

      // Safely merge and deduplicate webinars - ensure both are arrays
      const allWebinars = [
        ...(Array.isArray(pastWebinars) ? pastWebinars : []),
        ...(Array.isArray(upcomingWebinars) ? upcomingWebinars : [])
      ];
      const uniqueWebinars = this.deduplicateWebinars(allWebinars);

      console.log('🔄 DEDUPLICATION COMPLETE:', {
        pastCount: pastWebinars.length,
        upcomingCount: upcomingWebinars.length,
        totalBeforeDedup: allWebinars.length,
        uniqueCount: uniqueWebinars.length
      });

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
      console.error('❌ EXTENDED RANGE SYNC ERROR:', error);
      const errorMessage = this.handleApiError(error, 'extended-range-sync', 'EXTENDED_RANGE');
      
      if (onProgress) {
        onProgress({
          total: 2,
          processed: 1,
          failed: 1,
          current: `Error: ${errorMessage}`
        });
      }
      
      throw new Error(errorMessage);
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

    const context = `LIST_WEBINARS_${type.toUpperCase()}`;
    console.log(`🔄 ${context}: Starting webinar list fetch`, {
      type,
      from: from?.toISOString(),
      to: to?.toISOString(),
      pageSize
    });

    const allWebinars: ZoomWebinarApiResponse[] = [];
    let pageNumber = 1;
    let hasMore = true;
    let consecutiveErrors = 0;
    const maxConsecutiveErrors = 3;

    try {
      while (hasMore && consecutiveErrors < maxConsecutiveErrors) {
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

        const endpoint = `/users/me/webinars?${params}`;
        console.log(`📡 ${context}: API Request - Page ${pageNumber}`, { endpoint });

        try {
          const response = await zoomApiClient.get<ZoomWebinarListResponse>(endpoint);
          
          // Enhanced response logging
          this.logApiResponse(endpoint, response, context);

          if (!response.success) {
            console.error(`❌ ${context}: API request failed:`, response.error);
            consecutiveErrors++;
            
            if (consecutiveErrors >= maxConsecutiveErrors) {
              throw new Error(`API failed after ${maxConsecutiveErrors} attempts: ${response.error}`);
            }
            
            // Wait before retry
            await new Promise(resolve => setTimeout(resolve, 1000 * consecutiveErrors));
            continue;
          }

          if (!response.data) {
            console.warn(`⚠️ ${context}: No data in successful response for page ${pageNumber}`);
            break;
          }

          // Validate response structure
          const validation = this.validateApiResponse(response.data, endpoint);
          if (!validation.isValid) {
            console.error(`❌ ${context}: Invalid response structure:`, validation.error);
            break;
          }

          const { webinars, page_count, page_number: currentPage, total_records } = response.data;
          
          // Enhanced webinars array validation
          if (webinars === undefined) {
            console.warn(`⚠️ ${context}: Webinars field is undefined in response`, {
              pageNumber: currentPage,
              totalRecords: total_records,
              pageCount: page_count,
              responseKeys: Object.keys(response.data)
            });
            
            // Check if this might be a permissions issue
            if (total_records === 0) {
              console.log(`ℹ️ ${context}: No webinars found (total_records = 0). This might be normal.`);
            } else {
              console.warn(`⚠️ ${context}: Expected webinars but got undefined. Possible permissions issue.`);
            }
            
            break;
          }

          if (!Array.isArray(webinars)) {
            console.error(`❌ ${context}: Webinars is not an array:`, {
              webinarsType: typeof webinars,
              webinarsValue: webinars,
              pageNumber: currentPage
            });
            break;
          }

          console.log(`✅ ${context}: Page ${currentPage} processed successfully`, {
            webinarsFound: webinars.length,
            totalRecords: total_records,
            pageCount: page_count
          });
          
          allWebinars.push(...webinars);
          consecutiveErrors = 0; // Reset on successful page

          // Update progress
          if (onProgress) {
            onProgress({
              total: total_records || allWebinars.length,
              processed: allWebinars.length,
              failed: 0,
              current: `Page ${currentPage} of ${page_count} (${type})`
            });
          }

          hasMore = currentPage < page_count;
          pageNumber++;

        } catch (pageError) {
          console.error(`❌ ${context}: Error processing page ${pageNumber}:`, pageError);
          consecutiveErrors++;
          
          if (consecutiveErrors >= maxConsecutiveErrors) {
            console.error(`❌ ${context}: Max consecutive errors reached, stopping pagination`);
            break;
          }
          
          // Exponential backoff for retries
          const delay = Math.pow(2, consecutiveErrors) * 1000;
          console.log(`⏳ ${context}: Retrying page ${pageNumber} after ${delay}ms delay`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }

      console.log(`🏁 ${context}: Final result`, {
        totalWebinars: allWebinars.length,
        pagesProcessed: pageNumber - 1,
        consecutiveErrors
      });

      return allWebinars;
    } catch (error) {
      console.error(`❌ ${context}: Critical error in listWebinars:`, error);
      const errorMessage = this.handleApiError(error, 'listWebinars', context);
      
      // Return what we have so far instead of throwing
      if (allWebinars.length > 0) {
        console.log(`🔄 ${context}: Returning partial results (${allWebinars.length} webinars) despite error`);
        return allWebinars;
      }
      
      throw new Error(errorMessage);
    }
  }

  /**
   * Get detailed information about a specific webinar
   */
  static async getWebinar(webinarId: string): Promise<ZoomWebinarApiResponse | null> {
    try {
      const response = await zoomApiClient.get<ZoomWebinarApiResponse>(
        `/webinars/${webinarId}`
      );

      if (response.success) {
        return response.data || null;
      }

      console.error(`Failed to fetch webinar ${webinarId}:`, response.error);
      return null;
    } catch (error) {
      console.error(`Error fetching webinar ${webinarId}:`, error);
      return null;
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
      try {
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
        
        // Ensure registrants is an array before spreading
        if (Array.isArray(registrants)) {
          allRegistrants.push(...registrants);
        }

        hasMore = currentPage < page_count;
        pageNumber++;
      } catch (error) {
        console.error(`Error fetching registrants for webinar ${webinarId}:`, error);
        break;
      }
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
      try {
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
        
        // Ensure participants is an array before processing
        if (Array.isArray(participants)) {
          // Calculate engagement metrics for each participant
          const enhancedParticipants = participants.map((participant: any) => ({
            ...participant,
            engagement_score: this.calculateEngagementScore(participant),
            total_duration: participant.duration || 0,
            join_leave_count: participant.details?.length || 1
          }));

          allParticipants.push(...enhancedParticipants);
        }

        hasMore = !!next_page_token;
        nextPageToken = next_page_token || '';
      } catch (error) {
        console.error(`Error fetching participants for webinar ${webinarId}:`, error);
        break;
      }
    }

    return allParticipants;
  }

  static async getWebinarPolls(webinarId: string) {
    try {
      const response = await zoomApiClient.get(
        `/webinars/${webinarId}/polls`
      );

      if (response.success) {
        return response.data;
      }

      console.error(`Failed to fetch polls for webinar ${webinarId}:`, response.error);
      return null;
    } catch (error) {
      console.error(`Error fetching polls for webinar ${webinarId}:`, error);
      return null;
    }
  }

  static async getWebinarQA(webinarId: string) {
    try {
      const response = await zoomApiClient.get(
        `/report/webinars/${webinarId}/qa`
      );

      if (response.success) {
        return response.data;
      }

      console.error(`Failed to fetch Q&A for webinar ${webinarId}:`, response.error);
      return null;
    } catch (error) {
      console.error(`Error fetching Q&A for webinar ${webinarId}:`, error);
      return null;
    }
  }

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

// Export types for use in other services
export type { ZoomWebinarApiResponse, ListWebinarsOptions, SyncProgress };
