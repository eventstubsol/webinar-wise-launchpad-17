
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
 * Zoom API registrants response format with modern pagination
 */
interface ZoomRegistrantsResponse {
  page_count?: number; // Legacy field, still present
  page_number?: number; // Legacy field, still present  
  page_size: number;
  total_records: number;
  next_page_token?: string; // Modern pagination token
  registrants: ZoomRegistrantApiResponse[];
}

/**
 * Zoom API registrant response format
 */
interface ZoomRegistrantApiResponse {
  id: string;
  uuid?: string; // The missing field we now support
  email: string;
  first_name?: string;
  last_name?: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  country?: string;
  phone?: string;
  industry?: string;
  org?: string;
  job_title?: string;
  purchasing_time_frame?: string;
  role_in_purchase_process?: string;
  no_of_employees?: string;
  comments?: string;
  custom_questions?: any[];
  registration_time?: string;
  create_time?: string; // Alternative timestamp field
  source_id?: string;
  tracking_source?: string;
  status: string;
  join_url?: string;
  language?: string;
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
 * Participants API comparison result
 */
interface ParticipantsComparisonResult {
  reportEndpoint: {
    count: number;
    data: any[];
    responseTime: number;
    error?: string;
  };
  pastWebinarEndpoint: {
    count: number;
    data: any[];
    responseTime: number;
    error?: string;
  };
  comparison: {
    countDifference: number;
    uniqueToReport: any[];
    uniqueToPastWebinar: any[];
    dataStructureDifferences: string[];
  };
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
            current: `Page ${currentPage} of ${page_count} (${type})`
          });
        }

        hasMore = currentPage < page_count;
        pageNumber++;
      }

      return allWebinars;
    } catch (error) {
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
   * ENHANCED: Get webinar registrants with modern next_page_token pagination
   */
  static async getWebinarRegistrants(
    webinarId: string,
    options: { 
      pageSize?: number; 
      status?: 'pending' | 'approved' | 'denied';
      debugMode?: boolean;
    } = {}
  ): Promise<ZoomRegistrantApiResponse[]> {
    const { pageSize = 300, status = 'approved', debugMode = false } = options;
    const allRegistrants: ZoomRegistrantApiResponse[] = [];
    let nextPageToken = '';
    let hasMore = true;
    let pageCount = 0;

    if (debugMode) {
      console.log(`🔄 ENHANCED REGISTRANTS FETCH: Starting for webinar ${webinarId}`);
      console.log(`  - Page size: ${pageSize} (increased from 100 for efficiency)`);
      console.log(`  - Status filter: ${status}`);
      console.log(`  - Using modern next_page_token pagination`);
    }

    try {
      while (hasMore) {
        pageCount++;
        const params = new URLSearchParams({
          page_size: pageSize.toString(),
          status,
        });

        // Use next_page_token for modern pagination (not page_number)
        if (nextPageToken) {
          params.append('next_page_token', nextPageToken);
        }

        const startTime = Date.now();
        const response = await zoomApiClient.get<ZoomRegistrantsResponse>(
          `/webinars/${webinarId}/registrants?${params}`
        );
        const responseTime = Date.now() - startTime;

        if (debugMode) {
          console.log(`📄 REGISTRANTS API PAGE ${pageCount}: Response time ${responseTime}ms`);
        }

        if (!response.success || !response.data) {
          const errorMsg = `Failed to fetch registrants for webinar ${webinarId}: ${response.error}`;
          console.error(`❌ ${errorMsg}`);
          throw new Error(errorMsg);
        }

        const { registrants, next_page_token, total_records } = response.data;
        
        if (registrants && registrants.length > 0) {
          // Process and enhance registrant data
          const processedRegistrants = registrants.map((registrant, index) => {
            const processed = this.processRegistrantData(registrant);
            
            if (debugMode && index === 0 && pageCount === 1) {
              console.log(`📋 SAMPLE REGISTRANT DATA:`, {
                id: processed.id,
                uuid: processed.uuid,
                email: processed.email,
                registration_time: processed.registration_time,
                create_time: processed.create_time,
                status: processed.status,
                availableFields: Object.keys(processed)
              });
            }
            
            return processed;
          });

          allRegistrants.push(...processedRegistrants);

          if (debugMode) {
            console.log(`📊 PAGE ${pageCount} PROCESSED: ${processedRegistrants.length} registrants`);
            console.log(`📈 TOTAL SO FAR: ${allRegistrants.length} registrants`);
          }
        }

        // Check for more pages using next_page_token (modern approach)
        hasMore = !!next_page_token;
        nextPageToken = next_page_token || '';

        if (debugMode) {
          console.log(`🔄 PAGINATION STATUS: hasMore=${hasMore}, nextToken=${nextPageToken ? 'present' : 'none'}`);
        }
      }

      if (debugMode) {
        console.log(`✅ REGISTRANTS FETCH COMPLETE: ${allRegistrants.length} total registrants in ${pageCount} pages`);
      }

      return allRegistrants;
    } catch (error) {
      console.error(`💥 REGISTRANTS FETCH ERROR for webinar ${webinarId}:`, error);
      throw error;
    }
  }

  /**
   * NEW: Process and normalize registrant data for consistency
   */
  private static processRegistrantData(registrant: ZoomRegistrantApiResponse): ZoomRegistrantApiResponse {
    // Normalize timestamp fields - prefer registration_time over create_time
    const normalizedRegistrant = {
      ...registrant,
      registration_time: registrant.registration_time || registrant.create_time || new Date().toISOString(),
      // Ensure uuid field is captured (was missing from DB schema)
      uuid: registrant.uuid || null,
    };

    // Clean up empty string values to null for better database consistency
    Object.keys(normalizedRegistrant).forEach(key => {
      if (normalizedRegistrant[key as keyof ZoomRegistrantApiResponse] === '') {
        (normalizedRegistrant as any)[key] = null;
      }
    });

    return normalizedRegistrant;
  }

  /**
   * Get webinar participants using the existing /report/ endpoint
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
   * NEW: Get webinar participants using the alternative /past_webinars/ endpoint
   */
  static async getWebinarParticipantsAlternative(
    webinarId: string,
    options: { pageSize?: number; debugMode?: boolean } = {}
  ) {
    const { pageSize = 300, debugMode = false } = options;
    const allParticipants = [];
    let pageNumber = 1;
    let hasMore = true;

    if (debugMode) {
      console.log(`Starting alternative participants fetch for webinar ${webinarId} with pageSize=${pageSize}`);
    }

    while (hasMore) {
      const params = new URLSearchParams({
        page_size: pageSize.toString(),
        page_number: pageNumber.toString(),
      });

      const startTime = Date.now();
      const response = await zoomApiClient.get(
        `/past_webinars/${webinarId}/participants?${params}`
      );
      const responseTime = Date.now() - startTime;

      if (debugMode) {
        console.log(`Alternative API page ${pageNumber} response time: ${responseTime}ms`);
      }

      if (!response.success || !response.data) {
        console.error(`Failed to fetch participants (alternative) for webinar ${webinarId}:`, response.error);
        break;
      }

      const { participants, page_count, page_number: currentPage, total_records } = response.data;
      
      // Calculate engagement metrics for each participant
      const enhancedParticipants = participants.map((participant: any) => ({
        ...participant,
        engagement_score: this.calculateEngagementScore(participant),
        total_duration: participant.duration || 0,
        join_leave_count: participant.details?.length || 1,
        _source: 'past_webinars_api'
      }));

      allParticipants.push(...enhancedParticipants);

      if (debugMode) {
        console.log(`Alternative API page ${pageNumber}: ${participants.length} participants, total so far: ${allParticipants.length}`);
      }

      hasMore = currentPage < page_count;
      pageNumber++;
    }

    if (debugMode) {
      console.log(`Alternative API total participants fetched: ${allParticipants.length}`);
    }

    return allParticipants;
  }

  /**
   * NEW: Compare both participants API endpoints
   */
  static async compareParticipantsEndpoints(
    webinarId: string,
    options: { pageSize?: number; debugMode?: boolean } = {}
  ): Promise<ParticipantsComparisonResult> {
    const { pageSize = 300, debugMode = false } = options;

    console.log(`Comparing participants endpoints for webinar ${webinarId}`);

    // Test report endpoint
    let reportResult = {
      count: 0,
      data: [],
      responseTime: 0,
      error: undefined as string | undefined
    };

    try {
      const reportStartTime = Date.now();
      reportResult.data = await this.getWebinarParticipants(webinarId, { pageSize: 100 });
      reportResult.responseTime = Date.now() - reportStartTime;
      reportResult.count = reportResult.data.length;

      if (debugMode) {
        console.log(`Report endpoint: ${reportResult.count} participants in ${reportResult.responseTime}ms`);
      }
    } catch (error) {
      reportResult.error = error instanceof Error ? error.message : 'Unknown error';
      console.error('Report endpoint error:', reportResult.error);
    }

    // Test past_webinars endpoint
    let pastWebinarResult = {
      count: 0,
      data: [],
      responseTime: 0,
      error: undefined as string | undefined
    };

    try {
      const pastStartTime = Date.now();
      pastWebinarResult.data = await this.getWebinarParticipantsAlternative(webinarId, { pageSize, debugMode });
      pastWebinarResult.responseTime = Date.now() - pastStartTime;
      pastWebinarResult.count = pastWebinarResult.data.length;

      if (debugMode) {
        console.log(`Past webinars endpoint: ${pastWebinarResult.count} participants in ${pastWebinarResult.responseTime}ms`);
      }
    } catch (error) {
      pastWebinarResult.error = error instanceof Error ? error.message : 'Unknown error';
      console.error('Past webinars endpoint error:', pastWebinarResult.error);
    }

    // Compare results
    const comparison = this.compareParticipantData(reportResult.data, pastWebinarResult.data, debugMode);

    return {
      reportEndpoint: reportResult,
      pastWebinarEndpoint: pastWebinarResult,
      comparison
    };
  }

  /**
   * NEW: Compare participant data from both endpoints
   */
  private static compareParticipantData(reportData: any[], pastWebinarData: any[], debugMode = false) {
    const countDifference = pastWebinarData.length - reportData.length;
    
    // Create sets of participant IDs for comparison
    const reportIds = new Set(reportData.map(p => p.id || p.participant_id));
    const pastWebinarIds = new Set(pastWebinarData.map(p => p.id || p.participant_id));

    const uniqueToReport = reportData.filter(p => !pastWebinarIds.has(p.id || p.participant_id));
    const uniqueToPastWebinar = pastWebinarData.filter(p => !reportIds.has(p.id || p.participant_id));

    // Analyze data structure differences
    const dataStructureDifferences = [];
    
    if (reportData.length > 0 && pastWebinarData.length > 0) {
      const reportFields = Object.keys(reportData[0]);
      const pastWebinarFields = Object.keys(pastWebinarData[0]);
      
      const reportOnlyFields = reportFields.filter(f => !pastWebinarFields.includes(f));
      const pastWebinarOnlyFields = pastWebinarFields.filter(f => !reportFields.includes(f));
      
      if (reportOnlyFields.length > 0) {
        dataStructureDifferences.push(`Report endpoint has exclusive fields: ${reportOnlyFields.join(', ')}`);
      }
      
      if (pastWebinarOnlyFields.length > 0) {
        dataStructureDifferences.push(`Past webinars endpoint has exclusive fields: ${pastWebinarOnlyFields.join(', ')}`);
      }
    }

    if (debugMode) {
      console.log('Comparison results:', {
        countDifference,
        uniqueToReportCount: uniqueToReport.length,
        uniqueToPastWebinarCount: uniqueToPastWebinar.length,
        dataStructureDifferences
      });
    }

    return {
      countDifference,
      uniqueToReport,
      uniqueToPastWebinar,
      dataStructureDifferences
    };
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
export type { ZoomWebinarApiResponse, ZoomRegistrantApiResponse, ListWebinarsOptions, SyncProgress, ParticipantsComparisonResult };
