
/**
 * Core Cache Operations
 */

import { CacheEntry, CacheConfig, CacheSetOptions, CacheGetOptions } from './types';
import { CacheEntryManager } from './CacheEntryManager';
import { DependencyManager } from './DependencyManager';
import { CacheStatsManager } from './CacheStatsManager';

export class CacheOperations {
  private cache = new Map<string, CacheEntry<any>>();
  private entryManager: CacheEntryManager;
  private dependencyManager: DependencyManager;
  private statsManager: CacheStatsManager;

  constructor(private config: CacheConfig) {
    this.entryManager = new CacheEntryManager(config);
    this.dependencyManager = new DependencyManager();
    this.statsManager = new CacheStatsManager();
  }

  /**
   * Get cached data
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    const now = Date.now();

    if (entry && this.entryManager.isEntryValid(entry, now)) {
      this.entryManager.updateAccess(entry);
      this.statsManager.recordHit();
      return entry.data;
    }

    this.statsManager.recordMiss();
    return null;
  }

  /**
   * Set cached data
   */
  set<T>(key: string, data: T, options?: CacheSetOptions): void {
    // Evict if cache is full
    if (this.cache.size >= this.config.maxSize) {
      this.evictLeastUsed();
    }

    // Create new entry
    const entry = this.entryManager.createEntry(data, options);
    
    // Update dependency tracking
    if (options?.dependencies) {
      this.dependencyManager.addDependencies(key, options.dependencies);
    }

    // Store entry
    this.cache.set(key, entry);
    this.updateStats();
  }

  /**
   * Check if entry should be proactively refreshed
   */
  shouldProactiveRefresh(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;
    
    return this.entryManager.shouldProactiveRefresh(entry);
  }

  /**
   * Invalidate specific cache entry
   */
  invalidate(key: string): void {
    this.cache.delete(key);
    this.dependencyManager.removeDependencies(key);
    this.updateStats();
  }

  /**
   * Invalidate cache entries by dependency
   */
  invalidateByDependency(dependency: string): void {
    const keysToInvalidate = this.dependencyManager.getDependentKeys(dependency);
    if (keysToInvalidate) {
      keysToInvalidate.forEach(key => {
        this.cache.delete(key);
        this.dependencyManager.removeDependencies(key);
      });
      this.updateStats();
    }
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear();
    this.dependencyManager.clear();
    this.statsManager.reset();
  }

  /**
   * Get cache statistics
   */
  getStats() {
    return this.statsManager.getStats();
  }

  /**
   * Cleanup expired entries
   */
  cleanup(): void {
    const keysToDelete = this.entryManager.cleanupExpiredEntries(this.cache);
    
    keysToDelete.forEach(key => {
      this.cache.delete(key);
      this.dependencyManager.removeDependencies(key);
    });

    if (keysToDelete.length > 0) {
      this.updateStats();
    }
  }

  private evictLeastUsed(): void {
    const leastUsedKey = this.entryManager.findLeastUsedEntry(this.cache);
    if (leastUsedKey) {
      this.cache.delete(leastUsedKey);
      this.dependencyManager.removeDependencies(leastUsedKey);
    }
  }

  private updateStats(): void {
    this.statsManager.updateCacheMetrics(this.cache.size, this.cache);
  }
}
