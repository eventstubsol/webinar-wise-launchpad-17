
/**
 * Performance Statistics Calculation and Analysis
 */

import { ApiMetric, PerformanceStats } from './types';

export class PerformanceAnalyzer {
  /**
   * Calculate performance statistics for given metrics
   */
  calculateStats(metrics: ApiMetric[]): PerformanceStats {
    if (metrics.length === 0) {
      return {
        averageResponseTime: 0,
        successRate: 0,
        totalRequests: 0,
        failedRequests: 0,
        p95ResponseTime: 0,
        p99ResponseTime: 0,
        requestsPerMinute: 0
      };
    }

    const responseTimes = metrics.map(m => m.responseTime).sort((a, b) => a - b);
    const successfulRequests = metrics.filter(m => m.success).length;
    const failedRequests = metrics.length - successfulRequests;
    
    // Calculate time span for requests per minute
    const timeSpan = Math.max(
      metrics[metrics.length - 1].timestamp - metrics[0].timestamp,
      60000 // At least 1 minute
    );
    const timeSpanMinutes = timeSpan / (60 * 1000);

    return {
      averageResponseTime: responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length,
      successRate: successfulRequests / metrics.length,
      totalRequests: metrics.length,
      failedRequests,
      p95ResponseTime: this.getPercentile(responseTimes, 0.95),
      p99ResponseTime: this.getPercentile(responseTimes, 0.99),
      requestsPerMinute: metrics.length / timeSpanMinutes
    };
  }

  /**
   * Get performance trends over time
   */
  calculateTrends(metrics: ApiMetric[], hours: number = 24): Array<{ time: string; stats: PerformanceStats }> {
    const trends: Array<{ time: string; stats: PerformanceStats }> = [];
    const now = Date.now();
    const intervalMs = 60 * 60 * 1000; // 1 hour intervals
    
    for (let i = hours - 1; i >= 0; i--) {
      const endTime = now - (i * intervalMs);
      const startTime = endTime - intervalMs;
      
      const periodMetrics = metrics.filter(
        m => m.timestamp >= startTime && m.timestamp < endTime
      );
      
      const stats = this.calculateStats(periodMetrics);
      trends.push({
        time: new Date(endTime).toISOString(),
        stats
      });
    }
    
    return trends;
  }

  /**
   * Get operation-specific performance breakdown
   */
  calculateOperationBreakdown(metricsByOperation: Record<string, ApiMetric[]>): Record<string, PerformanceStats> {
    const breakdown: Record<string, PerformanceStats> = {};
    
    for (const [operation, metrics] of Object.entries(metricsByOperation)) {
      breakdown[operation] = this.calculateStats(metrics);
    }
    
    return breakdown;
  }

  /**
   * Generate performance recommendations
   */
  generateRecommendations(
    summary: PerformanceStats,
    breakdown: Record<string, PerformanceStats>
  ): string[] {
    const recommendations: string[] = [];
    
    if (summary.averageResponseTime > 3000) {
      recommendations.push('Consider implementing response caching for frequently accessed endpoints');
    }
    
    if (summary.successRate < 0.95) {
      recommendations.push('Investigate error patterns and implement better error handling');
    }
    
    // Find slowest operations
    const slowestOp = Object.entries(breakdown)
      .sort(([,a], [,b]) => b.averageResponseTime - a.averageResponseTime)[0];
    
    if (slowestOp && slowestOp[1].averageResponseTime > 5000) {
      recommendations.push(`Optimize ${slowestOp[0]} operation - it's the slowest at ${slowestOp[1].averageResponseTime.toFixed(0)}ms`);
    }
    
    return recommendations;
  }

  private getPercentile(sortedArray: number[], percentile: number): number {
    if (sortedArray.length === 0) return 0;
    const index = Math.ceil(sortedArray.length * percentile) - 1;
    return sortedArray[Math.min(index, sortedArray.length - 1)];
  }
}
