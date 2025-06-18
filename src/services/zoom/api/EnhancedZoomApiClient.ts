
/**
 * Enhanced Zoom API Client integrating all 5% components
 * Uses composition to wrap the standard ZoomApiClient with advanced features
 */

import { zoomApiClient } from './ZoomApiClient';
import { CircuitBreakerService, CircuitState } from '../utils/CircuitBreakerService';
import { advancedCache } from '../utils/AdvancedCacheService';
import { performanceMonitor } from '../utils/PerformanceMonitoringService';
import { dataQualityService } from '../utils/DataQualityService';
import { edgeCaseHandler } from '../utils/EdgeCaseHandler';
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

  private constructor() {
    this.circuitBreaker = CircuitBreakerService.getInstance('zoom-api');
    this.setupCircuitBreakerMonitoring();
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
    const {
      enableCache = true,
      cacheTtl = 300000, // 5 minutes
      enableCircuitBreaker = true,
      enableMonitoring = true,
      enableQualityCheck = true,
      cacheKey,
      cacheDependencies = [],
      ...baseOptions
    } = options;

    const operationKey = `${method} ${endpoint}`;
    const finalCacheKey = cacheKey || this.generateCacheKey(method, endpoint, data);

    // Try cache first for GET requests
    if (method === 'GET' && enableCache) {
      const cachedData = await advancedCache.get<T>(finalCacheKey);
      if (cachedData) {
        return {
          success: true,
          data: cachedData,
          statusCode: 200,
          fromCache: true
        };
      }
    }

    const apiOperation = async (): Promise<T> => {
      // Use performance monitoring
      if (enableMonitoring) {
        return await performanceMonitor.measureOperation(
          operationKey,
          endpoint,
          method,
          async () => {
            const response = await this.baseClient.makeRequest<T>(method, endpoint, data, baseOptions, connectionId);
            if (!response.success) {
              throw new Error(response.error || 'API request failed');
            }
            return response.data!;
          },
          connectionId
        );
      } else {
        const response = await this.baseClient.makeRequest<T>(method, endpoint, data, baseOptions, connectionId);
        if (!response.success) {
          throw new Error(response.error || 'API request failed');
        }
        return response.data!;
      }
    };

    const fallbackOperation = async (): Promise<T> => {
      // Try to get stale cache data as fallback
      if (method === 'GET' && enableCache) {
        const staleData = await advancedCache.get<T>(finalCacheKey);
        if (staleData) {
          console.warn(`Using stale cache data for ${operationKey}`);
          return staleData;
        }
      }
      throw new Error(`No fallback available for ${operationKey}`);
    };

    try {
      let result: T;

      // Execute with circuit breaker protection
      if (enableCircuitBreaker) {
        result = await this.circuitBreaker.execute(apiOperation, fallbackOperation);
      } else {
        result = await apiOperation();
      }

      // Handle edge cases for specific endpoints
      if (endpoint.includes('/webinars/') && result) {
        result = await this.handleWebinarEdgeCases(result);
      }

      // Cache successful GET responses
      if (method === 'GET' && enableCache && result) {
        await advancedCache.set(finalCacheKey, result, {
          ttl: cacheTtl,
          dependencies: cacheDependencies
        });
      }

      // Perform data quality checks
      if (enableQualityCheck && result) {
        await this.performDataQualityCheck(endpoint, result);
      }

      return {
        success: true,
        data: result,
        statusCode: 200
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      return {
        success: false,
        error: errorMessage,
        statusCode: 500,
        retryable: true
      };
    }
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
    const { enableLargeScale = false, ...queryOptions } = options;

    try {
      // For large-scale operations
      if (enableLargeScale) {
        const result = await this.handleLargeScaleWebinarFetch(connectionId, queryOptions);
        return {
          success: true,
          data: result.webinars,
          statusCode: 200,
          metadata: {
            totalProcessed: result.totalProcessed,
            batchCount: result.batchCount,
            processingTime: result.processingTime
          }
        };
      }

      // Standard enhanced request
      const params = new URLSearchParams();
      if (queryOptions.pageSize) params.append('page_size', queryOptions.pageSize.toString());
      if (queryOptions.type) params.append('type', queryOptions.type);
      if (queryOptions.from) params.append('from', queryOptions.from.toISOString().split('T')[0]);
      if (queryOptions.to) params.append('to', queryOptions.to.toISOString().split('T')[0]);

      const endpoint = `/users/me/webinars${params.toString() ? `?${params}` : ''}`;
      
      return await this.makeEnhancedRequest('GET', endpoint, undefined, {
        enableCache: true,
        cacheTtl: 600000, // 10 minutes for webinar lists
        cacheDependencies: [`webinars:${connectionId}`]
      }, connectionId);

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch webinars',
        statusCode: 500,
        retryable: true
      };
    }
  }

  /**
   * Get comprehensive service status including all components
   */
  getServiceStatus(): {
    circuitBreaker: any;
    cache: any;
    performance: any;
    dataQuality: any;
    overall: 'healthy' | 'degraded' | 'unhealthy';
  } {
    const circuitStatus = this.circuitBreaker.getStatus();
    const cacheStats = advancedCache.getStats();
    const performanceStats = performanceMonitor.getStats(60);
    const qualityScore = dataQualityService.calculateQualityScore();

    // Determine overall health
    let overall: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    
    if (circuitStatus.state === CircuitState.OPEN) {
      overall = 'unhealthy';
    } else if (
      circuitStatus.state === CircuitState.HALF_OPEN ||
      performanceStats.successRate < 0.9 ||
      qualityScore.overall < 0.8
    ) {
      overall = 'degraded';
    }

    return {
      circuitBreaker: circuitStatus,
      cache: cacheStats,
      performance: performanceStats,
      dataQuality: qualityScore,
      overall
    };
  }

  private setupCircuitBreakerMonitoring(): void {
    this.circuitBreaker.onStateChange((state) => {
      console.log(`Zoom API Circuit Breaker state changed to: ${state}`);
      
      if (state === CircuitState.OPEN) {
        // Invalidate cache when circuit opens to prevent serving stale data indefinitely
        advancedCache.clear();
      }
    });
  }

  private generateCacheKey(method: string, endpoint: string, data?: any): string {
    const dataHash = data ? JSON.stringify(data) : '';
    return `zoom:${method}:${endpoint}:${Buffer.from(dataHash).toString('base64').slice(0, 8)}`;
  }

  private async handleWebinarEdgeCases(webinarData: any): Promise<any> {
    // Handle timezone complexity
    if (webinarData.timezone && webinarData.start_time) {
      const timezoneInfo = await edgeCaseHandler.handleTimezoneComplexity(webinarData);
      webinarData._timezoneInfo = timezoneInfo;
    }

    // Handle recurring webinar patterns
    if (webinarData.recurrence) {
      const recurrenceInfo = edgeCaseHandler.parseRecurrencePattern(webinarData.recurrence);
      webinarData._recurrenceInfo = recurrenceInfo;
    }

    return webinarData;
  }

  private async handleLargeScaleWebinarFetch(
    connectionId: string,
    options: any
  ): Promise<{
    webinars: any[];
    totalProcessed: number;
    batchCount: number;
    processingTime: number;
  }> {
    const webinars: any[] = [];
    
    // Simulate large-scale processing
    const result = await edgeCaseHandler.handleLargeScaleWebinar(
      connectionId,
      1000, // Assume 1000+ webinars
      async (batch: any[]) => {
        // Process each batch
        webinars.push(...batch);
      }
    );

    return {
      webinars,
      totalProcessed: result.totalProcessed,
      batchCount: result.batchCount,
      processingTime: result.processingTime
    };
  }

  private async performDataQualityCheck(endpoint: string, data: any): Promise<void> {
    try {
      if (endpoint.includes('/webinars') && Array.isArray(data)) {
        await dataQualityService.runQualityChecks({ webinars: data });
      } else if (endpoint.includes('/participants') && Array.isArray(data)) {
        await dataQualityService.runQualityChecks({ participants: data });
      } else if (endpoint.includes('/registrants') && Array.isArray(data)) {
        await dataQualityService.runQualityChecks({ registrants: data });
      }
    } catch (error) {
      console.warn('Data quality check failed:', error);
    }
  }

  /**
   * Health check endpoint for monitoring
   */
  async healthCheck(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    components: any;
    timestamp: string;
  }> {
    const serviceStatus = this.getServiceStatus();
    
    return {
      status: serviceStatus.overall,
      components: serviceStatus,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Delegate methods to base client for standard operations
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
