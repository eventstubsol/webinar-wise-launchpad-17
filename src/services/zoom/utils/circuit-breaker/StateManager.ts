
/**
 * Circuit Breaker State Management
 * Handles state transitions and timing logic
 */

import { CircuitState, CircuitBreakerConfig, CircuitBreakerMetrics } from './types';

export class StateManager {
  private state: CircuitState = CircuitState.CLOSED;
  private halfOpenRequests = 0;
  private stateChangeListeners: Array<(state: CircuitState) => void> = [];

  constructor(
    private config: CircuitBreakerConfig,
    private metrics: CircuitBreakerMetrics
  ) {}

  getCurrentState(): CircuitState {
    return this.state;
  }

  getHalfOpenRequests(): number {
    return this.halfOpenRequests;
  }

  incrementHalfOpenRequests(): void {
    this.halfOpenRequests++;
  }

  resetHalfOpenRequests(): void {
    this.halfOpenRequests = 0;
  }

  /**
   * Check if state should transition and perform transition if needed
   */
  checkStateTransition(): void {
    const now = Date.now();
    
    switch (this.state) {
      case CircuitState.CLOSED:
        if (this.metrics.consecutiveFailures >= this.config.failureThreshold) {
          this.setState(CircuitState.OPEN);
        }
        break;
        
      case CircuitState.OPEN:
        if (now - this.metrics.lastFailureTime >= this.config.timeoutDuration) {
          this.setState(CircuitState.HALF_OPEN);
          this.resetHalfOpenRequests();
        }
        break;
    }
    
    // Reset metrics if monitoring period has passed
    if (now - this.metrics.lastFailureTime >= this.config.monitoringPeriod) {
      this.resetMetrics();
    }
  }

  /**
   * Handle successful operation
   */
  onSuccess(): void {
    this.metrics.successRequests++;
    this.metrics.consecutiveFailures = 0;
    
    if (this.state === CircuitState.HALF_OPEN) {
      this.setState(CircuitState.CLOSED);
      this.resetHalfOpenRequests();
    }
  }

  /**
   * Handle failed operation
   */
  onFailure(): void {
    this.metrics.failedRequests++;
    this.metrics.consecutiveFailures++;
    this.metrics.lastFailureTime = Date.now();
    
    if (this.state === CircuitState.HALF_OPEN) {
      this.setState(CircuitState.OPEN);
      this.resetHalfOpenRequests();
    }
  }

  /**
   * Manually reset circuit breaker
   */
  reset(): void {
    this.setState(CircuitState.CLOSED);
    this.resetMetrics();
    this.resetHalfOpenRequests();
  }

  /**
   * Subscribe to state changes
   */
  onStateChange(listener: (state: CircuitState) => void): () => void {
    this.stateChangeListeners.push(listener);
    return () => {
      this.stateChangeListeners = this.stateChangeListeners.filter(l => l !== listener);
    };
  }

  private setState(newState: CircuitState): void {
    if (this.state !== newState) {
      console.log(`Circuit breaker state transition: ${this.state} -> ${newState}`);
      this.state = newState;
      this.notifyStateChange(newState);
    }
  }

  private resetMetrics(): void {
    this.metrics.totalRequests = 0;
    this.metrics.failedRequests = 0;
    this.metrics.successRequests = 0;
    this.metrics.lastFailureTime = 0;
    this.metrics.consecutiveFailures = 0;
  }

  private notifyStateChange(state: CircuitState): void {
    this.stateChangeListeners.forEach(listener => {
      try {
        listener(state);
      } catch (error) {
        console.error('Error in circuit breaker state change listener:', error);
      }
    });
  }
}
