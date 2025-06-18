
/**
 * Cache Statistics and Metrics Management
 */

import { CacheStats } from './types';

export class CacheStatsManager {
  private stats: CacheStats = {
    hits: 0,
    misses: 0,
    hitRate: 0,
    size: 0,
    memoryUsage: 0
  };

  /**
   * Record a cache hit
   */
  recordHit(): void {
    this.stats.hits++;
    this.updateHitRate();
  }

  /**
   * Record a cache miss
   */
  recordMiss(): void {
    this.stats.misses++;
    this.updateHitRate();
  }

  /**
   * Update cache size and memory usage
   */
  updateCacheMetrics(size: number, cache: Map<string, any>): void {
    this.stats.size = size;
    this.stats.memoryUsage = this.estimateMemoryUsage(cache);
  }

  /**
   * Get current statistics
   */
  getStats(): CacheStats {
    return { ...this.stats };
  }

  /**
   * Reset all statistics
   */
  reset(): void {
    this.stats = {
      hits: 0,
      misses: 0,
      hitRate: 0,
      size: 0,
      memoryUsage: 0
    };
  }

  private updateHitRate(): void {
    const total = this.stats.hits + this.stats.misses;
    this.stats.hitRate = total > 0 ? this.stats.hits / total : 0;
  }

  private estimateMemoryUsage(cache: Map<string, any>): number {
    let totalSize = 0;
    for (const entry of cache.values()) {
      totalSize += JSON.stringify(entry.data).length * 2; // Rough estimate
    }
    return totalSize;
  }
}
