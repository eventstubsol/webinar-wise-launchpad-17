
/**
 * Performance Monitoring Service for Zoom API operations
 * Collects metrics, generates reports, and provides automated alerting
 */

interface ApiMetric {
  operation: string;
  endpoint: string;
  method: string;
  responseTime: number;
  statusCode: number;
  success: boolean;
  timestamp: number;
  connectionId?: string;
  error?: string;
}

interface PerformanceStats {
  averageResponseTime: number;
  successRate: number;
  totalRequests: number;
  failedRequests: number;
  p95ResponseTime: number;
  p99ResponseTime: number;
  requestsPerMinute: number;
}

interface Alert {
  id: string;
  type: 'performance' | 'error_rate' | 'availability';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  threshold: number;
  currentValue: number;
  timestamp: number;
  acknowledged: boolean;
}

interface MonitoringConfig {
  metricsRetentionDays: number;
  alertThresholds: {
    responseTime: number;
    errorRate: number;
    availabilityRate: number;
  };
  reportingInterval: number;
}

export class PerformanceMonitoringService {
  private static instance: PerformanceMonitoringService;
  private metrics: ApiMetric[] = [];
  private alerts: Alert[] = [];
  private config: MonitoringConfig = {
    metricsRetentionDays: 7,
    alertThresholds: {
      responseTime: 5000, // 5 seconds
      errorRate: 0.1, // 10%
      availabilityRate: 0.95 // 95%
    },
    reportingInterval: 300000 // 5 minutes
  };
  
  private alertListeners: Array<(alert: Alert) => void> = [];
  private reportingTimer?: NodeJS.Timeout;

  private constructor() {
    this.startReporting();
  }

  static getInstance(): PerformanceMonitoringService {
    if (!this.instance) {
      this.instance = new PerformanceMonitoringService();
    }
    return this.instance;
  }

  /**
   * Record API operation metrics
   */
  recordMetric(metric: Omit<ApiMetric, 'timestamp'>): void {
    const fullMetric: ApiMetric = {
      ...metric,
      timestamp: Date.now()
    };
    
    this.metrics.push(fullMetric);
    this.cleanupOldMetrics();
    this.checkAlertConditions(fullMetric);
  }

  /**
   * Measure and record API operation
   */
  async measureOperation<T>(
    operation: string,
    endpoint: string,
    method: string,
    apiCall: () => Promise<T>,
    connectionId?: string
  ): Promise<T> {
    const startTime = Date.now();
    let success = false;
    let statusCode = 0;
    let error: string | undefined;

    try {
      const result = await apiCall();
      success = true;
      statusCode = 200; // Assume success
      return result;
    } catch (err) {
      success = false;
      error = err instanceof Error ? err.message : 'Unknown error';
      
      // Extract status code from error if available
      if (err && typeof err === 'object' && 'statusCode' in err) {
        statusCode = (err as any).statusCode;
      } else {
        statusCode = 500;
      }
      
      throw err;
    } finally {
      const responseTime = Date.now() - startTime;
      
      this.recordMetric({
        operation,
        endpoint,
        method,
        responseTime,
        statusCode,
        success,
        connectionId,
        error
      });
    }
  }

  /**
   * Get performance statistics for a time period
   */
  getStats(periodMinutes: number = 60): PerformanceStats {
    const cutoffTime = Date.now() - (periodMinutes * 60 * 1000);
    const relevantMetrics = this.metrics.filter(m => m.timestamp >= cutoffTime);
    
    if (relevantMetrics.length === 0) {
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

    const responseTimes = relevantMetrics.map(m => m.responseTime).sort((a, b) => a - b);
    const successfulRequests = relevantMetrics.filter(m => m.success).length;
    const failedRequests = relevantMetrics.length - successfulRequests;

    return {
      averageResponseTime: responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length,
      successRate: successfulRequests / relevantMetrics.length,
      totalRequests: relevantMetrics.length,
      failedRequests,
      p95ResponseTime: this.getPercentile(responseTimes, 0.95),
      p99ResponseTime: this.getPercentile(responseTimes, 0.99),
      requestsPerMinute: relevantMetrics.length / periodMinutes
    };
  }

  /**
   * Get performance trends over time
   */
  getTrends(hours: number = 24): Array<{ time: string; stats: PerformanceStats }> {
    const trends: Array<{ time: string; stats: PerformanceStats }> = [];
    const now = Date.now();
    const intervalMs = 60 * 60 * 1000; // 1 hour intervals
    
    for (let i = hours - 1; i >= 0; i--) {
      const endTime = now - (i * intervalMs);
      const startTime = endTime - intervalMs;
      
      const periodMetrics = this.metrics.filter(
        m => m.timestamp >= startTime && m.timestamp < endTime
      );
      
      const stats = this.calculateStatsForMetrics(periodMetrics);
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
  getOperationBreakdown(periodMinutes: number = 60): Record<string, PerformanceStats> {
    const cutoffTime = Date.now() - (periodMinutes * 60 * 1000);
    const relevantMetrics = this.metrics.filter(m => m.timestamp >= cutoffTime);
    
    const operationGroups = relevantMetrics.reduce((groups, metric) => {
      if (!groups[metric.operation]) {
        groups[metric.operation] = [];
      }
      groups[metric.operation].push(metric);
      return groups;
    }, {} as Record<string, ApiMetric[]>);
    
    const breakdown: Record<string, PerformanceStats> = {};
    
    for (const [operation, metrics] of Object.entries(operationGroups)) {
      breakdown[operation] = this.calculateStatsForMetrics(metrics);
    }
    
    return breakdown;
  }

  /**
   * Get current active alerts
   */
  getActiveAlerts(): Alert[] {
    return this.alerts.filter(alert => !alert.acknowledged);
  }

  /**
   * Acknowledge an alert
   */
  acknowledgeAlert(alertId: string): void {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert) {
      alert.acknowledged = true;
    }
  }

  /**
   * Subscribe to alert notifications
   */
  onAlert(listener: (alert: Alert) => void): () => void {
    this.alertListeners.push(listener);
    return () => {
      this.alertListeners = this.alertListeners.filter(l => l !== listener);
    };
  }

  /**
   * Generate performance report
   */
  generateReport(periodHours: number = 24): {
    summary: PerformanceStats;
    trends: Array<{ time: string; stats: PerformanceStats }>;
    breakdown: Record<string, PerformanceStats>;
    alerts: Alert[];
    recommendations: string[];
  } {
    const summary = this.getStats(periodHours * 60);
    const trends = this.getTrends(periodHours);
    const breakdown = this.getOperationBreakdown(periodHours * 60);
    const alerts = this.alerts.filter(
      a => a.timestamp >= Date.now() - (periodHours * 60 * 60 * 1000)
    );
    
    const recommendations = this.generateRecommendations(summary, breakdown);
    
    return {
      summary,
      trends,
      breakdown,
      alerts,
      recommendations
    };
  }

  private calculateStatsForMetrics(metrics: ApiMetric[]): PerformanceStats {
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

  private getPercentile(sortedArray: number[], percentile: number): number {
    if (sortedArray.length === 0) return 0;
    const index = Math.ceil(sortedArray.length * percentile) - 1;
    return sortedArray[Math.min(index, sortedArray.length - 1)];
  }

  private checkAlertConditions(metric: ApiMetric): void {
    const recentStats = this.getStats(10); // Last 10 minutes
    
    // Response time alert
    if (recentStats.averageResponseTime > this.config.alertThresholds.responseTime) {
      this.createAlert({
        type: 'performance',
        severity: 'high',
        message: `Average response time (${recentStats.averageResponseTime.toFixed(0)}ms) exceeds threshold`,
        threshold: this.config.alertThresholds.responseTime,
        currentValue: recentStats.averageResponseTime
      });
    }
    
    // Error rate alert
    if (recentStats.successRate < (1 - this.config.alertThresholds.errorRate)) {
      this.createAlert({
        type: 'error_rate',
        severity: 'critical',
        message: `Error rate (${((1 - recentStats.successRate) * 100).toFixed(1)}%) exceeds threshold`,
        threshold: this.config.alertThresholds.errorRate * 100,
        currentValue: (1 - recentStats.successRate) * 100
      });
    }
  }

  private createAlert(alertData: Omit<Alert, 'id' | 'timestamp' | 'acknowledged'>): void {
    const alert: Alert = {
      ...alertData,
      id: `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      acknowledged: false
    };
    
    this.alerts.push(alert);
    this.notifyAlertListeners(alert);
    
    // Auto-cleanup old alerts
    this.alerts = this.alerts.filter(
      a => a.timestamp > Date.now() - (24 * 60 * 60 * 1000) // Keep 24 hours
    );
  }

  private notifyAlertListeners(alert: Alert): void {
    this.alertListeners.forEach(listener => {
      try {
        listener(alert);
      } catch (error) {
        console.error('Error in alert listener:', error);
      }
    });
  }

  private generateRecommendations(
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

  private cleanupOldMetrics(): void {
    const cutoffTime = Date.now() - (this.config.metricsRetentionDays * 24 * 60 * 60 * 1000);
    this.metrics = this.metrics.filter(m => m.timestamp >= cutoffTime);
  }

  private startReporting(): void {
    this.reportingTimer = setInterval(() => {
      const stats = this.getStats(this.config.reportingInterval / (60 * 1000));
      console.log('Performance Report:', {
        timestamp: new Date().toISOString(),
        stats,
        activeAlerts: this.getActiveAlerts().length
      });
    }, this.config.reportingInterval);
  }

  /**
   * Update monitoring configuration
   */
  updateConfig(config: Partial<MonitoringConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Destroy monitoring service
   */
  destroy(): void {
    if (this.reportingTimer) {
      clearInterval(this.reportingTimer);
    }
    this.metrics = [];
    this.alerts = [];
    this.alertListeners = [];
  }
}

// Export singleton instance
export const performanceMonitor = PerformanceMonitoringService.getInstance();
