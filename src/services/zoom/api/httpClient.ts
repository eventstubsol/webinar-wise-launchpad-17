
import { ZoomConnection } from '@/types/zoom';
import { RequestOptions, HttpResponse } from './types';

/**
 * HTTP client utilities for making requests to Zoom API
 */
export class HttpClient {
  private static readonly BASE_URL = 'https://api.zoom.us/v2';

  /**
   * Make HTTP request with proper headers and authentication
   */
  static async makeRequest(
    method: string,
    endpoint: string,
    data: any,
    connection: ZoomConnection,
    options: RequestOptions
  ): Promise<HttpResponse> {
    const url = endpoint.startsWith('http') ? endpoint : `${this.BASE_URL}${endpoint}`;
    
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
   * Extract retry-after header value
   */
  static extractRetryAfter(headers: Headers): number | null {
    const retryAfter = headers.get('retry-after');
    if (retryAfter) {
      const seconds = parseInt(retryAfter, 10);
      return isNaN(seconds) ? null : seconds * 1000;
    }
    return null;
  }

  /**
   * Utility method for delays
   */
  static delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
