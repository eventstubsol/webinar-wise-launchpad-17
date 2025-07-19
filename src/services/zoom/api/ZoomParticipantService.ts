
import { zoomApiClient } from './ZoomApiClient';
import { ApiResponse } from './types';

/**
 * Enhanced service for fetching participant data from Zoom API
 */
export class ZoomParticipantService {
  /**
   * Fetch participants using multiple endpoints for comprehensive data
   */
  static async getAllParticipants(webinarId: string, options: {
    includeDetailedReport?: boolean;
    occurrenceId?: string;
    pageSize?: number;
  } = {}): Promise<ApiResponse<any[]>> {
    const { includeDetailedReport = true, occurrenceId, pageSize = 300 } = options;
    
    try {
      const allParticipants: any[] = [];
      
      // Strategy 1: Try detailed participants report first (for past webinars)
      if (includeDetailedReport) {
        const detailedParticipants = await this.getDetailedParticipantsReport(webinarId, { occurrenceId, pageSize });
        if (detailedParticipants.success && detailedParticipants.data && detailedParticipants.data.length > 0) {
          return detailedParticipants;
        }
      }
      
      // Strategy 2: Fallback to basic participants endpoint
      const basicParticipants = await this.getBasicParticipants(webinarId, { occurrenceId, pageSize });
      if (basicParticipants.success) {
        return basicParticipants;
      }
      
      return {
        success: true,
        data: [],
        statusCode: 200
      };
      
    } catch (error) {
      console.error('Error fetching participants:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch participants',
        statusCode: 500,
        retryable: true
      };
    }
  }
  
  /**
   * Fetch detailed participants report (for past webinars)
   */
  private static async getDetailedParticipantsReport(webinarId: string, options: {
    occurrenceId?: string;
    pageSize?: number;
  }): Promise<ApiResponse<any[]>> {
    const { occurrenceId, pageSize = 300 } = options;
    
    try {
      const allParticipants: any[] = [];
      let nextPageToken: string | undefined;
      let hasMore = true;
      
      while (hasMore) {
        const endpoint = occurrenceId
          ? `/report/webinars/${webinarId}/participants?occurrence_id=${occurrenceId}&page_size=${pageSize}${nextPageToken ? `&next_page_token=${nextPageToken}` : ''}`
          : `/report/webinars/${webinarId}/participants?page_size=${pageSize}${nextPageToken ? `&next_page_token=${nextPageToken}` : ''}`;
        
        const response = await zoomApiClient.get(endpoint);
        
        if (!response.success) {
          return response;
        }
        
        const participants = response.data?.participants || [];
        
        // Enhance participant data with source info
        const enhancedParticipants = participants.map((p: any) => ({
          ...p,
          data_source: 'detailed_report',
          occurrence_id: occurrenceId || null,
          fetched_at: new Date().toISOString()
        }));
        
        allParticipants.push(...enhancedParticipants);
        
        nextPageToken = response.data?.next_page_token;
        hasMore = !!nextPageToken && participants.length === pageSize;
      }
      
      return {
        success: true,
        data: allParticipants,
        statusCode: 200
      };
      
    } catch (error) {
      console.error('Error fetching detailed participants report:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch detailed participants report',
        statusCode: 500,
        retryable: true
      };
    }
  }
  
  /**
   * Fetch basic participants (for live or recent webinars)
   */
  private static async getBasicParticipants(webinarId: string, options: {
    occurrenceId?: string;
    pageSize?: number;
  }): Promise<ApiResponse<any[]>> {
    const { occurrenceId, pageSize = 300 } = options;
    
    try {
      const allParticipants: any[] = [];
      let nextPageToken: string | undefined;
      let hasMore = true;
      
      while (hasMore) {
        const endpoint = occurrenceId
          ? `/past_webinars/${webinarId}/participants?occurrence_id=${occurrenceId}&page_size=${pageSize}${nextPageToken ? `&next_page_token=${nextPageToken}` : ''}`
          : `/past_webinars/${webinarId}/participants?page_size=${pageSize}${nextPageToken ? `&next_page_token=${nextPageToken}` : ''}`;
        
        const response = await zoomApiClient.get(endpoint);
        
        if (!response.success) {
          return response;
        }
        
        const participants = response.data?.participants || [];
        
        // Enhance participant data with source info
        const enhancedParticipants = participants.map((p: any) => ({
          ...p,
          data_source: 'basic_endpoint',
          occurrence_id: occurrenceId || null,
          fetched_at: new Date().toISOString()
        }));
        
        allParticipants.push(...enhancedParticipants);
        
        nextPageToken = response.data?.next_page_token;
        hasMore = !!nextPageToken && participants.length === pageSize;
      }
      
      return {
        success: true,
        data: allParticipants,
        statusCode: 200
      };
      
    } catch (error) {
      console.error('Error fetching basic participants:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch basic participants',
        statusCode: 500,
        retryable: true
      };
    }
  }
  
  /**
   * Get real-time participant data for live webinars
   */
  static async getLiveParticipants(webinarId: string): Promise<ApiResponse<any[]>> {
    try {
      const response = await zoomApiClient.get(`/webinars/${webinarId}/participants`);
      
      if (response.success) {
        const participants = response.data?.participants || [];
        const enhancedParticipants = participants.map((p: any) => ({
          ...p,
          data_source: 'live_endpoint',
          is_live_data: true,
          fetched_at: new Date().toISOString()
        }));
        
        return {
          success: true,
          data: enhancedParticipants,
          statusCode: 200
        };
      }
      
      return response;
      
    } catch (error) {
      console.error('Error fetching live participants:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch live participants',
        statusCode: 500,
        retryable: true
      };
    }
  }
}
