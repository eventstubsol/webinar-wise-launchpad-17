
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

      // Safely merge and deduplicate webinars - ensure both are arrays
      const allWebinars = [
        ...(Array.isArray(pastWebinars) ? pastWebinars : []),
        ...(Array.isArray(upcomingWebinars) ? upcomingWebinars : [])
      ];
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
          console.error('Failed to fetch webinars:', response.error);
          // Return what we have so far instead of throwing
          return allWebinars;
        }

        const { webinars, page_count, page_number: currentPage, total_records } = response.data;
        
        // Ensure webinars is an array before spreading
        if (Array.isArray(webinars)) {
          allWebinars.push(...webinars);
        } else {
          console.warn('Webinars response is not an array:', webinars);
        }

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
      }

      return allWebinars;
    } catch (error) {
      console.error('Error in listWebinars:', error);
      // Return what we have so far instead of throwing
      return allWebinars;
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
