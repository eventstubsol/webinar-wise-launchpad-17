
/**
 * Circuit Breaker Service for Zoom API reliability
 * Prevents cascading failures when Zoom API is consistently failing
 */

export enum CircuitState {
  CLOSED = 'closed',
  OPEN = 'open',
  HALF_OPEN = 'half_open'
}

interface CircuitBreakerConfig {
  failureThreshold: number;
  timeoutDuration: number;
  monitoringPeriod: number;
  halfOpenMaxRequests: number;
}

interface CircuitBreakerMetrics {
  totalRequests: number;
  failedRequests: number;
  successRequests: number;
  lastFailureTime: number;
  consecutiveFailures: number;
}

export class CircuitBreakerService {
  private static instances = new Map<string, CircuitBreakerService>();
  
  private state: CircuitState = CircuitState.CLOSED;
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
  
  private halfOpenRequests = 0;
  private stateChangeListeners: Array<(state: CircuitState) => void> = [];

  private constructor(private serviceName: string) {}

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
    // Check if circuit should open
    this.checkStateTransition();

    if (this.state === CircuitState.OPEN) {
      if (fallback) {
        console.warn(`Circuit breaker OPEN for ${this.serviceName}, using fallback`);
        return await fallback();
      }
      throw new Error(`Circuit breaker OPEN for ${this.serviceName}`);
    }

    if (this.state === CircuitState.HALF_OPEN && this.halfOpenRequests >= this.config.halfOpenMaxRequests) {
      if (fallback) {
        return await fallback();
      }
      throw new Error(`Circuit breaker HALF_OPEN limit reached for ${this.serviceName}`);
    }

    this.metrics.totalRequests++;
    if (this.state === CircuitState.HALF_OPEN) {
      this.halfOpenRequests++;
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      
      if (fallback) {
        console.warn(`Operation failed, using fallback for ${this.serviceName}:`, error);
        return await fallback();
      }
      
      throw error;
    }
  }

  private onSuccess(): void {
    this.metrics.successRequests++;
    this.metrics.consecutiveFailures = 0;
    
    if (this.state === CircuitState.HALF_OPEN) {
      this.setState(CircuitState.CLOSED);
      this.halfOpenRequests = 0;
    }
  }

  private onFailure(): void {
    this.metrics.failedRequests++;
    this.metrics.consecutiveFailures++;
    this.metrics.lastFailureTime = Date.now();
    
    if (this.state === CircuitState.HALF_OPEN) {
      this.setState(CircuitState.OPEN);
      this.halfOpenRequests = 0;
    }
  }

  private checkStateTransition(): void {
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
          this.halfOpenRequests = 0;
        }
        break;
    }
    
    // Reset metrics if monitoring period has passed
    if (now - this.metrics.lastFailureTime >= this.config.monitoringPeriod) {
      this.resetMetrics();
    }
  }

  private setState(newState: CircuitState): void {
    if (this.state !== newState) {
      console.log(`Circuit breaker ${this.serviceName}: ${this.state} -> ${newState}`);
      this.state = newState;
      this.notifyStateChange(newState);
    }
  }

  private resetMetrics(): void {
    this.metrics = {
      totalRequests: 0,
      failedRequests: 0,
      successRequests: 0,
      lastFailureTime: 0,
      consecutiveFailures: 0
    };
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

  /**
   * Get current circuit breaker status
   */
  getStatus() {
    return {
      serviceName: this.serviceName,
      state: this.state,
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
    this.stateChangeListeners.push(listener);
    return () => {
      this.stateChangeListeners = this.stateChangeListeners.filter(l => l !== listener);
    };
  }

  /**
   * Manually reset circuit breaker
   */
  reset(): void {
    this.setState(CircuitState.CLOSED);
    this.resetMetrics();
    this.halfOpenRequests = 0;
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<CircuitBreakerConfig>): void {
    this.config = { ...this.config, ...config };
  }
}
