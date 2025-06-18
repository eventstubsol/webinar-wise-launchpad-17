
/**
 * Performance Monitoring Types and Interfaces
 */

export interface ApiMetric {
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

export interface PerformanceStats {
  averageResponseTime: number;
  successRate: number;
  totalRequests: number;
  failedRequests: number;
  p95ResponseTime: number;
  p99ResponseTime: number;
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
  acknowledged: boolean;
}

export interface MonitoringConfig {
  metricsRetentionDays: number;
  alertThresholds: {
    responseTime: number;
    errorRate: number;
    availabilityRate: number;
  };
  reportingInterval: number;
}

export interface PerformanceReport {
  summary: PerformanceStats;
  trends: Array<{ time: string; stats: PerformanceStats }>;
  breakdown: Record<string, PerformanceStats>;
  alerts: Alert[];
  recommendations: string[];
}
