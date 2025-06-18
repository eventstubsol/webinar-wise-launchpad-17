
/**
 * Cache Entry Lifecycle Management
 */

import { CacheEntry, CacheConfig, CacheSetOptions } from './types';

export class CacheEntryManager {
  constructor(private config: CacheConfig) {}

  /**
   * Create a new cache entry
   */
  createEntry<T>(
    data: T,
    options?: CacheSetOptions
  ): CacheEntry<T> {
    const now = Date.now();
    const ttl = options?.ttl || this.config.defaultTtl;
    
    return {
      data,
      timestamp: now,
      ttl,
      accessCount: 0,
      lastAccess: now,
      dependencies: options?.dependencies || [],
      etag: options?.etag
    };
  }

  /**
   * Check if entry is valid (not expired)
   */
  isEntryValid(entry: CacheEntry<any>, now: number = Date.now()): boolean {
    return (now - entry.timestamp) < entry.ttl;
  }

  /**
   * Update entry access information
   */
  updateAccess<T>(entry: CacheEntry<T>): void {
    entry.accessCount++;
    entry.lastAccess = Date.now();
  }

  /**
   * Check if entry should be proactively refreshed
   */
  shouldProactiveRefresh(entry: CacheEntry<any>, now: number = Date.now()): boolean {
    const age = now - entry.timestamp;
    const refreshThreshold = entry.ttl * 0.8; // Refresh when 80% of TTL elapsed
    return age > refreshThreshold && entry.accessCount > 2;
  }

  /**
   * Calculate entry score for eviction (lower score = more likely to evict)
   */
  calculateEvictionScore(entry: CacheEntry<any>, now: number = Date.now()): number {
    // Score based on access frequency and recency
    return entry.accessCount / Math.max(1, (now - entry.lastAccess) / 1000);
  }

  /**
   * Find least used entry for eviction
   */
  findLeastUsedEntry(cache: Map<string, CacheEntry<any>>): string | null {
    let leastUsedKey: string | null = null;
    let leastUsedScore = Infinity;
    const now = Date.now();

    for (const [key, entry] of cache.entries()) {
      const score = this.calculateEvictionScore(entry, now);
      if (score < leastUsedScore) {
        leastUsedScore = score;
        leastUsedKey = key;
      }
    }

    return leastUsedKey;
  }

  /**
   * Clean up expired entries
   */
  cleanupExpiredEntries(cache: Map<string, CacheEntry<any>>): string[] {
    const now = Date.now();
    const keysToDelete: string[] = [];

    for (const [key, entry] of cache.entries()) {
      if (!this.isEntryValid(entry, now)) {
        keysToDelete.push(key);
      }
    }

    return keysToDelete;
  }
}
