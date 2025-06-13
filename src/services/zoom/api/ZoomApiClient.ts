
import { ZoomConnection } from '@/types/zoom';
import { ZoomConnectionService } from '../ZoomConnectionService';
import { ApiResponse, RequestOptions, QueuedRequest, RateLimitConfig } from './types';
import { HttpClient } from './httpClient';
import { ErrorHandler } from './errorHandler';
import { TokenManager } from './tokenManager';

/**
 * Zoom API Client for making authenticated requests with rate limiting and token management
 */
export class ZoomApiClient {
  private static instance: ZoomApiClient;
  private requestQueue: QueuedRequest[] = [];
  private isProcessingQueue = false;
  private lastRequestTime = 0;
  private readonly rateLimitConfig: RateLimitConfig = {
    maxRequestsPerSecond: 10,
    retryAttempts: 3,
    baseDelay: 1000,
  };

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
   * Make an authenticated API request to Zoom
   */
  async makeRequest<T = any>(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    endpoint: string,
    data?: any,
    options: RequestOptions = {},
    connectionId?: string
  ): Promise<ApiResponse<T>> {
    // Get connection if not provided
    if (!connectionId) {
      const connections = await ZoomConnectionService.getUserConnections('current');
      const primaryConnection = connections.find(c => c.is_primary);
      if (!primaryConnection) {
        return {
          success: false,
          error: 'No active Zoom connection found',
          statusCode: 401,
          retryable: false,
        };
      }
      connectionId = primaryConnection.id;
    }

    return new Promise((resolve, reject) => {
      const queueItem: QueuedRequest = {
        resolve,
        reject,
        method,
        url: endpoint,
        data,
        options,
        connectionId: connectionId!,
        timestamp: Date.now(),
      };

      this.requestQueue.push(queueItem);
      this.processQueue();
    });
  }

  /**
   * Process the request queue with rate limiting
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessingQueue || this.requestQueue.length === 0) {
      return;
    }

    this.isProcessingQueue = true;

    while (this.requestQueue.length > 0) {
      const request = this.requestQueue.shift()!;
      
      // Rate limiting - ensure minimum delay between requests
      const timeSinceLastRequest = Date.now() - this.lastRequestTime;
      const minDelay = 1000 / this.rateLimitConfig.maxRequestsPerSecond;
      
      if (timeSinceLastRequest < minDelay) {
        await HttpClient.delay(minDelay - timeSinceLastRequest);
      }

      try {
        const result = await this.executeRequest(request);
        request.resolve(result);
      } catch (error) {
        request.reject(error);
      }

      this.lastRequestTime = Date.now();
    }

    this.isProcessingQueue = false;
  }

  /**
   * Execute a single API request
   */
  private async executeRequest(request: QueuedRequest): Promise<ApiResponse> {
    const { method, url, data, options, connectionId } = request;
    let attempt = 0;
    const maxAttempts = options.retries || this.rateLimitConfig.retryAttempts;

    while (attempt < maxAttempts) {
      try {
        // Get fresh connection and validate token
        const connection = await ZoomConnectionService.getConnection(connectionId);
        if (!connection) {
          return {
            success: false,
            error: 'Connection not found',
            statusCode: 404,
            retryable: false,
          };
        }

        // Check if token needs refresh
        if (TokenManager.isTokenExpired(connection.token_expires_at)) {
          console.log(`Token expired for connection ${connectionId}, attempting refresh`);
          const refreshedConnection = await TokenManager.refreshAccessToken(connectionId);
          if (!refreshedConnection) {
            return {
              success: false,
              error: 'Failed to refresh access token',
              statusCode: 401,
              retryable: false,
            };
          }
        }

        // Make the actual HTTP request
        const response = await HttpClient.makeRequest(method, url, data, connection, options);
        
        ErrorHandler.logRequest(method, url, response.statusCode, attempt + 1);
        
        if (response.statusCode >= 200 && response.statusCode < 300) {
          return {
            success: true,
            data: response.data,
            statusCode: response.statusCode,
          };
        }

        // Handle specific error cases
        if (response.statusCode === 429) {
          // Rate limited - wait and retry
          const retryAfter = HttpClient.extractRetryAfter(response.headers) || (2 ** attempt * 1000);
          console.log(`Rate limited, waiting ${retryAfter}ms before retry`);
          await HttpClient.delay(retryAfter);
          attempt++;
          continue;
        }

        if (response.statusCode === 401) {
          // Unauthorized - try token refresh once
          if (attempt === 0) {
            console.log(`Unauthorized, attempting token refresh for connection ${connectionId}`);
            await TokenManager.refreshAccessToken(connectionId);
            attempt++;
            continue;
          }
        }

        // Other errors
        return ErrorHandler.handleApiError(response);

      } catch (error) {
        console.error(`API request attempt ${attempt + 1} failed:`, error);
        
        if (attempt >= maxAttempts - 1) {
          return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error occurred',
            statusCode: 500,
            retryable: true,
          };
        }

        // Exponential backoff for retries
        const delay = this.rateLimitConfig.baseDelay * (2 ** attempt);
        await HttpClient.delay(delay);
        attempt++;
      }
    }

    return {
      success: false,
      error: 'Max retry attempts exceeded',
      statusCode: 500,
      retryable: false,
    };
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
   * Get current queue status (for debugging)
   */
  getQueueStatus() {
    return {
      queueLength: this.requestQueue.length,
      isProcessing: this.isProcessingQueue,
      lastRequestTime: this.lastRequestTime,
    };
  }
}

// Export singleton instance
export const zoomApiClient = ZoomApiClient.getInstance();

// Re-export types for convenience
export type { ApiResponse, RequestOptions } from './types';
