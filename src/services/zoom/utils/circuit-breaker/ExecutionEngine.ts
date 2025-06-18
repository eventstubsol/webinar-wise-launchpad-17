
/**
 * Circuit Breaker Execution Engine
 * Handles operation execution with circuit breaker protection
 */

import { CircuitState, CircuitBreakerConfig } from './types';
import { StateManager } from './StateManager';

export class ExecutionEngine {
  constructor(
    private stateManager: StateManager,
    private config: CircuitBreakerConfig,
    private serviceName: string
  ) {}

  /**
   * Execute a function with circuit breaker protection
   */
  async execute<T>(
    operation: () => Promise<T>,
    fallback?: () => Promise<T>
  ): Promise<T> {
    // Check if circuit should transition
    this.stateManager.checkStateTransition();

    const currentState = this.stateManager.getCurrentState();

    if (currentState === CircuitState.OPEN) {
      if (fallback) {
        console.warn(`Circuit breaker OPEN for ${this.serviceName}, using fallback`);
        return await fallback();
      }
      throw new Error(`Circuit breaker OPEN for ${this.serviceName}`);
    }

    if (currentState === CircuitState.HALF_OPEN && 
        this.stateManager.getHalfOpenRequests() >= this.config.halfOpenMaxRequests) {
      if (fallback) {
        return await fallback();
      }
      throw new Error(`Circuit breaker HALF_OPEN limit reached for ${this.serviceName}`);
    }

    // Increment counters before execution
    if (currentState === CircuitState.HALF_OPEN) {
      this.stateManager.incrementHalfOpenRequests();
    }

    try {
      const result = await operation();
      this.stateManager.onSuccess();
      return result;
    } catch (error) {
      this.stateManager.onFailure();
      
      if (fallback) {
        console.warn(`Operation failed, using fallback for ${this.serviceName}:`, error);
        return await fallback();
      }
      
      throw error;
    }
  }
}
