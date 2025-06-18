
/**
 * Type definitions for Zoom API client
 */

/**
 * Rate limiting configuration for Zoom API
 */
export interface RateLimitConfig {
  maxRequestsPerSecond: number;
  retryAttempts: number;
  baseDelay: number;
}

/**
 * Request options for API calls
 */
export interface RequestOptions {
  timeout?: number;
  retries?: number;
  skipRateLimit?: boolean;
  skipAuth?: boolean;
}

/**
 * Standardized API response format
 */
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  statusCode?: number;
  retryable?: boolean;
  fromCache?: boolean;
  metadata?: {
    totalProcessed?: number;
    batchCount?: number;
    processingTime?: number;
    [key: string]: any;
  };
}

/**
 * Request queue item for rate limiting
 */
export interface QueuedRequest {
  resolve: (value: any) => void;
  reject: (error: any) => void;
  method: string;
  url: string;
  data?: any;
  options?: RequestOptions;
  connectionId: string;
  timestamp: number;
}

/**
 * HTTP response structure
 */
export interface HttpResponse {
  statusCode: number;
  headers: Headers;
  data: any;
}
