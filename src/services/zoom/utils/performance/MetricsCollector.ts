
/**
 * Metrics Collection and Storage
 */

import { ApiMetric, MonitoringConfig } from './types';

export class MetricsCollector {
  private metrics: ApiMetric[] = [];

  constructor(private config: MonitoringConfig) {}

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
  }

  /**
   * Get metrics for a specific time period
   */
  getMetrics(periodMinutes?: number): ApiMetric[] {
    if (!periodMinutes) {
      return [...this.metrics];
    }

    const cutoffTime = Date.now() - (periodMinutes * 60 * 1000);
    return this.metrics.filter(m => m.timestamp >= cutoffTime);
  }

  /**
   * Get metrics grouped by operation
   */
  getMetricsByOperation(periodMinutes?: number): Record<string, ApiMetric[]> {
    const relevantMetrics = this.getMetrics(periodMinutes);
    
    return relevantMetrics.reduce((groups, metric) => {
      if (!groups[metric.operation]) {
        groups[metric.operation] = [];
      }
      groups[metric.operation].push(metric);
      return groups;
    }, {} as Record<string, ApiMetric[]>);
  }

  /**
   * Clear all metrics
   */
  clearMetrics(): void {
    this.metrics = [];
  }

  /**
   * Get total metrics count
   */
  getMetricsCount(): number {
    return this.metrics.length;
  }

  private cleanupOldMetrics(): void {
    const cutoffTime = Date.now() - (this.config.metricsRetentionDays * 24 * 60 * 60 * 1000);
    this.metrics = this.metrics.filter(m => m.timestamp >= cutoffTime);
  }
}
