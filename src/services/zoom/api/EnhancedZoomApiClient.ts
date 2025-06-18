
/**
 * Enhanced Zoom API Client - Main orchestration class
 * Uses composition to wrap the standard ZoomApiClient with advanced features
 */

import { zoomApiClient } from './ZoomApiClient';
import { CircuitBreakerService } from '../utils/CircuitBreakerService';
import { advancedCache } from '../utils/AdvancedCacheService';
import { performanceMonitor } from '../utils/PerformanceMonitoringService';
import { dataQualityService } from '../utils/DataQualityService';
import { EnhancedRequestProcessor } from './enhanced/EnhancedRequestProcessor';
import { WebinarEnhancementService } from './enhanced/WebinarEnhancementService';
import { ServiceHealthMonitor } from './enhanced/ServiceHealthMonitor';
import type { ApiResponse, RequestOptions } from './types';

interface EnhancedRequestOptions extends RequestOptions {
  enableCache?: boolean;
  cacheTtl?: number;
  enableCircuitBreaker?: boolean;
  enableMonitoring?: boolean;
  enableQualityCheck?: boolean;
  cacheKey?: string;
  cacheDependencies?: string[];
}

export class EnhancedZoomApiClient {
  private static enhancedInstance: EnhancedZoomApiClient;
  private circuitBreaker: CircuitBreakerService;
  private baseClient = zoomApiClient;
  private requestProcessor: EnhancedRequestProcessor;
  private webinarService: WebinarEnhancementService;
  private healthMonitor: ServiceHealthMonitor;

  private constructor() {
    this.circuitBreaker = CircuitBreakerService.getInstance('zoom-api');
    this.requestProcessor = new EnhancedRequestProcessor(this.baseClient, this.circuitBreaker);
    this.webinarService = new WebinarEnhancementService();
    this.healthMonitor = new ServiceHealthMonitor(this.circuitBreaker);
  }

  static getEnhancedInstance(): EnhancedZoomApiClient {
    if (!EnhancedZoomApiClient.enhancedInstance) {
      EnhancedZoomApiClient.enhancedInstance = new EnhancedZoomApiClient();
    }
    return EnhancedZoomApiClient.enhancedInstance;
  }

  /**
   * Enhanced API request with all 5% components integrated
   */
  async makeEnhancedRequest<T = any>(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    endpoint: string,
    data?: any,
    options: EnhancedRequestOptions = {},
    connectionId?: string
  ): Promise<ApiResponse<T>> {
    return this.requestProcessor.processRequest<T>(method, endpoint, data, options, connectionId);
  }

  /**
   * Enhanced webinar fetching with large-scale support
   */
  async getWebinarsEnhanced(
    connectionId: string,
    options: {
      pageSize?: number;
      type?: 'past' | 'upcoming' | 'live';
      from?: Date;
      to?: Date;
      enableLargeScale?: boolean;
    } = {}
  ): Promise<ApiResponse<any[]>> {
    return this.webinarService.getWebinarsEnhanced(connectionId, options, this.makeEnhancedRequest.bind(this));
  }

  /**
   * Get comprehensive service status including all components
   */
  getServiceStatus() {
    return this.healthMonitor.getServiceStatus();
  }

  /**
   * Health check endpoint for monitoring
   */
  async healthCheck() {
    return this.healthMonitor.performHealthCheck();
  }

  /**
   * Delegate methods to enhanced request processor
   */
  async get<T = any>(endpoint: string, options?: RequestOptions, connectionId?: string): Promise<ApiResponse<T>> {
    return this.makeEnhancedRequest<T>('GET', endpoint, undefined, options, connectionId);
  }

  async post<T = any>(endpoint: string, data?: any, options?: RequestOptions, connectionId?: string): Promise<ApiResponse<T>> {
    return this.makeEnhancedRequest<T>('POST', endpoint, data, options, connectionId);
  }

  async put<T = any>(endpoint: string, data?: any, options?: RequestOptions, connectionId?: string): Promise<ApiResponse<T>> {
    return this.makeEnhancedRequest<T>('PUT', endpoint, data, options, connectionId);
  }

  async delete<T = any>(endpoint: string, options?: RequestOptions, connectionId?: string): Promise<ApiResponse<T>> {
    return this.makeEnhancedRequest<T>('DELETE', endpoint, undefined, options, connectionId);
  }

  /**
   * Get rate limit status from base client
   */
  async getRateLimitStatus(connectionId?: string) {
    return await this.baseClient.getRateLimitStatus(connectionId);
  }

  /**
   * Get queue status from base client
   */
  getQueueStatus() {
    return this.baseClient.getQueueStatus();
  }
}

// Export enhanced singleton instance
export const enhancedZoomApiClient = EnhancedZoomApiClient.getEnhancedInstance();
