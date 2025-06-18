
/**
 * Advanced Caching Service with intelligent invalidation
 * Provides response caching for frequently accessed webinar data
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
  accessCount: number;
  lastAccess: number;
  dependencies: string[];
  etag?: string;
}

interface CacheConfig {
  defaultTtl: number;
  maxSize: number;
  cleanupInterval: number;
  compressionThreshold: number;
}

interface CacheStats {
  hits: number;
  misses: number;
  hitRate: number;
  size: number;
  memoryUsage: number;
}

export class AdvancedCacheService {
  private static instance: AdvancedCacheService;
  private cache = new Map<string, CacheEntry<any>>();
  private stats: CacheStats = {
    hits: 0,
    misses: 0,
    hitRate: 0,
    size: 0,
    memoryUsage: 0
  };
  
  private config: CacheConfig = {
    defaultTtl: 300000, // 5 minutes
    maxSize: 1000,
    cleanupInterval: 60000, // 1 minute
    compressionThreshold: 10000 // 10KB
  };
  
  private cleanupTimer?: NodeJS.Timeout;
  private dependencyMap = new Map<string, Set<string>>();

  private constructor() {
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
    options?: {
      ttl?: number;
      dependencies?: string[];
      etag?: string;
    }
  ): Promise<T | null> {
    const entry = this.cache.get(key);
    const now = Date.now();

    // Check if entry exists and is valid
    if (entry && this.isEntryValid(entry, now)) {
      entry.accessCount++;
      entry.lastAccess = now;
      this.stats.hits++;
      this.updateHitRate();
      
      // Proactive refresh if entry is close to expiring
      if (fetcher && this.shouldProactiveRefresh(entry, now)) {
        this.proactiveRefresh(key, fetcher, options);
      }
      
      return entry.data;
    }

    this.stats.misses++;
    this.updateHitRate();

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
      if (entry) {
        console.warn(`Cache: Using stale data for ${key} due to fetch error:`, error);
        entry.lastAccess = now;
        return entry.data;
      }
      throw error;
    }
  }

  /**
   * Set cached data with dependencies
   */
  set<T>(
    key: string, 
    data: T, 
    options?: {
      ttl?: number;
      dependencies?: string[];
      etag?: string;
    }
  ): void {
    const now = Date.now();
    const ttl = options?.ttl || this.config.defaultTtl;
    
    // Remove old entry from dependency map
    this.removeDependencies(key);
    
    const entry: CacheEntry<T> = {
      data,
      timestamp: now,
      ttl,
      accessCount: 0,
      lastAccess: now,
      dependencies: options?.dependencies || [],
      etag: options?.etag
    };

    // Add to dependency map
    if (options?.dependencies) {
      options.dependencies.forEach(dep => {
        if (!this.dependencyMap.has(dep)) {
          this.dependencyMap.set(dep, new Set());
        }
        this.dependencyMap.get(dep)!.add(key);
      });
    }

    // Evict if cache is full
    if (this.cache.size >= this.config.maxSize) {
      this.evictLeastUsed();
    }

    this.cache.set(key, entry);
    this.updateStats();
  }

  /**
   * Invalidate cache entries by dependency
   */
  invalidateByDependency(dependency: string): void {
    const keysToInvalidate = this.dependencyMap.get(dependency);
    if (keysToInvalidate) {
      keysToInvalidate.forEach(key => {
        this.cache.delete(key);
        this.removeDependencies(key);
      });
      this.dependencyMap.delete(dependency);
      this.updateStats();
    }
  }

  /**
   * Invalidate specific cache entry
   */
  invalidate(key: string): void {
    this.cache.delete(key);
    this.removeDependencies(key);
    this.updateStats();
  }

  /**
   * Warm cache with multiple entries
   */
  async warmCache(
    entries: Array<{
      key: string;
      fetcher: () => Promise<any>;
      options?: { ttl?: number; dependencies?: string[] };
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
  getStats(): CacheStats {
    return { ...this.stats };
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear();
    this.dependencyMap.clear();
    this.stats = {
      hits: 0,
      misses: 0,
      hitRate: 0,
      size: 0,
      memoryUsage: 0
    };
  }

  private isEntryValid(entry: CacheEntry<any>, now: number): boolean {
    return (now - entry.timestamp) < entry.ttl;
  }

  private shouldProactiveRefresh(entry: CacheEntry<any>, now: number): boolean {
    const age = now - entry.timestamp;
    const refreshThreshold = entry.ttl * 0.8; // Refresh when 80% of TTL elapsed
    return age > refreshThreshold && entry.accessCount > 2;
  }

  private async proactiveRefresh<T>(
    key: string,
    fetcher: () => Promise<T>,
    options?: { ttl?: number; dependencies?: string[] }
  ): Promise<void> {
    try {
      const data = await fetcher();
      this.set(key, data, options);
    } catch (error) {
      console.warn(`Proactive refresh failed for ${key}:`, error);
    }
  }

  private evictLeastUsed(): void {
    let leastUsedKey: string | null = null;
    let leastUsedScore = Infinity;
    const now = Date.now();

    for (const [key, entry] of this.cache.entries()) {
      // Score based on access frequency and recency
      const score = entry.accessCount / Math.max(1, (now - entry.lastAccess) / 1000);
      if (score < leastUsedScore) {
        leastUsedScore = score;
        leastUsedKey = key;
      }
    }

    if (leastUsedKey) {
      this.cache.delete(leastUsedKey);
      this.removeDependencies(leastUsedKey);
    }
  }

  private removeDependencies(key: string): void {
    for (const [dep, keys] of this.dependencyMap.entries()) {
      keys.delete(key);
      if (keys.size === 0) {
        this.dependencyMap.delete(dep);
      }
    }
  }

  private updateHitRate(): void {
    const total = this.stats.hits + this.stats.misses;
    this.stats.hitRate = total > 0 ? this.stats.hits / total : 0;
  }

  private updateStats(): void {
    this.stats.size = this.cache.size;
    this.stats.memoryUsage = this.estimateMemoryUsage();
  }

  private estimateMemoryUsage(): number {
    let totalSize = 0;
    for (const entry of this.cache.values()) {
      totalSize += JSON.stringify(entry.data).length * 2; // Rough estimate
    }
    return totalSize;
  }

  private startCleanupTimer(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanup();
    }, this.config.cleanupInterval);
  }

  private cleanup(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];

    for (const [key, entry] of this.cache.entries()) {
      if (!this.isEntryValid(entry, now)) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach(key => {
      this.cache.delete(key);
      this.removeDependencies(key);
    });

    if (keysToDelete.length > 0) {
      this.updateStats();
    }
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
}

// Export singleton instance
export const advancedCache = AdvancedCacheService.getInstance();
