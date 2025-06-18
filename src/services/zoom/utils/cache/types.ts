
/**
 * Core cache types and interfaces
 */

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
  accessCount: number;
  lastAccess: number;
  dependencies: string[];
  etag?: string;
}

export interface CacheConfig {
  defaultTtl: number;
  maxSize: number;
  cleanupInterval: number;
  compressionThreshold: number;
}

export interface CacheStats {
  hits: number;
  misses: number;
  hitRate: number;
  size: number;
  memoryUsage: number;
}

export interface CacheSetOptions {
  ttl?: number;
  dependencies?: string[];
  etag?: string;
}

export interface CacheGetOptions {
  ttl?: number;
  dependencies?: string[];
  etag?: string;
}
