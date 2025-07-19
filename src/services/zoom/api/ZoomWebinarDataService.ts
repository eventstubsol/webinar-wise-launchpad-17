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
  dayRange?: number;
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
 * Enhanced API response analysis
 */
interface ApiResponseAnalysis {
  hasData: boolean;
  dataType: string;
  isAuthenticated: boolean;
  hasPermissions: boolean;
  errorCategory: 'NONE' | 'AUTH' | 'PERMISSIONS' | 'RATE_LIMIT' | 'NO_DATA' | 'API_ERROR';
  userMessage: string;
  technicalDetails: Record<string, any>;
}

/**
 * Service for fetching webinar data from Zoom API
 */
export class ZoomWebinarDataService {
  /**
   * Analyze API response for detailed diagnostics
   */
  private static analyzeApiResponse(response: any, endpoint: string): ApiResponseAnalysis {
    const analysis: ApiResponseAnalysis = {
      hasData: false,
      dataType: typeof response,
      isAuthenticated: true,
      hasPermissions: true,
      errorCategory: 'NONE',
      userMessage: '',
      technicalDetails: {}
    };

    // Check if response exists
    if (!response) {
      analysis.errorCategory = 'API_ERROR';
      analysis.userMessage = 'No response received from Zoom API';
      analysis.technicalDetails = { endpoint, response: null };
      return analysis;
    }

    // Authentication check
    if (response.error && (response.error.includes('401') || response.error.includes('unauthorized'))) {
      analysis.isAuthenticated = false;
      analysis.errorCategory = 'AUTH';
      analysis.userMessage = 'Zoom authentication has expired. Please reconnect your account.';
      analysis.technicalDetails = { endpoint, error: response.error };
      return analysis;
    }

    // Permissions check
    if (response.error && (response.error.includes('403') || response.error.includes('forbidden'))) {
      analysis.hasPermissions = false;
      analysis.errorCategory = 'PERMISSIONS';
      analysis.userMessage = 'Your Zoom account does not have permission to access webinar data. Please check your Zoom app scopes.';
      analysis.technicalDetails = { endpoint, error: response.error };
      return analysis;
    }

    // Rate limit check
    if (response.error && (response.error.includes('429') || response.error.includes('rate limit'))) {
      analysis.errorCategory = 'RATE_LIMIT';
      analysis.userMessage = 'Zoom API rate limit exceeded. Please try again in a few minutes.';
      analysis.technicalDetails = { endpoint, error: response.error };
      return analysis;
    }

    // Success response analysis
    if (response.success && response.data) {
      const data = response.data;
      
      // Check if webinars field exists and is an array
      if (data.webinars !== undefined) {
        if (Array.isArray(data.webinars)) {
          analysis.hasData = data.webinars.length > 0;
          analysis.dataType = 'array';
          
          if (data.webinars.length === 0) {
            analysis.errorCategory = 'NO_DATA';
            analysis.userMessage = `No webinars found for the specified date range. Check if you have webinars in your Zoom account.`;
          } else {
            analysis.userMessage = `Found ${data.webinars.length} webinars to sync.`;
          }
        } else {
          analysis.errorCategory = 'API_ERROR';
          analysis.userMessage = 'Unexpected response format from Zoom API (webinars is not an array).';
          analysis.dataType = typeof data.webinars;
        }
      } else {
        analysis.errorCategory = 'API_ERROR';
        analysis.userMessage = 'Zoom API response is missing webinars data. This might be a permissions issue.';
        analysis.dataType = 'undefined';
      }

      analysis.technicalDetails = {
        endpoint,
        totalRecords: data.total_records,
        pageCount: data.page_count,
        pageNumber: data.page_number,
        webinarsFieldType: typeof data.webinars,
        webinarsLength: Array.isArray(data.webinars) ? data.webinars.length : 'N/A',
        responseKeys: Object.keys(data),
        hasWebinarsField: 'webinars' in data
      };
    } else {
      analysis.errorCategory = 'API_ERROR';
      analysis.userMessage = 'Invalid response from Zoom API.';
      analysis.technicalDetails = { 
        endpoint, 
        hasSuccess: 'success' in response,
        hasData: 'data' in response,
        responseKeys: Object.keys(response)
      };
    }

    return analysis;
  }

  /**
   * Enhanced logging for API responses with user-friendly messages
   */
  private static logApiResponseAnalysis(analysis: ApiResponseAnalysis, context?: string) {
    const logPrefix = context ? `[${context}]` : '';
    
    console.log(`${logPrefix} 🔍 API RESPONSE ANALYSIS:`);
    console.log(`  📊 Category: ${analysis.errorCategory}`);
    console.log(`  👤 User Message: ${analysis.userMessage}`);
    console.log(`  🔧 Technical Details:`, analysis.technicalDetails);
    
    // Color-coded logging based on category
    switch (analysis.errorCategory) {
      case 'NONE':
        console.log(`  ✅ Status: Success`);
        break;
      case 'NO_DATA':
        console.log(`  ℹ️ Status: No data found (not an error)`);
        break;
      case 'AUTH':
        console.error(`  🔒 Status: Authentication failed`);
        break;
      case 'PERMISSIONS':
        console.error(`  🚫 Status: Permission denied`);
        break;
      case 'RATE_LIMIT':
        console.warn(`  ⏳ Status: Rate limited`);
        break;
      case 'API_ERROR':
        console.error(`  ❌ Status: API error`);
        break;
    }
  }

  /**
   * Test API connection and permissions
   */
  static async testApiConnection(): Promise<ApiResponseAnalysis> {
    try {
      console.log('🔍 TESTING API CONNECTION...');
      
      // Test basic user info endpoint first
      const userResponse = await zoomApiClient.get('/users/me');
      const userAnalysis = this.analyzeApiResponse(userResponse, '/users/me');
      
      if (userAnalysis.errorCategory !== 'NONE') {
        console.error('❌ USER API TEST FAILED:', userAnalysis.userMessage);
        return userAnalysis;
      }
      
      console.log('✅ USER API TEST PASSED');
      
      // Test webinar list endpoint
      const webinarResponse = await zoomApiClient.get('/users/me/webinars?page_size=1&type=past');
      const webinarAnalysis = this.analyzeApiResponse(webinarResponse, '/users/me/webinars');
      
      console.log('📊 WEBINAR API TEST RESULT:', webinarAnalysis.userMessage);
      return webinarAnalysis;
      
    } catch (error) {
      console.error('❌ API CONNECTION TEST FAILED:', error);
      return {
        hasData: false,
        dataType: 'error',
        isAuthenticated: false,
        hasPermissions: false,
        errorCategory: 'API_ERROR',
        userMessage: `Connection test failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        technicalDetails: { error: error instanceof Error ? error.message : error }
      };
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

    console.log('🔄 EXTENDED RANGE SYNC: Starting webinar fetch', {
      dayRange,
      pastDate: pastDate.toISOString(),
      futureDate: futureDate.toISOString(),
      pageSize
    });

    try {
      // Test API connection first
      const connectionTest = await this.testApiConnection();
      if (connectionTest.errorCategory === 'AUTH' || connectionTest.errorCategory === 'PERMISSIONS') {
        throw new Error(connectionTest.userMessage);
      }

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

      // Safely merge and deduplicate webinars
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
          current: uniqueWebinars.length > 0 
            ? `Found ${uniqueWebinars.length} total webinars`
            : 'No webinars found in the specified date range'
        });
      }

      return uniqueWebinars;
    } catch (error) {
      console.error('❌ EXTENDED RANGE SYNC ERROR:', error);
      
      if (onProgress) {
        onProgress({
          total: 2,
          processed: 1,
          failed: 1,
          current: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
        });
      }
      
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
          
          // Enhanced response analysis
          const analysis = this.analyzeApiResponse(response, endpoint);
          this.logApiResponseAnalysis(analysis, context);

          // Handle different error categories
          if (analysis.errorCategory === 'AUTH') {
            throw new Error('Authentication failed: ' + analysis.userMessage);
          } else if (analysis.errorCategory === 'PERMISSIONS') {
            throw new Error('Permission denied: ' + analysis.userMessage);
          } else if (analysis.errorCategory === 'RATE_LIMIT') {
            console.warn(`⏳ ${context}: Rate limited, waiting before retry...`);
            await new Promise(resolve => setTimeout(resolve, 60000)); // Wait 1 minute
            continue;
          } else if (analysis.errorCategory === 'API_ERROR') {
            consecutiveErrors++;
            console.error(`❌ ${context}: API Error (${consecutiveErrors}/${maxConsecutiveErrors}):`, analysis.userMessage);
            
            if (consecutiveErrors >= maxConsecutiveErrors) {
              throw new Error(`API failed after ${maxConsecutiveErrors} attempts: ${analysis.userMessage}`);
            }
            
            // Wait before retry
            await new Promise(resolve => setTimeout(resolve, 1000 * consecutiveErrors));
            continue;
          } else if (analysis.errorCategory === 'NO_DATA') {
            console.log(`ℹ️ ${context}: No webinars found for page ${pageNumber}`);
            break; // No more data to fetch
          }

          // Process successful response
          if (response.success && response.data && Array.isArray(response.data.webinars)) {
            const { webinars, page_count, page_number: currentPage, total_records } = response.data;
            
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
          } else {
            // This should be caught by the analysis above, but just in case
            console.warn(`⚠️ ${context}: Unexpected response structure for page ${pageNumber}`);
            break;
          }

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
      
      // Return what we have so far instead of throwing
      if (allWebinars.length > 0) {
        console.log(`🔄 ${context}: Returning partial results (${allWebinars.length} webinars) despite error`);
        return allWebinars;
      }
      
      throw error;
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
        
        if (Array.isArray(participants)) {
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
export type { ZoomWebinarApiResponse, ListWebinarsOptions, SyncProgress, ApiResponseAnalysis };
