
/**
 * Advanced Caching Service with intelligent invalidation
 * Provides response caching for frequently accessed webinar data
 */

import { CacheConfig, CacheSetOptions, CacheGetOptions } from './cache/types';
import { CacheOperations } from './cache/CacheOperations';

export class AdvancedCacheService {
  private static instance: AdvancedCacheService;
  private cacheOps: CacheOperations;
  private cleanupTimer?: NodeJS.Timeout;
  
  private config: CacheConfig = {
    defaultTtl: 300000, // 5 minutes
    maxSize: 1000,
    cleanupInterval: 60000, // 1 minute
    compressionThreshold: 10000 // 10KB
  };

  private constructor() {
    this.cacheOps = new CacheOperations(this.config);
    this.startCleanupTimer();
  }

  static getInstance(): AdvancedCacheService {
    if (!this.instance) {
      this.instance = new AdvancedCacheService();
    }
    return this.instance;
  }

  /**
   * Get cached data with intelligent warming
   */
  async get<T>(
    key: string,
    fetcher?: () => Promise<T>,
    options?: CacheGetOptions
  ): Promise<T | null> {
    const cachedData = this.cacheOps.get<T>(key);
    
    if (cachedData !== null) {
      // Proactive refresh if entry is close to expiring
      if (fetcher && this.cacheOps.shouldProactiveRefresh(key)) {
        this.proactiveRefresh(key, fetcher, options);
      }
      
      return cachedData;
    }

    // If no fetcher provided, return null
    if (!fetcher) {
      return null;
    }

    // Fetch fresh data
    try {
      const data = await fetcher();
      this.set(key, data, options);
      return data;
    } catch (error) {
      // Return stale data if available and fetch failed
      const staleData = this.cacheOps.get<T>(key);
      if (staleData !== null) {
        console.warn(`Cache: Using stale data for ${key} due to fetch error:`, error);
        return staleData;
      }
      throw error;
    }
  }

  /**
   * Set cached data with dependencies
   */
  set<T>(key: string, data: T, options?: CacheSetOptions): void {
    this.cacheOps.set(key, data, options);
  }

  /**
   * Invalidate cache entries by dependency
   */
  invalidateByDependency(dependency: string): void {
    this.cacheOps.invalidateByDependency(dependency);
  }

  /**
   * Invalidate specific cache entry
   */
  invalidate(key: string): void {
    this.cacheOps.invalidate(key);
  }

  /**
   * Warm cache with multiple entries
   */
  async warmCache(
    entries: Array<{
      key: string;
      fetcher: () => Promise<any>;
      options?: CacheSetOptions;
    }>
  ): Promise<void> {
    const promises = entries.map(async ({ key, fetcher, options }) => {
      try {
        const data = await fetcher();
        this.set(key, data, options);
      } catch (error) {
        console.error(`Cache warming failed for ${key}:`, error);
      }
    });

    await Promise.allSettled(promises);
  }

  /**
   * Get cache statistics
   */
  getStats() {
    return this.cacheOps.getStats();
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cacheOps.clear();
  }

  /**
   * Destroy cache service and cleanup timers
   */
  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }
    this.clear();
  }

  private async proactiveRefresh<T>(
    key: string,
    fetcher: () => Promise<T>,
    options?: CacheGetOptions
  ): Promise<void> {
    try {
      const data = await fetcher();
      this.set(key, data, options);
    } catch (error) {
      console.warn(`Proactive refresh failed for ${key}:`, error);
    }
  }

  private startCleanupTimer(): void {
    this.cleanupTimer = setInterval(() => {
      this.cacheOps.cleanup();
    }, this.config.cleanupInterval);
  }
}

// Export singleton instance
export const advancedCache = AdvancedCacheService.getInstance();
