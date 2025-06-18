
/**
 * Enhanced Request Processor
 * Handles the core request processing logic with caching, monitoring, and quality checks
 */

import { ZoomApiClient } from '../ZoomApiClient';
import { CircuitBreakerService } from '../../utils/CircuitBreakerService';
import { advancedCache } from '../../utils/AdvancedCacheService';
import { performanceMonitor } from '../../utils/PerformanceMonitoringService';
import { dataQualityService } from '../../utils/DataQualityService';
import { edgeCaseHandler } from '../../utils/EdgeCaseHandler';
import type { ApiResponse, RequestOptions } from '../types';

interface EnhancedRequestOptions extends RequestOptions {
  enableCache?: boolean;
  cacheTtl?: number;
  enableCircuitBreaker?: boolean;
  enableMonitoring?: boolean;
  enableQualityCheck?: boolean;
  cacheKey?: string;
  cacheDependencies?: string[];
}

export class EnhancedRequestProcessor {
  constructor(
    private baseClient: ZoomApiClient,
    private circuitBreaker: CircuitBreakerService
  ) {}

  async processRequest<T = any>(
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
}
