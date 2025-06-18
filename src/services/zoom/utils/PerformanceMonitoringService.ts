
/**
 * Performance Monitoring Service for Zoom API operations
 * Main orchestration class that coordinates metrics collection, analysis, and alerting
 */

import { MetricsCollector } from './performance/MetricsCollector';
import { PerformanceAnalyzer } from './performance/PerformanceAnalyzer';
import { AlertManager } from './performance/AlertManager';
import type { 
  ApiMetric, 
  PerformanceStats, 
  Alert, 
  MonitoringConfig, 
  PerformanceReport 
} from './performance/types';

export class PerformanceMonitoringService {
  private static instance: PerformanceMonitoringService;
  private metricsCollector: MetricsCollector;
  private analyzer: PerformanceAnalyzer;
  private alertManager: AlertManager;
  private reportingTimer?: NodeJS.Timeout;
  
  private config: MonitoringConfig = {
    metricsRetentionDays: 7,
    alertThresholds: {
      responseTime: 5000, // 5 seconds
      errorRate: 0.1, // 10%
      availabilityRate: 0.95 // 95%
    },
    reportingInterval: 300000 // 5 minutes
  };

  private constructor() {
    this.metricsCollector = new MetricsCollector(this.config);
    this.analyzer = new PerformanceAnalyzer();
    this.alertManager = new AlertManager(this.config);
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
    this.metricsCollector.recordMetric(metric);
    
    // Check for alerts with recent metrics
    const recentStats = this.getStats(10); // Last 10 minutes
    this.alertManager.checkAlertConditions(recentStats);
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
    const metrics = this.metricsCollector.getMetrics(periodMinutes);
    return this.analyzer.calculateStats(metrics);
  }

  /**
   * Get performance trends over time
   */
  getTrends(hours: number = 24): Array<{ time: string; stats: PerformanceStats }> {
    const metrics = this.metricsCollector.getMetrics();
    return this.analyzer.calculateTrends(metrics, hours);
  }

  /**
   * Get operation-specific performance breakdown
   */
  getOperationBreakdown(periodMinutes: number = 60): Record<string, PerformanceStats> {
    const metricsByOperation = this.metricsCollector.getMetricsByOperation(periodMinutes);
    return this.analyzer.calculateOperationBreakdown(metricsByOperation);
  }

  /**
   * Get current active alerts
   */
  getActiveAlerts(): Alert[] {
    return this.alertManager.getActiveAlerts();
  }

  /**
   * Acknowledge an alert
   */
  acknowledgeAlert(alertId: string): void {
    this.alertManager.acknowledgeAlert(alertId);
  }

  /**
   * Subscribe to alert notifications
   */
  onAlert(listener: (alert: Alert) => void): () => void {
    return this.alertManager.onAlert(listener);
  }

  /**
   * Generate performance report
   */
  generateReport(periodHours: number = 24): PerformanceReport {
    const summary = this.getStats(periodHours * 60);
    const trends = this.getTrends(periodHours);
    const breakdown = this.getOperationBreakdown(periodHours * 60);
    const alerts = this.alertManager.getAlertsForPeriod(periodHours);
    const recommendations = this.analyzer.generateRecommendations(summary, breakdown);
    
    return {
      summary,
      trends,
      breakdown,
      alerts,
      recommendations
    };
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
    this.metricsCollector.clearMetrics();
    this.alertManager.clearAlerts();
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
}

// Export singleton instance
export const performanceMonitor = PerformanceMonitoringService.getInstance();
