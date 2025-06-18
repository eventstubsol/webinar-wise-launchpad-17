
/**
 * Enhanced pagination handler for Zoom API compliance
 * Manages both legacy and new pagination methods
 */

import { PaginationTokenService, PaginationTokenData } from '../../utils/PaginationTokenService';

export interface PaginationParams {
  page_size?: number;
  page_number?: number;
  next_page_token?: string;
}

export interface PaginationResponse<T> {
  data: T[];
  pagination: {
    page_count: number;
    page_number: number;
    page_size: number;
    total_records: number;
    next_page_token?: string;
    has_more: boolean;
  };
  warnings?: string[];
}

export class EnhancedPaginationHandler {
  private static readonly DEFAULT_PAGE_SIZE = 30;
  private static readonly MAX_PAGE_SIZE = 300;

  /**
   * Process pagination parameters and emit deprecation warnings
   */
  static async processPaginationParams(
    params: PaginationParams,
    userId: string,
    webinarId?: string
  ): Promise<{
    processedParams: Record<string, any>;
    warnings: string[];
  }> {
    const warnings: string[] = [];
    const processedParams: Record<string, any> = {};

    // Validate and set page size
    const pageSize = Math.min(
      params.page_size || this.DEFAULT_PAGE_SIZE,
      this.MAX_PAGE_SIZE
    );
    processedParams.page_size = pageSize;

    // Handle pagination method
    if (params.next_page_token) {
      // New pagination method - validate token
      const tokenValidation = await PaginationTokenService.validateToken(params.next_page_token);
      
      if (!tokenValidation.isValid) {
        throw new Error(`Invalid pagination token: ${tokenValidation.error}`);
      }

      // Use stored query parameters from token
      const storedParams = tokenValidation.data?.queryParams || {};
      Object.assign(processedParams, storedParams);

      console.log(`✅ PAGINATION: Using next_page_token (preferred method)`);
    } else if (params.page_number !== undefined) {
      // Legacy pagination method - emit deprecation warning
      warnings.push(
        'DEPRECATION WARNING: The page_number parameter is deprecated. ' +
        'Please use next_page_token for better performance and reliability. ' +
        'See: https://docs.zoom.us/docs/api/rest/pagination/'
      );

      processedParams.page_number = params.page_number;
      
      console.warn(`⚠️ PAGINATION: Using deprecated page_number method (page ${params.page_number})`);
    } else {
      // Default to first page
      processedParams.page_number = 1;
      
      console.log(`📄 PAGINATION: Starting from first page (default)`);
    }

    return { processedParams, warnings };
  }

  /**
   * Generate pagination response with appropriate tokens
   */
  static async generatePaginationResponse<T>(
    data: T[],
    totalRecords: number,
    currentParams: Record<string, any>,
    userId: string,
    webinarId?: string,
    zoomResponse?: any
  ): Promise<PaginationResponse<T>> {
    const pageSize = currentParams.page_size || this.DEFAULT_PAGE_SIZE;
    const pageNumber = currentParams.page_number || 1;
    const pageCount = Math.ceil(totalRecords / pageSize);
    const hasMore = pageNumber < pageCount || !!zoomResponse?.next_page_token;

    let nextPageToken: string | undefined;

    // Generate next page token if there are more pages
    if (hasMore) {
      let nextPageParams: Record<string, any>;

      if (zoomResponse?.next_page_token) {
        // Use Zoom's next page token in our parameters
        nextPageParams = {
          ...currentParams,
          next_page_token: zoomResponse.next_page_token
        };
      } else {
        // Generate parameters for next page number
        nextPageParams = {
          ...currentParams,
          page_number: pageNumber + 1
        };
      }

      try {
        nextPageToken = await PaginationTokenService.generateToken({
          webinarId,
          userId,
          queryParams: nextPageParams
        });
      } catch (error) {
        console.error('Failed to generate next page token:', error);
      }
    }

    return {
      data,
      pagination: {
        page_count: pageCount,
        page_number: pageNumber,
        page_size: pageSize,
        total_records: totalRecords,
        next_page_token: nextPageToken,
        has_more: hasMore
      }
    };
  }

  /**
   * Extract pagination info from Zoom API response
   */
  static extractZoomPaginationInfo(zoomResponse: any): {
    pageCount: number;
    pageNumber: number;
    pageSize: number;
    totalRecords: number;
    nextPageToken?: string;
  } {
    return {
      pageCount: zoomResponse.page_count || 1,
      pageNumber: zoomResponse.page_number || 1,
      pageSize: zoomResponse.page_size || this.DEFAULT_PAGE_SIZE,
      totalRecords: zoomResponse.total_records || 0,
      nextPageToken: zoomResponse.next_page_token
    };
  }

  /**
   * Validate pagination parameters
   */
  static validatePaginationParams(params: PaginationParams): string[] {
    const errors: string[] = [];

    if (params.page_size !== undefined) {
      if (params.page_size < 1 || params.page_size > this.MAX_PAGE_SIZE) {
        errors.push(`page_size must be between 1 and ${this.MAX_PAGE_SIZE}`);
      }
    }

    if (params.page_number !== undefined) {
      if (params.page_number < 1) {
        errors.push('page_number must be greater than 0');
      }
    }

    if (params.next_page_token && params.page_number) {
      errors.push('Cannot use both next_page_token and page_number parameters');
    }

    return errors;
  }
}
