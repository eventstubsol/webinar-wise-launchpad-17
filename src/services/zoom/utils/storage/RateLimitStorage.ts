import { ConnectionRateLimit, TokenBucket, ApiUsageStats, RateLimitViolation } from '../types/rateLimitTypes';

/**
 * IndexedDB storage for rate limit data persistence
 */
export class RateLimitStorage {
  private static instance: RateLimitStorage;
  private db: IDBDatabase | null = null;
  private readonly dbName = 'ZoomRateLimitDB';
  private readonly dbVersion = 1;

  private constructor() {}

  static getInstance(): RateLimitStorage {
    if (!RateLimitStorage.instance) {
      RateLimitStorage.instance = new RateLimitStorage();
    }
    return RateLimitStorage.instance;
  }

  /**
   * Initialize IndexedDB connection
   */
  async initialize(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onerror = () => {
        console.error('Failed to open IndexedDB:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        // Create stores if they don't exist
        if (!db.objectStoreNames.contains('rateLimits')) {
          const rateLimitStore = db.createObjectStore('rateLimits', { keyPath: 'connectionId' });
          rateLimitStore.createIndex('lastCleanup', 'lastCleanup', { unique: false });
        }

        if (!db.objectStoreNames.contains('usageStats')) {
          const statsStore = db.createObjectStore('usageStats', { keyPath: 'connectionId' });
          statsStore.createIndex('lastUsage', 'lastUsage', { unique: false });
        }
      };
    });
  }

  /**
   * Save connection rate limit data
   */
  async saveConnectionData(connectionId: string, data: ConnectionRateLimit): Promise<void> {
    if (!this.db) await this.initialize();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['rateLimits'], 'readwrite');
      const store = transaction.objectStore('rateLimits');
      
      const request = store.put(data);
      
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Load connection rate limit data
   */
  async loadConnectionData(connectionId: string): Promise<ConnectionRateLimit | null> {
    if (!this.db) await this.initialize();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['rateLimits'], 'readonly');
      const store = transaction.objectStore('rateLimits');
      
      const request = store.get(connectionId);
      
      request.onsuccess = () => {
        resolve(request.result || null);
      };
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Save token bucket state
   */
  async saveTokenBucket(connectionId: string, endpoint: string, bucket: TokenBucket): Promise<void> {
    const connectionData = await this.loadConnectionData(connectionId);
    
    if (connectionData) {
      connectionData.buckets[endpoint] = bucket;
      await this.saveConnectionData(connectionId, connectionData);
    }
  }

  /**
   * Load token bucket state
   */
  async loadTokenBucket(connectionId: string, endpoint: string): Promise<TokenBucket | null> {
    const connectionData = await this.loadConnectionData(connectionId);
    return connectionData?.buckets[endpoint] || null;
  }

  /**
   * Update API usage statistics
   */
  async updateUsageStats(connectionId: string, stats: Partial<ApiUsageStats>): Promise<void> {
    const connectionData = await this.loadConnectionData(connectionId) || this.createDefaultConnectionData(connectionId);
    
    connectionData.stats = {
      ...connectionData.stats,
      ...stats,
      lastUsage: Date.now()
    };

    await this.saveConnectionData(connectionId, connectionData);
  }

  /**
   * Record rate limit violation
   */
  async recordViolation(connectionId: string, violation: RateLimitViolation): Promise<void> {
    const connectionData = await this.loadConnectionData(connectionId) || this.createDefaultConnectionData(connectionId);
    
    connectionData.violations.push(violation);
    
    // Keep only last 100 violations
    if (connectionData.violations.length > 100) {
      connectionData.violations = connectionData.violations.slice(-100);
    }

    await this.saveConnectionData(connectionId, connectionData);
  }

  /**
   * Get all connection IDs
   */
  async getAllConnectionIds(): Promise<string[]> {
    if (!this.db) await this.initialize();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['rateLimits'], 'readonly');
      const store = transaction.objectStore('rateLimits');
      
      const request = store.getAllKeys();
      
      request.onsuccess = () => {
        resolve(request.result as string[]);
      };
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Clean up old data
   */
  async cleanup(olderThanMs: number = 7 * 24 * 60 * 60 * 1000): Promise<void> {
    const cutoffTime = Date.now() - olderThanMs;
    const connectionIds = await this.getAllConnectionIds();

    for (const connectionId of connectionIds) {
      const data = await this.loadConnectionData(connectionId);
      if (data && data.lastCleanup < cutoffTime) {
        // Remove old violations
        data.violations = data.violations.filter(v => v.timestamp > cutoffTime);
        data.lastCleanup = Date.now();
        await this.saveConnectionData(connectionId, data);
      }
    }
  }

  /**
   * Create default connection data
   */
  private createDefaultConnectionData(connectionId: string): ConnectionRateLimit {
    return {
      connectionId,
      buckets: {},
      stats: {
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 0,
        rateLimitedRequests: 0,
        averageResponseTime: 0,
        lastUsage: Date.now()
      },
      violations: [],
      lastCleanup: Date.now()
    };
  }

  /**
   * Delete connection data
   */
  async deleteConnectionData(connectionId: string): Promise<void> {
    if (!this.db) await this.initialize();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['rateLimits'], 'readwrite');
      const store = transaction.objectStore('rateLimits');
      
      const request = store.delete(connectionId);
      
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }
}
