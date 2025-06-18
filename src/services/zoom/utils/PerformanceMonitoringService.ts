/**
 * Performance monitoring service for Zoom API operations
 * Enhanced with pagination token metrics and complete API
 */

export interface PerformanceMetrics {
  operation: string;
  endpoint: string;
  method: string;
  duration: number;
  success: boolean;
  error?: string;
  connectionId?: string;
  paginationUsed?: 'token' | 'legacy' | 'none';
  tokenValidation?: boolean;
  timestamp: number;
}

export interface PerformanceStats {
  averageResponseTime: number;
  successRate: number;
  totalRequests: number;
  failedRequests: number;
  requestsPerMinute: number;
}

export interface Alert {
  id: string;
  type: 'performance' | 'error_rate' | 'availability';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  threshold: number;
  currentValue: number;
  timestamp: number;
}

export class PerformanceMonitoringService {
  private metrics: PerformanceMetrics[] = [];
  private readonly MAX_METRICS = 1000;
  private alertListeners: Array<(alert: Alert) => void> = [];
  private alerts: Alert[] = [];

  /**
   * Measure the performance of an async operation
   */
  async measureOperation<T>(
    operation: string,
    endpoint: string,
    method: string,
    asyncOperation: () => Promise<T>,
    connectionId?: string,
    additionalMetrics?: Partial<PerformanceMetrics>
  ): Promise<T> {
    const startTime = performance.now();
    const timestamp = Date.now();
    
    try {
      console.log(`🔍 PERFORMANCE: Starting ${operation} on ${endpoint}`);
      
      const result = await asyncOperation();
      
      const duration = performance.now() - startTime;
      
      const metrics: PerformanceMetrics = {
        operation,
        endpoint,
        method,
        duration,
        success: true,
        connectionId,
        timestamp,
        ...additionalMetrics
      };
      
      this.recordMetrics(metrics);
      
      console.log(`✅ PERFORMANCE: ${operation} completed in ${duration.toFixed(2)}ms`);
      
      return result;
    } catch (error) {
      const duration = performance.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      const metrics: PerformanceMetrics = {
        operation,
        endpoint,
        method,
        duration,
        success: false,
        error: errorMessage,
        connectionId,
        timestamp,
        ...additionalMetrics
      };
      
      this.recordMetrics(metrics);
      
      console.error(`❌ PERFORMANCE: ${operation} failed after ${duration.toFixed(2)}ms - ${errorMessage}`);
      
      throw error;
    }
  }

  /**
   * Record performance metrics
   */
  private recordMetrics(metrics: PerformanceMetrics): void {
    this.metrics.push(metrics);
    
    // Keep only the most recent metrics
    if (this.metrics.length > this.MAX_METRICS) {
      this.metrics = this.metrics.slice(-this.MAX_METRICS);
    }

    // Check for alerts
    this.checkAlertConditions();
  }

  /**
   * Get performance statistics for a time period
   */
  getStats(periodMinutes: number = 60): PerformanceStats {
    const cutoff = Date.now() - (periodMinutes * 60 * 1000);
    const filteredMetrics = this.metrics.filter(m => m.timestamp > cutoff);

    if (filteredMetrics.length === 0) {
      return {
        averageResponseTime: 0,
        successRate: 0,
        totalRequests: 0,
        failedRequests: 0,
        requestsPerMinute: 0
      };
    }

    const totalRequests = filteredMetrics.length;
    const successfulRequests = filteredMetrics.filter(m => m.success).length;
    const failedRequests = totalRequests - successfulRequests;
    const averageResponseTime = filteredMetrics.reduce((sum, m) => sum + m.duration, 0) / totalRequests;
    const successRate = successfulRequests / totalRequests;
    
    // Calculate requests per minute
    const timeSpanMinutes = Math.max(periodMinutes, 1);
    const requestsPerMinute = totalRequests / timeSpanMinutes;

    return {
      averageResponseTime,
      successRate,
      totalRequests,
      failedRequests,
      requestsPerMinute
    };
  }

  /**
   * Get performance statistics
   */
  getPerformanceStats(operation?: string): {
    totalOperations: number;
    averageDuration: number;
    successRate: number;
    paginationMethodStats?: {
      token: number;
      legacy: number;
      none: number;
    };
  } {
    const filteredMetrics = operation 
      ? this.metrics.filter(m => m.operation === operation)
      : this.metrics;

    if (filteredMetrics.length === 0) {
      return {
        totalOperations: 0,
        averageDuration: 0,
        successRate: 0
      };
    }

    const totalOperations = filteredMetrics.length;
    const successfulOperations = filteredMetrics.filter(m => m.success).length;
    const averageDuration = filteredMetrics.reduce((sum, m) => sum + m.duration, 0) / totalOperations;
    const successRate = (successfulOperations / totalOperations) * 100;

    // Calculate pagination method statistics
    const paginationStats = {
      token: filteredMetrics.filter(m => m.paginationUsed === 'token').length,
      legacy: filteredMetrics.filter(m => m.paginationUsed === 'legacy').length,
      none: filteredMetrics.filter(m => m.paginationUsed === 'none').length
    };

    return {
      totalOperations,
      averageDuration,
      successRate,
      paginationMethodStats: paginationStats
    };
  }

  /**
   * Subscribe to performance alerts
   */
  onAlert(listener: (alert: Alert) => void): () => void {
    this.alertListeners.push(listener);
    return () => {
      this.alertListeners = this.alertListeners.filter(l => l !== listener);
    };
  }

  /**
   * Check for performance issues and create alerts
   */
  private checkAlertConditions(): void {
    const recentStats = this.getStats(5); // Last 5 minutes

    // Alert if average response time is too high
    if (recentStats.totalRequests > 5 && recentStats.averageResponseTime > 5000) {
      this.createAlert({
        type: 'performance',
        severity: 'high',
        message: `High response time: ${recentStats.averageResponseTime.toFixed(0)}ms average`,
        threshold: 5000,
        currentValue: recentStats.averageResponseTime
      });
    }

    // Alert if success rate is too low
    if (recentStats.totalRequests > 3 && recentStats.successRate < 0.8) {
      this.createAlert({
        type: 'error_rate',
        severity: 'critical',
        message: `Low success rate: ${(recentStats.successRate * 100).toFixed(1)}%`,
        threshold: 0.8,
        currentValue: recentStats.successRate
      });
    }
  }

  /**
   * Create and emit an alert
   */
  private createAlert(alertData: Omit<Alert, 'id' | 'timestamp'>): void {
    const alert: Alert = {
      ...alertData,
      id: `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now()
    };

    this.alerts.push(alert);
    
    // Keep only recent alerts (last 24 hours)
    const cutoff = Date.now() - (24 * 60 * 60 * 1000);
    this.alerts = this.alerts.filter(a => a.timestamp > cutoff);

    // Notify listeners
    this.alertListeners.forEach(listener => {
      try {
        listener(alert);
      } catch (error) {
        console.error('Error in alert listener:', error);
      }
    });
  }

  /**
   * Get recent error summary
   */
  getRecentErrors(minutes: number = 60): PerformanceMetrics[] {
    const cutoff = Date.now() - (minutes * 60 * 1000);
    return this.metrics
      .filter(m => !m.success && m.timestamp > cutoff)
      .sort((a, b) => b.timestamp - a.timestamp);
  }

  /**
   * Clear old metrics
   */
  clearOldMetrics(hoursToKeep: number = 24): void {
    const cutoff = Date.now() - (hoursToKeep * 60 * 60 * 1000);
    this.metrics = this.metrics.filter(m => m.timestamp > cutoff);
    
    console.log(`🧹 PERFORMANCE: Cleared metrics older than ${hoursToKeep} hours`);
  }

  /**
   * Log performance summary
   */
  logPerformanceSummary(): void {
    const stats = this.getPerformanceStats();
    
    console.log(`📊 PERFORMANCE SUMMARY:
      Total Operations: ${stats.totalOperations}
      Average Duration: ${stats.averageDuration.toFixed(2)}ms
      Success Rate: ${stats.successRate.toFixed(1)}%
      Pagination Methods: Token=${stats.paginationMethodStats?.token}, Legacy=${stats.paginationMethodStats?.legacy}, None=${stats.paginationMethodStats?.none}
    `);
  }
}

// Export singleton instance
export const performanceMonitor = new PerformanceMonitoringService();
