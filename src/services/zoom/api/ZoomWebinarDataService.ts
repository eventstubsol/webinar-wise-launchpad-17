import { zoomApiClient, ApiResponse, RequestOptions } from './ZoomApiClient';
import { ZoomRegistrantService } from './ZoomRegistrantService';
import { ZoomParticipantService } from './ZoomParticipantService';
import { EnhancedDataTransformers } from '../utils/transformers/enhancedDataTransformers';
import { DataValidationService } from '../validation/DataValidationService';

export interface ZoomWebinarApiResponse {
  id: string;
  uuid: string;
  host_id: string;
  topic: string;
  start_time: string;
  duration: number;
  join_url: string;
  [key: string]: any;
}

export interface ListWebinarsOptions {
  userId: string;
  type?: 'scheduled' | 'past' | 'upcoming';
  pageSize?: number;
  pageNumber?: number;
  from?: string;
  to?: string;
}

export interface SyncProgress {
  total: number;
  processed: number;
  failed: number;
  current: string;
}

export class ZoomWebinarDataService {
  /**
   * List webinars for a user with pagination and date filtering
   */
  static async listWebinars(
    userId: string,
    options: ListWebinarsOptions = {},
    onProgress?: (progress: SyncProgress) => void
  ): Promise<ZoomWebinarApiResponse[]> {
    try {
      let allWebinars: ZoomWebinarApiResponse[] = [];
      let pageNumber = options.pageNumber || 1;
      let hasMore = true;

      while (hasMore) {
        const params: any = {
          page_size: options.pageSize || 300,
          page_number: pageNumber,
          type: options.type || 'scheduled'
        };

        if (options.from) params.from = options.from;
        if (options.to) params.to = options.to;

        const queryParams = new URLSearchParams(params).toString();
        const endpoint = `/users/${userId}/webinars?${queryParams}`;

        const response = await zoomApiClient.get(endpoint);

        if (!response.success) {
          console.error('Failed to list webinars:', response.error);
          break;
        }

        const webinars = response.data?.webinars || [];
        allWebinars = allWebinars.concat(webinars);

        if (onProgress) {
          onProgress({
            total: response.data?.total_records || 0,
            processed: allWebinars.length,
            failed: 0,
            current: `Page ${pageNumber}`
          });
        }

        hasMore = webinars.length === params.page_size && response.data?.page_count > pageNumber;
        pageNumber++;
      }

      return allWebinars;
    } catch (error) {
      console.error('Error listing webinars:', error);
      throw error;
    }
  }

  /**
   * List webinars with extended date range (90 days past + upcoming)
   */
  static async listWebinarsWithExtendedRange(
    userId: string,
    options: { dayRange?: number; pageSize?: number } = {},
    onProgress?: (progress: any) => void
  ): Promise<ZoomWebinarApiResponse[]> {
    const { dayRange = 90, pageSize = 300 } = options;
    const now = new Date();
    const pastDate = new Date(now.getTime() - dayRange * 24 * 60 * 60 * 1000);
    const futureDate = new Date(now.getTime() + dayRange * 24 * 60 * 60 * 1000);

    const pastOptions = {
      userId: userId,
      type: 'past',
      pageSize: pageSize,
      from: pastDate.toISOString().split('T')[0],
      to: now.toISOString().split('T')[0]
    };

    const upcomingOptions = {
      userId: userId,
      type: 'upcoming',
      pageSize: pageSize,
      from: now.toISOString().split('T')[0],
      to: futureDate.toISOString().split('T')[0]
    };

    try {
      const [pastWebinars, upcomingWebinars] = await Promise.all([
        ZoomWebinarDataService.listWebinars(userId, pastOptions, (progress) => {
          if (onProgress) {
            onProgress({
              ...progress,
              phase: 'past'
            });
          }
        }),
        ZoomWebinarDataService.listWebinars(userId, upcomingOptions, (progress) => {
          if (onProgress) {
            onProgress({
              ...progress,
              phase: 'upcoming'
            });
          }
        })
      ]);

      const allWebinars = pastWebinars.concat(upcomingWebinars);
      return allWebinars;
    } catch (error) {
      console.error('Error listing webinars with extended range:', error);
      throw error;
    }
  }

  /**
   * Get detailed information about a specific webinar
   */
  static async getWebinar(webinarId: string): Promise<ZoomWebinarApiResponse> {
    try {
      const response = await zoomApiClient.get(`/webinars/${webinarId}`);

      if (!response.success) {
        throw new Error(response.error || 'Failed to get webinar');
      }

      return response.data;
    } catch (error) {
      console.error('Error getting webinar:', error);
      throw error;
    }
  }

  /**
   * Get webinar registrants with pagination support
   */
  static async getWebinarRegistrants(webinarId: string, options: any = {}): Promise<any[]> {
    try {
      let allRegistrants: any[] = [];
      let nextPageToken: string | undefined;
      let hasMore = true;

      while (hasMore) {
        const params: any = {
          page_size: options.page_size || 300
        };

        if (nextPageToken) {
          params.next_page_token = nextPageToken;
        }

        const queryParams = new URLSearchParams(params).toString();
        const endpoint = `/webinars/${webinarId}/registrants?${queryParams}`;

        const response = await zoomApiClient.get(endpoint);

        if (!response.success) {
          console.error('Failed to get webinar registrants:', response.error);
          break;
        }

        const registrants = response.data?.registrants || [];
        allRegistrants = allRegistrants.concat(registrants);

        nextPageToken = response.data?.next_page_token;
        hasMore = !!nextPageToken;
      }

      return allRegistrants;
    } catch (error) {
      console.error('Error getting webinar registrants:', error);
      throw error;
    }
  }

  /**
   * Get webinar participants with engagement metrics
   */
  static async getWebinarParticipants(webinarId: string, options: any = {}): Promise<any[]> {
    try {
      let allParticipants: any[] = [];
      let nextPageToken: string | undefined;
      let hasMore = true;

      while (hasMore) {
        const params: any = {
          page_size: options.page_size || 300
        };

        if (nextPageToken) {
          params.next_page_token = nextPageToken;
        }

        const queryParams = new URLSearchParams(params).toString();
        const endpoint = `/report/webinars/${webinarId}/participants?${queryParams}`;

        const response = await zoomApiClient.get(endpoint);

        if (!response.success) {
          console.error('Failed to get webinar participants:', response.error);
          break;
        }

        const participants = response.data?.participants || [];
        allParticipants = allParticipants.concat(participants);

        nextPageToken = response.data?.next_page_token;
        hasMore = !!nextPageToken;
      }

      return allParticipants;
    } catch (error) {
      console.error('Error getting webinar participants:', error);
      throw error;
    }
  }

  /**
   * Get webinar polls
   */
  static async getWebinarPolls(webinarId: string): Promise<any[]> {
    try {
      const response = await zoomApiClient.get(`/webinars/${webinarId}/polls`);

      if (!response.success) {
        console.error('Failed to get webinar polls:', response.error);
        return [];
      }

      return response.data?.polls || [];
    } catch (error) {
      console.error('Error getting webinar polls:', error);
      return [];
    }
  }

  /**
   * Get webinar Q&A
   */
  static async getWebinarQA(webinarId: string): Promise<any[]> {
    try {
      const response = await zoomApiClient.get(`/webinars/${webinarId}/qa`);

      if (!response.success) {
        console.error('Failed to get webinar Q&A:', response.error);
        return [];
      }

      return response.data?.questions || [];
    } catch (error) {
      console.error('Error getting webinar Q&A:', error);
      return [];
    }
  }

  /**
   * Enhanced method to get webinar registrants with comprehensive data
   */
  static async getWebinarRegistrantsEnhanced(webinarId: string, options: {
    includeAllStatuses?: boolean;
    occurrenceId?: string;
    validate?: boolean;
  } = {}): Promise<any> {
    const { includeAllStatuses = true, occurrenceId, validate = true } = options;
    
    try {
      console.log(`Fetching enhanced registrants for webinar ${webinarId}`);
      
      const response = await ZoomRegistrantService.getAllRegistrants(webinarId, {
        includeAllStatuses,
        occurrenceId
      });
      
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch registrants');
      }
      
      let registrants = response.data || [];
      
      // Apply data validation if requested
      if (validate && registrants.length > 0) {
        const validation = DataValidationService.validateRegistrantData(registrants);
        registrants = validation.validatedData;
        
        if (validation.issues.length > 0) {
          console.warn('Registrant data validation issues:', validation.issues);
        }
        
        console.log(`Registrant data completeness: ${validation.completeness}%`);
      }
      
      console.log(`Successfully fetched ${registrants.length} enhanced registrants`);
      return registrants;
      
    } catch (error) {
      console.error('Error fetching enhanced registrants:', error);
      throw error;
    }
  }
  
  /**
   * Enhanced method to get webinar participants with comprehensive engagement data
   */
  static async getWebinarParticipantsEnhanced(webinarId: string, options: {
    includeDetailedReport?: boolean;
    occurrenceId?: string;
    validate?: boolean;
  } = {}): Promise<any> {
    const { includeDetailedReport = true, occurrenceId, validate = true } = options;
    
    try {
      console.log(`Fetching enhanced participants for webinar ${webinarId}`);
      
      const response = await ZoomParticipantService.getAllParticipants(webinarId, {
        includeDetailedReport,
        occurrenceId
      });
      
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch participants');
      }
      
      let participants = response.data || [];
      
      // Apply data validation if requested
      if (validate && participants.length > 0) {
        const validation = DataValidationService.validateParticipantData(participants);
        participants = validation.validatedData;
        
        if (validation.anomalies.length > 0) {
          console.warn('Participant data validation anomalies:', validation.anomalies);
        }
        
        if (validation.duplicates.length > 0) {
          console.warn(`Found ${validation.duplicates.length} duplicate participants`);
        }
      }
      
      console.log(`Successfully fetched ${participants.length} enhanced participants`);
      return participants;
      
    } catch (error) {
      console.error('Error fetching enhanced participants:', error);
      throw error;
    }
  }
  
  /**
   * Get comprehensive webinar data with registrants, participants, and validation
   */
  static async getComprehensiveWebinarData(webinarId: string, options: {
    includeRegistrants?: boolean;
    includeParticipants?: boolean;
    includeValidation?: boolean;
    occurrenceId?: string;
  } = {}): Promise<{
    webinar: any;
    registrants: any[];
    participants: any[];
    validation?: any;
  }> {
    const {
      includeRegistrants = true,
      includeParticipants = true,
      includeValidation = true,
      occurrenceId
    } = options;
    
    try {
      console.log(`Fetching comprehensive data for webinar ${webinarId}`);
      
      // Fetch webinar details
      const webinar = await this.getWebinar(webinarId);
      
      // Fetch registrants and participants in parallel
      const [registrants, participants] = await Promise.all([
        includeRegistrants 
          ? this.getWebinarRegistrantsEnhanced(webinarId, { occurrenceId, validate: false })
          : Promise.resolve([]),
        includeParticipants 
          ? this.getWebinarParticipantsEnhanced(webinarId, { occurrenceId, validate: false })
          : Promise.resolve([])
      ]);
      
      let validation = null;
      
      // Generate comprehensive validation report
      if (includeValidation && (registrants.length > 0 || participants.length > 0)) {
        validation = DataValidationService.generateDataQualityReport(registrants, participants);
        console.log(`Data quality score: ${validation.overall_score}/100`);
      }
      
      return {
        webinar,
        registrants,
        participants,
        validation
      };
      
    } catch (error) {
      console.error('Error fetching comprehensive webinar data:', error);
      throw error;
    }
  }
}
