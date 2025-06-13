
import { ApiResponse, HttpResponse } from './types';

/**
 * Error handling utilities for Zoom API responses
 */
export class ErrorHandler {
  /**
   * Handle API error responses
   */
  static handleApiError(response: HttpResponse): ApiResponse {
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
   * Log API request for debugging
   */
  static logRequest(method: string, endpoint: string, statusCode?: number, attempt?: number): void {
    const logData = {
      method,
      endpoint,
      statusCode,
      attempt,
      timestamp: new Date().toISOString(),
    };
    
    console.log(`[ZoomAPI] ${method} ${endpoint}`, logData);
    
    if (statusCode && statusCode >= 400) {
      console.warn(`[ZoomAPI] Request failed:`, logData);
    }
  }
}
