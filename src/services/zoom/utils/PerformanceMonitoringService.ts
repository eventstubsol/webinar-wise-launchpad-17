/**
 * Performance monitoring service for Zoom API operations
 * Enhanced with pagination token metrics
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

export class PerformanceMonitoringService {
  private metrics: PerformanceMetrics[] = [];
  private readonly MAX_METRICS = 1000;

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
