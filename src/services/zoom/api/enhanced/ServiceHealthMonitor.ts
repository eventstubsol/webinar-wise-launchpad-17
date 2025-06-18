
/**
 * Service Health Monitor
 * Monitors and reports on the health of all enhanced API components
 */

import { CircuitBreakerService, CircuitState } from '../../utils/CircuitBreakerService';
import { advancedCache } from '../../utils/AdvancedCacheService';
import { performanceMonitor } from '../../utils/PerformanceMonitoringService';
import { dataQualityService } from '../../utils/DataQualityService';

export class ServiceHealthMonitor {
  constructor(private circuitBreaker: CircuitBreakerService) {
    this.setupCircuitBreakerMonitoring();
  }

  /**
   * Get comprehensive service status including all components
   */
  getServiceStatus(): {
    circuitBreaker: any;
    cache: any;
    performance: any;
    dataQuality: any;
    overall: 'healthy' | 'degraded' | 'unhealthy';
  } {
    const circuitStatus = this.circuitBreaker.getStatus();
    const cacheStats = advancedCache.getStats();
    const performanceStats = performanceMonitor.getStats(60);
    const qualityScore = dataQualityService.calculateQualityScore();

    // Determine overall health
    let overall: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    
    if (circuitStatus.state === CircuitState.OPEN) {
      overall = 'unhealthy';
    } else if (
      circuitStatus.state === CircuitState.HALF_OPEN ||
      performanceStats.successRate < 0.9 ||
      qualityScore.overall < 0.8
    ) {
      overall = 'degraded';
    }

    return {
      circuitBreaker: circuitStatus,
      cache: cacheStats,
      performance: performanceStats,
      dataQuality: qualityScore,
      overall
    };
  }

  /**
   * Health check endpoint for monitoring
   */
  async performHealthCheck(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    components: any;
    timestamp: string;
  }> {
    const serviceStatus = this.getServiceStatus();
    
    return {
      status: serviceStatus.overall,
      components: serviceStatus,
      timestamp: new Date().toISOString()
    };
  }

  private setupCircuitBreakerMonitoring(): void {
    this.circuitBreaker.onStateChange((state) => {
      console.log(`Zoom API Circuit Breaker state changed to: ${state}`);
      
      if (state === CircuitState.OPEN) {
        // Invalidate cache when circuit opens to prevent serving stale data indefinitely
        advancedCache.clear();
      }
    });
  }
}
