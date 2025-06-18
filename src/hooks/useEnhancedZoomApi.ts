
/**
 * React hook for Enhanced Zoom API with all 5% components
 * Provides circuit breaker status, performance monitoring, data quality, and edge case handling
 */

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { enhancedZoomApiClient } from '@/services/zoom/api';
import { performanceMonitor } from '@/services/zoom/utils/PerformanceMonitoringService';
import { dataQualityService } from '@/services/zoom/utils/DataQualityService';

interface EnhancedApiStatus {
  circuitBreaker: {
    state: string;
    failureRate: number;
    lastFailureTime: number;
  };
  performance: {
    averageResponseTime: number;
    successRate: number;
    requestsPerMinute: number;
  };
  dataQuality: {
    overall: number;
    issueCount: number;
    recordsAffected: number;
  };
  cache: {
    hitRate: number;
    size: number;
    memoryUsage: number;
  };
  overall: 'healthy' | 'degraded' | 'unhealthy';
}

export const useEnhancedZoomApi = () => {
  const { user } = useAuth();
  const [apiStatus, setApiStatus] = useState<EnhancedApiStatus | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Update API status
  const updateApiStatus = useCallback(async () => {
    try {
      const status = await enhancedZoomApiClient.getServiceStatus();
      setApiStatus(status);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get API status');
    }
  }, []);

  // Enhanced webinar fetching
  const fetchWebinars = useCallback(async (options?: {
    type?: 'past' | 'upcoming' | 'live';
    enableLargeScale?: boolean;
    from?: Date;
    to?: Date;
  }) => {
    if (!user) throw new Error('User not authenticated');
    
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await enhancedZoomApiClient.getWebinarsEnhanced('primary', options);
      
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch webinars');
      }
      
      return response.data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch webinars';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  // Enhanced API request wrapper
  const makeEnhancedRequest = useCallback(async <T>(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    endpoint: string,
    data?: any,
    options?: {
      enableCache?: boolean;
      cacheTtl?: number;
      enableCircuitBreaker?: boolean;
      enableMonitoring?: boolean;
      enableQualityCheck?: boolean;
    }
  ): Promise<T> => {
    if (!user) throw new Error('User not authenticated');
    
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await enhancedZoomApiClient.makeEnhancedRequest<T>(
        method, 
        endpoint, 
        data, 
        options,
        'primary'
      );
      
      if (!response.success) {
        throw new Error(response.error || 'API request failed');
      }
      
      return response.data!;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'API request failed';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  // Get performance metrics
  const getPerformanceMetrics = useCallback((periodMinutes: number = 60) => {
    return performanceMonitor.getStats(periodMinutes);
  }, []);

  // Get data quality score
  const getDataQualityScore = useCallback(() => {
    return dataQualityService.calculateQualityScore();
  }, []);

  // Health check
  const performHealthCheck = useCallback(async () => {
    try {
      const health = await enhancedZoomApiClient.healthCheck();
      return health;
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Health check failed');
    }
  }, []);

  // Subscribe to performance alerts
  useEffect(() => {
    const unsubscribePerformance = performanceMonitor.onAlert((alert) => {
      console.warn('Performance Alert:', alert);
      // Could trigger toast notification here
    });

    const unsubscribeQuality = dataQualityService.onQualityIssue((issue) => {
      console.warn('Data Quality Issue:', issue);
      // Could trigger toast notification here
    });

    return () => {
      unsubscribePerformance();
      unsubscribeQuality();
    };
  }, []);

  // Update status periodically
  useEffect(() => {
    updateApiStatus();
    
    const interval = setInterval(() => {
      updateApiStatus();
    }, 30000); // Update every 30 seconds

    return () => clearInterval(interval);
  }, [updateApiStatus]);

  return {
    // Data
    apiStatus,
    isLoading,
    error,
    
    // Enhanced API methods
    fetchWebinars,
    makeEnhancedRequest,
    
    // Monitoring methods
    getPerformanceMetrics,
    getDataQualityScore,
    performHealthCheck,
    updateApiStatus,
    
    // Status checks
    isHealthy: apiStatus?.overall === 'healthy',
    isDegraded: apiStatus?.overall === 'degraded',
    isUnhealthy: apiStatus?.overall === 'unhealthy'
  };
};
