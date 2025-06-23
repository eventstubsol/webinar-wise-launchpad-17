// Smart sync decision logic
export interface SyncDecision {
  mode: 'full' | 'delta' | 'skip';
  reason: string;
  estimatedDuration: number; // minutes
  estimatedWebinars: number;
}

export interface SyncHistory {
  lastSyncTime?: Date;
  lastSyncType?: string;
  lastSyncWebinarCount?: number;
  lastSyncDuration?: number;
  totalWebinars?: number;
  averageSyncDuration?: number;
  failureRate?: number;
}

export interface WebinarMetrics {
  totalWebinars: number;
  recentWebinars: number; // Last 30 days
  upcomingWebinars: number;
  averageWebinarsPerMonth: number;
}

export class SmartSyncDecisionEngine {
  private readonly HOURS_THRESHOLD_FOR_DELTA = 24; // 24 hours
  private readonly DAYS_THRESHOLD_FOR_FULL = 30; // 30 days
  private readonly MIN_WEBINARS_FOR_DELTA = 10;
  private readonly MAX_DELTA_WEBINARS = 100;
  private readonly HIGH_FAILURE_RATE = 0.2; // 20%

  /**
   * Determines the optimal sync mode based on various factors
   */
  public async decideSyncMode(
    history: SyncHistory,
    metrics: WebinarMetrics,
    forceMode?: 'full' | 'delta'
  ): Promise<SyncDecision> {
    // If force mode is specified, use it
    if (forceMode) {
      return this.createDecision(
        forceMode,
        `User requested ${forceMode} sync`,
        this.estimateDuration(forceMode, metrics),
        forceMode === 'full' ? metrics.totalWebinars : metrics.recentWebinars
      );
    }

    // No previous sync - must do full sync
    if (!history.lastSyncTime) {
      return this.createDecision(
        'full',
        'No previous sync found - initial full sync required',
        this.estimateDuration('full', metrics),
        metrics.totalWebinars
      );
    }

    const hoursSinceLastSync = this.getHoursSince(history.lastSyncTime);
    const daysSinceLastSync = hoursSinceLastSync / 24;

    // Check if too much time has passed for delta sync
    if (daysSinceLastSync >= this.DAYS_THRESHOLD_FOR_FULL) {
      return this.createDecision(
        'full',
        `More than ${this.DAYS_THRESHOLD_FOR_FULL} days since last sync - full sync recommended`,
        this.estimateDuration('full', metrics),
        metrics.totalWebinars
      );
    }

    // Check failure rate
    if (history.failureRate && history.failureRate > this.HIGH_FAILURE_RATE) {
      return this.createDecision(
        'full',
        `High failure rate (${(history.failureRate * 100).toFixed(1)}%) - full sync for reliability`,
        this.estimateDuration('full', metrics),
        metrics.totalWebinars
      );
    }

    // Recent sync - might skip
    if (hoursSinceLastSync < 1) {
      return this.createDecision(
        'skip',
        'Sync completed less than 1 hour ago',
        0,
        0
      );
    }

    // Estimate changes since last sync
    const estimatedChanges = this.estimateChanges(metrics, hoursSinceLastSync);

    // Too few changes for delta
    if (estimatedChanges < this.MIN_WEBINARS_FOR_DELTA) {
      if (hoursSinceLastSync < this.HOURS_THRESHOLD_FOR_DELTA) {
        return this.createDecision(
          'skip',
          `Only ${estimatedChanges} estimated changes - too few for sync`,
          0,
          0
        );
      }
    }

    // Too many changes for efficient delta
    if (estimatedChanges > this.MAX_DELTA_WEBINARS) {
      return this.createDecision(
        'full',
        `Estimated ${estimatedChanges} changes - too many for efficient delta sync`,
        this.estimateDuration('full', metrics),
        metrics.totalWebinars
      );
    }

    // Delta sync is optimal
    return this.createDecision(
      'delta',
      `Delta sync optimal - ${estimatedChanges} estimated changes since last sync`,
      this.estimateDuration('delta', metrics, estimatedChanges),
      estimatedChanges
    );
  }

  /**
   * Analyzes sync performance and provides recommendations
   */
  public analyzeSyncPerformance(history: SyncHistory[]): {
    recommendation: string;
    metrics: {
      averageDuration: number;
      successRate: number;
      optimalTime?: string;
    };
  } {
    if (history.length === 0) {
      return {
        recommendation: 'No sync history available for analysis',
        metrics: {
          averageDuration: 0,
          successRate: 0
        }
      };
    }

    const successful = history.filter(h => h.lastSyncType !== 'failed');
    const successRate = successful.length / history.length;
    const avgDuration = successful.reduce((sum, h) => sum + (h.lastSyncDuration || 0), 0) / successful.length;

    // Find optimal sync time based on success patterns
    const syncHours = successful.map(h => h.lastSyncTime ? new Date(h.lastSyncTime).getHours() : 0);
    const hourCounts = syncHours.reduce((acc, hour) => {
      acc[hour] = (acc[hour] || 0) + 1;
      return acc;
    }, {} as Record<number, number>);

    const optimalHour = Object.entries(hourCounts)
      .sort(([, a], [, b]) => b - a)[0]?.[0];

    let recommendation = '';
    
    if (successRate < 0.8) {
      recommendation = 'Consider investigating sync failures. Success rate is below 80%.';
    } else if (avgDuration > 300) { // 5 minutes
      recommendation = 'Sync duration is high. Consider using delta sync more frequently.';
    } else {
      recommendation = 'Sync performance is optimal.';
    }

    return {
      recommendation,
      metrics: {
        averageDuration: Math.round(avgDuration),
        successRate: Math.round(successRate * 100) / 100,
        optimalTime: optimalHour ? `${optimalHour}:00` : undefined
      }
    };
  }

  private createDecision(
    mode: 'full' | 'delta' | 'skip',
    reason: string,
    estimatedDuration: number,
    estimatedWebinars: number
  ): SyncDecision {
    return {
      mode,
      reason,
      estimatedDuration,
      estimatedWebinars
    };
  }

  private getHoursSince(date: Date): number {
    return (Date.now() - date.getTime()) / (1000 * 60 * 60);
  }

  private estimateChanges(metrics: WebinarMetrics, hoursSinceSync: number): number {
    // Estimate based on average webinar creation rate
    const webinarsPerHour = metrics.averageWebinarsPerMonth / (30 * 24);
    const baseEstimate = Math.ceil(webinarsPerHour * hoursSinceSync);
    
    // Add buffer for updates to existing webinars
    const updateBuffer = Math.ceil(metrics.recentWebinars * 0.1); // Assume 10% might have updates
    
    return baseEstimate + updateBuffer;
  }

  private estimateDuration(
    mode: 'full' | 'delta',
    metrics: WebinarMetrics,
    estimatedChanges?: number
  ): number {
    // Base estimates (in minutes)
    const BASE_DURATION = 1; // Setup time
    const PER_WEBINAR_DURATION = 0.05; // 3 seconds per webinar
    
    if (mode === 'full') {
      return Math.ceil(BASE_DURATION + (metrics.totalWebinars * PER_WEBINAR_DURATION));
    } else {
      const webinarCount = estimatedChanges || metrics.recentWebinars;
      return Math.ceil(BASE_DURATION + (webinarCount * PER_WEBINAR_DURATION * 1.5)); // Delta is slightly slower per item
    }
  }
}

// Export singleton instance
export const smartSync = new SmartSyncDecisionEngine();
