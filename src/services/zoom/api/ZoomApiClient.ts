
import { ZoomConnection } from '@/types/zoom';
import { ZoomConnectionService } from '../ZoomConnectionService';
import { ApiResponse, RequestOptions, QueuedRequest, RateLimitConfig } from './types';
import { HttpClient } from './httpClient';
import { ErrorHandler } from './errorHandler';
import { TokenManager } from './tokenManager';
import { rateLimitManager } from '../utils/RateLimitManager';
import { RequestPriority } from '../utils/types/rateLimitTypes';

/**
 * Zoom API Client for making authenticated requests with sophisticated rate limiting
 */
export class ZoomApiClient {
  private static instance: ZoomApiClient;
  private initialized = false;

  private constructor() {
    // Private constructor for singleton pattern
  }

  /**
   * Get singleton instance of ZoomApiClient
   */
  static getInstance(): ZoomApiClient {
    if (!ZoomApiClient.instance) {
      ZoomApiClient.instance = new ZoomApiClient();
    }
    return ZoomApiClient.instance;
  }

  /**
   * Initialize the API client
   */
  async initialize(): Promise<void> {
    if (!this.initialized) {
      await rateLimitManager.initialize();
      this.initialized = true;
    }
  }

  /**
   * Make an authenticated API request to Zoom with sophisticated rate limiting
   */
  async makeRequest<T = any>(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    endpoint: string,
    data?: any,
    options: RequestOptions = {},
    connectionId?: string
  ): Promise<ApiResponse<T>> {
    await this.initialize();

    // Get connection if not provided
    if (!connectionId) {
      // Use current user's primary connection
      const user = await supabase.auth.getUser();
      if (user.data.user) {
        const connection = await ZoomConnectionService.getPrimaryConnection(user.data.user.id);
        if (!connection) {
          return {
            success: false,
            error: 'No active Zoom connection found',
            statusCode: 401,
            retryable: false,
          };
        }
        connectionId = connection.id;
      }
    }

    // Determine priority based on endpoint and method
    const priority = this.determinePriority(endpoint, method);

    try {
      // Use rate limit manager to queue/execute the request
      const result = await rateLimitManager.queueRequest(
        method,
        endpoint,
        data,
        connectionId!,
        priority,
        options.timeout || 30000
      );

      return {
        success: true,
        data: result.data,
        statusCode: 200,
      };
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('timeout')) {
          return {
            success: false,
            error: 'Request timeout',
            statusCode: 408,
            retryable: true,
          };
        }
        
        if (error.message.includes('cancelled')) {
          return {
            success: false,
            error: 'Request cancelled',
            statusCode: 499,
            retryable: false,
          };
        }
      }

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        statusCode: 500,
        retryable: true,
      };
    }
  }

  /**
   * Convenience method for GET requests
   */
  async get<T = any>(endpoint: string, options?: RequestOptions, connectionId?: string): Promise<ApiResponse<T>> {
    return this.makeRequest<T>('GET', endpoint, undefined, options, connectionId);
  }

  /**
   * Convenience method for POST requests
   */
  async post<T = any>(endpoint: string, data?: any, options?: RequestOptions, connectionId?: string): Promise<ApiResponse<T>> {
    return this.makeRequest<T>('POST', endpoint, data, options, connectionId);
  }

  /**
   * Convenience method for PUT requests
   */
  async put<T = any>(endpoint: string, data?: any, options?: RequestOptions, connectionId?: string): Promise<ApiResponse<T>> {
    return this.makeRequest<T>('PUT', endpoint, data, options, connectionId);
  }

  /**
   * Convenience method for DELETE requests
   */
  async delete<T = any>(endpoint: string, options?: RequestOptions, connectionId?: string): Promise<ApiResponse<T>> {
    return this.makeRequest<T>('DELETE', endpoint, undefined, options, connectionId);
  }

  /**
   * Get current rate limit status
   */
  async getRateLimitStatus(connectionId?: string) {
    if (!connectionId) {
      const user = await supabase.auth.getUser();
      if (user.data.user) {
        const connection = await ZoomConnectionService.getPrimaryConnection(user.data.user.id);
        if (!connection) return null;
        connectionId = connection.id;
      }
    }

    return await rateLimitManager.getRateLimitStatus(connectionId!);
  }

  /**
   * Get queue status (for debugging and monitoring)
   */
  getQueueStatus() {
    return {
      rateLimitManagerInitialized: this.initialized,
      // Additional queue status can be added here
    };
  }

  /**
   * Determine request priority based on endpoint and method
   */
  private determinePriority(endpoint: string, method: string): RequestPriority {
    // Critical: Authentication and health checks
    if (endpoint.includes('/oauth/') || endpoint === '/users/me') {
      return RequestPriority.CRITICAL;
    }

    // High: Real-time operations and incremental sync
    if (method === 'GET' && (
      endpoint.includes('/webinars/') && !endpoint.includes('/participants') ||
      endpoint.includes('/users/me/webinars')
    )) {
      return RequestPriority.HIGH;
    }

    // Low: Bulk operations and reports
    if (endpoint.includes('/report/') || endpoint.includes('/participants')) {
      return RequestPriority.LOW;
    }

    // Normal: Everything else
    return RequestPriority.NORMAL;
  }
}

// Export singleton instance
export const zoomApiClient = ZoomApiClient.getInstance();

// Re-export types for convenience
export type { ApiResponse, RequestOptions } from './types';
