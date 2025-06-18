
/**
 * Circuit Breaker Service for Zoom API reliability
 * Prevents cascading failures when Zoom API is consistently failing
 */

import { CircuitState, CircuitBreakerConfig, CircuitBreakerMetrics, CircuitBreakerStatus } from './circuit-breaker/types';
import { StateManager } from './circuit-breaker/StateManager';
import { ExecutionEngine } from './circuit-breaker/ExecutionEngine';

export { CircuitState } from './circuit-breaker/types';

export class CircuitBreakerService {
  private static instances = new Map<string, CircuitBreakerService>();
  
  private metrics: CircuitBreakerMetrics = {
    totalRequests: 0,
    failedRequests: 0,
    successRequests: 0,
    lastFailureTime: 0,
    consecutiveFailures: 0
  };
  
  private config: CircuitBreakerConfig = {
    failureThreshold: 5,
    timeoutDuration: 60000, // 1 minute
    monitoringPeriod: 300000, // 5 minutes
    halfOpenMaxRequests: 3
  };

  private stateManager: StateManager;
  private executionEngine: ExecutionEngine;

  private constructor(private serviceName: string) {
    this.stateManager = new StateManager(this.config, this.metrics);
    this.executionEngine = new ExecutionEngine(this.stateManager, this.config, this.serviceName);
  }

  static getInstance(serviceName: string): CircuitBreakerService {
    if (!this.instances.has(serviceName)) {
      this.instances.set(serviceName, new CircuitBreakerService(serviceName));
    }
    return this.instances.get(serviceName)!;
  }

  /**
   * Execute a function with circuit breaker protection
   */
  async execute<T>(
    operation: () => Promise<T>,
    fallback?: () => Promise<T>
  ): Promise<T> {
    this.metrics.totalRequests++;
    return this.executionEngine.execute(operation, fallback);
  }

  /**
   * Get current circuit breaker status
   */
  getStatus(): CircuitBreakerStatus {
    return {
      serviceName: this.serviceName,
      state: this.stateManager.getCurrentState(),
      metrics: { ...this.metrics },
      config: { ...this.config },
      failureRate: this.metrics.totalRequests > 0 
        ? this.metrics.failedRequests / this.metrics.totalRequests 
        : 0
    };
  }

  /**
   * Subscribe to state changes
   */
  onStateChange(listener: (state: CircuitState) => void): () => void {
    return this.stateManager.onStateChange(listener);
  }

  /**
   * Manually reset circuit breaker
   */
  reset(): void {
    this.stateManager.reset();
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<CircuitBreakerConfig>): void {
    this.config = { ...this.config, ...config };
  }
}
