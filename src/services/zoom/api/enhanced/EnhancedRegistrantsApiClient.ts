
/**
 * Enhanced Zoom API client for 100% compliant webinar registrants endpoint
 */

import { performanceMonitor } from '../../utils/PerformanceMonitoringService';
import { EnhancedPaginationHandler, PaginationParams } from './EnhancedPaginationHandler';
import { PaginationTokenService } from '../../utils/PaginationTokenService';

export interface ZoomRegistrantsQueryParams extends PaginationParams {
  occurrence_id?: string;
  status?: 'pending' | 'approved' | 'denied';
  tracking_source_id?: string;
}

export interface ZoomRegistrantResponse {
  id: string;
  email: string;
  first_name: string;
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
  custom_questions?: Array<{
    title: string;
    value: string;
  }>;
  status: 'approved' | 'denied' | 'pending';
  create_time?: string;
  join_url?: string;
}

export interface ZoomRegistrantsListResponse {
  registrants: ZoomRegistrantResponse[];
  pagination: {
    next_page_token?: string;
    page_count: number;
    page_number: number;
    page_size: number;
    total_records: number;
    has_more: boolean;
  };
  warnings?: string[];
}

export class EnhancedRegistrantsApiClient {
  constructor(
    private accessToken: string,
    private userId: string,
    private connectionId?: string
  ) {}

  /**
   * Get webinar registrants with full Zoom API compliance and enhanced pagination
   */
  async getWebinarRegistrants(
    webinarId: string,
    params: ZoomRegistrantsQueryParams = {}
  ): Promise<ZoomRegistrantsListResponse> {
    return performanceMonitor.measureOperation(
      'get_webinar_registrants_enhanced',
      `/webinars/${webinarId}/registrants`,
      'GET',
      async () => {
        // Validate pagination parameters
        const validationErrors = EnhancedPaginationHandler.validatePaginationParams(params);
        if (validationErrors.length > 0) {
          throw new Error(`Invalid pagination parameters: ${validationErrors.join(', ')}`);
        }

        // Process pagination parameters and get warnings
        const { processedParams, warnings } = await EnhancedPaginationHandler.processPaginationParams(
          params,
          this.userId,
          webinarId
        );

        // Build query parameters for Zoom API
        const queryParams = new URLSearchParams();
        
        // Add pagination parameters
        if (processedParams.page_size !== undefined) {
          queryParams.append('page_size', Math.min(processedParams.page_size, 300).toString());
        } else {
          queryParams.append('page_size', '30');
        }

        // Handle pagination method
        if (processedParams.next_page_token) {
          queryParams.append('next_page_token', processedParams.next_page_token);
        } else if (processedParams.page_number !== undefined) {
          queryParams.append('page_number', processedParams.page_number.toString());
        } else {
          queryParams.append('page_number', '1');
        }

        // Add other supported query parameters
        if (params.occurrence_id) {
          queryParams.append('occurrence_id', params.occurrence_id);
        }
        
        if (params.status) {
          queryParams.append('status', params.status);
        }
        
        if (params.tracking_source_id) {
          queryParams.append('tracking_source_id', params.tracking_source_id);
        }

        const url = `https://api.zoom.us/v2/webinars/${webinarId}/registrants?${queryParams}`;
        
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          await this.handleApiError(response, webinarId);
        }

        const zoomData = await response.json();
        const transformedData = this.validateAndTransformResponse(zoomData);

        // Extract pagination info from Zoom response
        const zoomPagination = EnhancedPaginationHandler.extractZoomPaginationInfo(zoomData);

        // Generate enhanced pagination response
        const paginatedResponse = await EnhancedPaginationHandler.generatePaginationResponse(
          transformedData.registrants,
          zoomPagination.totalRecords,
          processedParams,
          this.userId,
          webinarId,
          zoomData
        );

        return {
          registrants: paginatedResponse.data,
          pagination: paginatedResponse.pagination,
          warnings: warnings.length > 0 ? warnings : undefined
        };
      },
      this.connectionId
    );
  }

  /**
   * Handle API errors with Zoom-compliant error responses
   */
  private async handleApiError(response: Response, webinarId: string): Promise<never> {
    const errorData = await response.json().catch(() => ({}));
    
    switch (response.status) {
      case 400:
        if (errorData.code === 200) {
          throw new Error('No permission or webinar plan is missing. You must subscribe to the webinar plan and enable webinars for this user.');
        }
        throw new Error(`Bad Request: ${errorData.message || 'Invalid request parameters'}`);
        
      case 401:
        throw new Error('Unauthorized: Invalid or expired access token. Please re-authenticate your Zoom connection.');
        
      case 403:
        throw new Error('Forbidden: Insufficient permissions. Check your Zoom app scopes: webinar:read:admin, webinar:read');
        
      case 404:
        if (errorData.code === 3001) {
          throw new Error(`Webinar does not exist: ${webinarId}`);
        }
        throw new Error(`Webinar not found: ${webinarId}`);
        
      case 429:
        const retryAfter = response.headers.get('Retry-After') || '60';
        throw new Error(`Rate limit exceeded. Please try again in ${retryAfter} seconds.`);
        
      default:
        throw new Error(`Zoom API Error ${response.status}: ${errorData.message || 'Unknown error'}`);
    }
  }

  /**
   * Validate and transform response to ensure compliance
   */
  private validateAndTransformResponse(data: any): ZoomRegistrantsListResponse {
    // Ensure required fields are present
    const response: ZoomRegistrantsListResponse = {
      registrants: (data.registrants || []).map(this.transformRegistrant),
      pagination: {
        next_page_token: data.next_page_token || undefined,
        page_count: data.page_count || 1,
        page_number: data.page_number || 1,
        page_size: data.page_size || 30,
        total_records: data.total_records || 0,
        has_more: !!(data.next_page_token || (data.page_number < data.page_count))
      }
    };

    return response;
  }

  /**
   * Transform individual registrant to ensure all fields are properly mapped
   */
  private transformRegistrant(registrant: any): ZoomRegistrantResponse {
    return {
      id: registrant.id,
      email: registrant.email,
      first_name: registrant.first_name,
      last_name: registrant.last_name || undefined,
      address: registrant.address || undefined,
      city: registrant.city || undefined,
      state: registrant.state || undefined,
      zip: registrant.zip || undefined,
      country: registrant.country || undefined,
      phone: registrant.phone || undefined,
      industry: registrant.industry || undefined,
      org: registrant.org || undefined,
      job_title: registrant.job_title || undefined,
      purchasing_time_frame: registrant.purchasing_time_frame || undefined,
      role_in_purchase_process: registrant.role_in_purchase_process || undefined,
      no_of_employees: registrant.no_of_employees || undefined,
      comments: registrant.comments || undefined,
      custom_questions: registrant.custom_questions || undefined,
      status: registrant.status || 'approved',
      create_time: registrant.create_time || undefined,
      join_url: registrant.join_url || undefined,
    };
  }

  /**
   * Check token expiration and cleanup if needed
   */
  async checkTokenHealth(): Promise<void> {
    // Clean up expired tokens periodically
    await PaginationTokenService.cleanupExpiredTokens();
  }
}
