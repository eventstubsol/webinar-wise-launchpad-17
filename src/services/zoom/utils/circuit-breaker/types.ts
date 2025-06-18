
/**
 * Circuit Breaker Types and Interfaces
 */

export enum CircuitState {
  CLOSED = 'closed',
  OPEN = 'open',
  HALF_OPEN = 'half_open'
}

export interface CircuitBreakerConfig {
  failureThreshold: number;
  timeoutDuration: number;
  monitoringPeriod: number;
  halfOpenMaxRequests: number;
}

export interface CircuitBreakerMetrics {
  totalRequests: number;
  failedRequests: number;
  successRequests: number;
  lastFailureTime: number;
  consecutiveFailures: number;
}

export interface CircuitBreakerStatus {
  serviceName: string;
  state: CircuitState;
  metrics: CircuitBreakerMetrics;
  config: CircuitBreakerConfig;
  failureRate: number;
}
