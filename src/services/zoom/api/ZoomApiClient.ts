import { ZoomConnection } from '@/types/zoom';
import { ZoomConnectionService } from '../ZoomConnectionService';
import { toast } from '@/hooks/use-toast';

/**
 * Rate limiting configuration for Zoom API
 */
interface RateLimitConfig {
  maxRequestsPerSecond: number;
  retryAttempts: number;
  baseDelay: number;
}

/**
 * Request options for API calls
 */
interface RequestOptions {
  timeout?: number;
  retries?: number;
  skipRateLimit?: boolean;
  skipAuth?: boolean;
}

/**
 * Standardized API response format
 */
interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  statusCode?: number;
  retryable?: boolean;
}

/**
 * Request queue item for rate limiting
 */
interface QueuedRequest {
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
        await this.delay(minDelay - timeSinceLastRequest);
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
        if (ZoomConnectionService.isTokenExpired(connection.token_expires_at)) {
          console.log(`Token expired for connection ${connectionId}, attempting refresh`);
          const refreshedConnection = await this.refreshAccessToken(connectionId);
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
        const response = await this.httpRequest(method, url, data, connection, options);
        
        this.logRequest(method, url, response.statusCode, attempt + 1);
        
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
          const retryAfter = this.extractRetryAfter(response.headers) || (2 ** attempt * 1000);
          console.log(`Rate limited, waiting ${retryAfter}ms before retry`);
          await this.delay(retryAfter);
          attempt++;
          continue;
        }

        if (response.statusCode === 401) {
          // Unauthorized - try token refresh once
          if (attempt === 0) {
            console.log(`Unauthorized, attempting token refresh for connection ${connectionId}`);
            await this.refreshAccessToken(connectionId);
            attempt++;
            continue;
          }
        }

        // Other errors
        return this.handleApiError(response);

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
        await this.delay(delay);
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
   * Make HTTP request with proper headers and authentication
   */
  private async httpRequest(
    method: string,
    endpoint: string,
    data: any,
    connection: ZoomConnection,
    options: RequestOptions
  ): Promise<any> {
    const baseUrl = 'https://api.zoom.us/v2';
    const url = endpoint.startsWith('http') ? endpoint : `${baseUrl}${endpoint}`;
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${connection.access_token}`,
    };

    const fetchOptions: RequestInit = {
      method,
      headers,
      signal: options.timeout ? AbortSignal.timeout(options.timeout) : undefined,
    };

    if (data && (method === 'POST' || method === 'PUT')) {
      fetchOptions.body = JSON.stringify(data);
    }

    const response = await fetch(url, fetchOptions);
    
    let responseData;
    try {
      responseData = await response.json();
    } catch (error) {
      responseData = null;
    }

    return {
      statusCode: response.status,
      headers: response.headers,
      data: responseData,
    };
  }

  /**
   * Refresh access token for a connection
   */
  async refreshAccessToken(connectionId: string): Promise<ZoomConnection | null> {
    try {
      const connection = await ZoomConnectionService.getConnection(connectionId);
      if (!connection) {
        console.error(`Connection ${connectionId} not found for token refresh`);
        return null;
      }

      // Use existing refresh token logic from ZoomConnectionService
      const refreshedConnection = await ZoomConnectionService.refreshToken(connection);
      
      if (refreshedConnection) {
        console.log(`Token refreshed successfully for connection ${connectionId}`);
        return refreshedConnection;
      } else {
        console.error(`Failed to refresh token for connection ${connectionId}`);
        toast({
          title: "Token Refresh Failed",
          description: "Please reconnect your Zoom account.",
          variant: "destructive",
        });
        return null;
      }
    } catch (error) {
      console.error(`Error refreshing token for connection ${connectionId}:`, error);
      return null;
    }
  }

  /**
   * Handle rate limiting response
   */
  private async handleRateLimit(retryAfter: number): Promise<void> {
    console.log(`Rate limit hit, waiting ${retryAfter}ms`);
    await this.delay(retryAfter);
  }

  /**
   * Handle API error responses
   */
  private handleApiError(response: any): ApiResponse {
    const { statusCode, data } = response;
    
    let errorMessage = 'Unknown API error';
    let retryable = false;

    switch (statusCode) {
      case 400:
        errorMessage = data?.message || 'Bad request';
        retryable = false;
        break;
      case 401:
        errorMessage = 'Unauthorized - invalid or expired token';
        retryable = true;
        break;
      case 403:
        errorMessage = 'Forbidden - insufficient permissions';
        retryable = false;
        break;
      case 404:
        errorMessage = 'Resource not found';
        retryable = false;
        break;
      case 429:
        errorMessage = 'Rate limit exceeded';
        retryable = true;
        break;
      case 500:
      case 502:
      case 503:
      case 504:
        errorMessage = 'Server error';
        retryable = true;
        break;
      default:
        errorMessage = data?.message || `HTTP ${statusCode} error`;
        retryable = statusCode >= 500;
    }

    return {
      success: false,
      error: errorMessage,
      statusCode,
      retryable,
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
   * Extract retry-after header value
   */
  private extractRetryAfter(headers: Headers): number | null {
    const retryAfter = headers.get('retry-after');
    if (retryAfter) {
      const seconds = parseInt(retryAfter, 10);
      return isNaN(seconds) ? null : seconds * 1000;
    }
    return null;
  }

  /**
   * Log API request for debugging
   */
  private logRequest(method: string, endpoint: string, statusCode?: number, attempt?: number): void {
    const logData = {
      method,
      endpoint,
      statusCode,
      attempt,
      timestamp: new Date().toISOString(),
    };
    
    console.log(`[ZoomAPI] ${method} ${endpoint}`, logData);
    
    // In production, you might want to send this to a logging service
    if (statusCode && statusCode >= 400) {
      console.warn(`[ZoomAPI] Request failed:`, logData);
    }
  }

  /**
   * Utility method for delays
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
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
