
/**
 * Alert Management and Notification System
 */

import { Alert, MonitoringConfig, PerformanceStats } from './types';

export class AlertManager {
  private alerts: Alert[] = [];
  private alertListeners: Array<(alert: Alert) => void> = [];

  constructor(private config: MonitoringConfig) {}

  /**
   * Check alert conditions based on performance stats
   */
  checkAlertConditions(stats: PerformanceStats): void {
    // Response time alert
    if (stats.averageResponseTime > this.config.alertThresholds.responseTime) {
      this.createAlert({
        type: 'performance',
        severity: 'high',
        message: `Average response time (${stats.averageResponseTime.toFixed(0)}ms) exceeds threshold`,
        threshold: this.config.alertThresholds.responseTime,
        currentValue: stats.averageResponseTime
      });
    }
    
    // Error rate alert
    if (stats.successRate < (1 - this.config.alertThresholds.errorRate)) {
      this.createAlert({
        type: 'error_rate',
        severity: 'critical',
        message: `Error rate (${((1 - stats.successRate) * 100).toFixed(1)}%) exceeds threshold`,
        threshold: this.config.alertThresholds.errorRate * 100,
        currentValue: (1 - stats.successRate) * 100
      });
    }
  }

  /**
   * Get current active alerts
   */
  getActiveAlerts(): Alert[] {
    return this.alerts.filter(alert => !alert.acknowledged);
  }

  /**
   * Get all alerts for a time period
   */
  getAlertsForPeriod(periodHours: number): Alert[] {
    const cutoffTime = Date.now() - (periodHours * 60 * 60 * 1000);
    return this.alerts.filter(a => a.timestamp >= cutoffTime);
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
   * Clear all alerts
   */
  clearAlerts(): void {
    this.alerts = [];
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
}
