
import { zoomApiClient } from './ZoomApiClient';
import { ApiResponse } from './types';

/**
 * Enhanced service for fetching registrant data from Zoom API
 */
export class ZoomRegistrantService {
  /**
   * Fetch all registrants for a webinar with comprehensive status handling
   */
  static async getAllRegistrants(webinarId: string, options: {
    includeAllStatuses?: boolean;
    occurrenceId?: string;
    pageSize?: number;
  } = {}): Promise<ApiResponse<any[]>> {
    const { includeAllStatuses = true, occurrenceId, pageSize = 300 } = options;
    
    try {
      const allRegistrants: any[] = [];
      const statuses = includeAllStatuses ? ['approved', 'pending', 'denied'] : ['approved'];
      
      // Fetch registrants for each status
      for (const status of statuses) {
        let nextPageToken: string | undefined;
        let hasMore = true;
        
        while (hasMore) {
          const endpoint = occurrenceId 
            ? `/webinars/${webinarId}/registrants?occurrence_id=${occurrenceId}&status=${status}&page_size=${pageSize}${nextPageToken ? `&next_page_token=${nextPageToken}` : ''}`
            : `/webinars/${webinarId}/registrants?status=${status}&page_size=${pageSize}${nextPageToken ? `&next_page_token=${nextPageToken}` : ''}`;
          
          const response = await zoomApiClient.get(endpoint);
          
          if (!response.success) {
            console.error(`Failed to fetch ${status} registrants:`, response.error);
            break;
          }
          
          const registrants = response.data?.registrants || [];
          
          // Add status to each registrant for easier processing
          const statusRegistrants = registrants.map((r: any) => ({
            ...r,
            registration_status: status,
            occurrence_id: occurrenceId || null
          }));
          
          allRegistrants.push(...statusRegistrants);
          
          nextPageToken = response.data?.next_page_token;
          hasMore = !!nextPageToken && registrants.length === pageSize;
        }
      }
      
      return {
        success: true,
        data: allRegistrants,
        statusCode: 200
      };
      
    } catch (error) {
      console.error('Error fetching registrants:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch registrants',
        statusCode: 500,
        retryable: true
      };
    }
  }
  
  /**
   * Fetch registrant details including custom questions
   */
  static async getRegistrantDetails(webinarId: string, registrantId: string): Promise<ApiResponse<any>> {
    try {
      const response = await zoomApiClient.get(`/webinars/${webinarId}/registrants/${registrantId}`);
      return response;
    } catch (error) {
      console.error('Error fetching registrant details:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch registrant details',
        statusCode: 500,
        retryable: true
      };
    }
  }
}
