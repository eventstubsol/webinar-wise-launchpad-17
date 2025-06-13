
import { 
  RequestPriority, 
  EndpointRateLimit, 
  TokenBucket, 
  QueuedApiRequest, 
  RateLimitInfo,
  ENDPOINT_RATE_LIMITS,
  ApiUsageStats,
  RateLimitViolation
} from './types/rateLimitTypes';
import { RateLimitStorage } from './storage/RateLimitStorage';

/**
 * Sophisticated rate limit manager using token bucket algorithm
 */
export class RateLimitManager {
  private static instance: RateLimitManager;
  private storage: RateLimitStorage;
  private requestQueue: QueuedApiRequest[] = [];
  private isProcessingQueue = false;
  private buckets: Map<string, TokenBucket> = new Map();
  private cleanupInterval: number | null = null;

  private constructor() {
    this.storage = RateLimitStorage.getInstance();
    this.startCleanupInterval();
  }

  static getInstance(): RateLimitManager {
    if (!RateLimitManager.instance) {
      RateLimitManager.instance = new RateLimitManager();
    }
    return RateLimitManager.instance;
  }

  /**
   * Initialize the rate limit manager
   */
  async initialize(): Promise<void> {
    await this.storage.initialize();
    await this.loadBucketsFromStorage();
  }

  /**
   * Check if request can proceed immediately
   */
  async checkRateLimit(endpoint: string, connectionId: string): Promise<boolean> {
    const bucketKey = this.getBucketKey(connectionId, endpoint);
    const bucket = await this.getOrCreateBucket(bucketKey, endpoint);
    
    this.refillBucket(bucket);
    
    if (bucket.tokens >= 1) {
      bucket.tokens -= 1;
      await this.saveBucket(bucketKey, bucket, connectionId, endpoint);
      return true;
    }
    
    return false;
  }

  /**
   * Queue an API request with priority
   */
  async queueRequest(
    method: string,
    endpoint: string,
    data: any,
    connectionId: string,
    priority: RequestPriority = RequestPriority.NORMAL,
    timeout: number = 30000
  ): Promise<any> {
    // Check if request can proceed immediately
    const canProceed = await this.checkRateLimit(endpoint, connectionId);
    if (canProceed) {
      return this.executeRequest(method, endpoint, data, connectionId);
    }

    // Queue the request
    return new Promise((resolve, reject) => {
      const controller = new AbortController();
      const requestId = this.generateRequestId();

      const queuedRequest: QueuedApiRequest = {
        id: requestId,
        method,
        endpoint,
        data,
        priority,
        connectionId,
        timestamp: Date.now(),
        timeout,
        resolve,
        reject,
        controller
      };

      // Insert request in priority order
      this.insertRequestByPriority(queuedRequest);

      // Set timeout
      if (timeout > 0) {
        setTimeout(() => {
          if (!controller.signal.aborted) {
            this.cancelRequest(requestId);
            reject(new Error('Request timeout'));
          }
        }, timeout);
      }

      // Process queue
      this.processQueue();
    });
  }

  /**
   * Get current rate limit status
   */
  async getRateLimitStatus(connectionId: string, endpoint?: string): Promise<RateLimitInfo> {
    const targetEndpoint = endpoint || 'default';
    const bucketKey = this.getBucketKey(connectionId, targetEndpoint);
    const bucket = await this.getOrCreateBucket(bucketKey, targetEndpoint);
    
    this.refillBucket(bucket);
    
    const queueLength = this.requestQueue.filter(r => r.connectionId === connectionId).length;
    const estimatedWaitTime = this.calculateWaitTime(bucket, queueLength);

    return {
      currentTokens: bucket.tokens,
      maxTokens: bucket.bucketSize,
      refillRate: bucket.refillRate,
      queueLength,
      estimatedWaitTime,
      isRateLimited: bucket.tokens < 1
    };
  }

  /**
   * Reset rate limit for connection
   */
  async resetRateLimit(connectionId: string, force: boolean = false): Promise<void> {
    if (force) {
      // Reset all buckets for this connection
      const bucketKeys = Array.from(this.buckets.keys()).filter(key => 
        key.startsWith(`${connectionId}:`)
      );
      
      for (const key of bucketKeys) {
        const endpoint = key.split(':')[1];
        const config = this.getEndpointConfig(endpoint);
        const bucket: TokenBucket = {
          tokens: config.bucketSize,
          lastRefill: Date.now(),
          bucketSize: config.bucketSize,
          refillRate: config.tokensPerSecond
        };
        
        this.buckets.set(key, bucket);
        await this.saveBucket(key, bucket, connectionId, endpoint);
      }
    }

    // Cancel all queued requests for this connection
    this.requestQueue = this.requestQueue.filter(request => {
      if (request.connectionId === connectionId) {
        request.controller.abort();
        request.reject(new Error('Rate limit reset'));
        return false;
      }
      return true;
    });
  }

  /**
   * Cancel a specific request
   */
  cancelRequest(requestId: string): boolean {
    const index = this.requestQueue.findIndex(r => r.id === requestId);
    if (index >= 0) {
      const request = this.requestQueue[index];
      request.controller.abort();
      request.reject(new Error('Request cancelled'));
      this.requestQueue.splice(index, 1);
      return true;
    }
    return false;
  }

  /**
   * Get API usage statistics
   */
  async getUsageStats(connectionId: string): Promise<ApiUsageStats | null> {
    const connectionData = await this.storage.loadConnectionData(connectionId);
    return connectionData?.stats || null;
  }

  /**
   * Record rate limit violation
   */
  async recordViolation(connectionId: string, endpoint: string, retryAfter?: number): Promise<void> {
    const violation: RateLimitViolation = {
      timestamp: Date.now(),
      endpoint,
      connectionId,
      retryAfter
    };

    await this.storage.recordViolation(connectionId, violation);
    await this.updateUsageStats(connectionId, { rateLimitedRequests: 1 });
  }

  /**
   * Process the request queue
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessingQueue || this.requestQueue.length === 0) {
      return;
    }

    this.isProcessingQueue = true;

    while (this.requestQueue.length > 0) {
      const request = this.requestQueue[0];
      
      // Check if request can proceed
      const canProceed = await this.checkRateLimit(request.endpoint, request.connectionId);
      if (!canProceed) {
        // Wait for next token refill
        const waitTime = this.calculateMinWaitTime(request.connectionId, request.endpoint);
        await this.delay(Math.min(waitTime, 1000)); // Max 1 second wait
        continue;
      }

      // Remove request from queue and execute
      this.requestQueue.shift();
      
      try {
        const result = await this.executeRequest(
          request.method,
          request.endpoint,
          request.data,
          request.connectionId
        );
        request.resolve(result);
      } catch (error) {
        request.reject(error);
      }
    }

    this.isProcessingQueue = false;
  }

  /**
   * Execute an API request
   */
  private async executeRequest(
    method: string,
    endpoint: string,
    data: any,
    connectionId: string
  ): Promise<any> {
    const startTime = Date.now();
    
    try {
      // This would integrate with your actual HTTP client
      // For now, return a mock response
      const response = { success: true, data: {} };
      
      const responseTime = Date.now() - startTime;
      await this.updateUsageStats(connectionId, {
        totalRequests: 1,
        successfulRequests: 1,
        averageResponseTime: responseTime
      });
      
      return response;
    } catch (error) {
      const responseTime = Date.now() - startTime;
      await this.updateUsageStats(connectionId, {
        totalRequests: 1,
        failedRequests: 1,
        averageResponseTime: responseTime
      });
      
      throw error;
    }
  }

  /**
   * Get or create token bucket for endpoint
   */
  private async getOrCreateBucket(bucketKey: string, endpoint: string): Promise<TokenBucket> {
    let bucket = this.buckets.get(bucketKey);
    
    if (!bucket) {
      // Try to load from storage
      const connectionId = bucketKey.split(':')[0];
      bucket = await this.storage.loadTokenBucket(connectionId, endpoint);
      
      if (!bucket) {
        // Create new bucket
        const config = this.getEndpointConfig(endpoint);
        bucket = {
          tokens: config.bucketSize,
          lastRefill: Date.now(),
          bucketSize: config.bucketSize,
          refillRate: config.tokensPerSecond
        };
      }
      
      this.buckets.set(bucketKey, bucket);
    }
    
    return bucket;
  }

  /**
   * Refill token bucket based on elapsed time
   */
  private refillBucket(bucket: TokenBucket): void {
    const now = Date.now();
    const elapsed = (now - bucket.lastRefill) / 1000; // Convert to seconds
    const tokensToAdd = elapsed * bucket.refillRate;
    
    bucket.tokens = Math.min(bucket.bucketSize, bucket.tokens + tokensToAdd);
    bucket.lastRefill = now;
  }

  /**
   * Save bucket to storage
   */
  private async saveBucket(
    bucketKey: string,
    bucket: TokenBucket,
    connectionId: string,
    endpoint: string
  ): Promise<void> {
    this.buckets.set(bucketKey, bucket);
    await this.storage.saveTokenBucket(connectionId, endpoint, bucket);
  }

  /**
   * Insert request in queue by priority
   */
  private insertRequestByPriority(request: QueuedApiRequest): void {
    let insertIndex = this.requestQueue.length;
    
    for (let i = 0; i < this.requestQueue.length; i++) {
      if (this.requestQueue[i].priority > request.priority) {
        insertIndex = i;
        break;
      }
    }
    
    this.requestQueue.splice(insertIndex, 0, request);
  }

  /**
   * Calculate wait time for tokens
   */
  private calculateWaitTime(bucket: TokenBucket, queueLength: number): number {
    if (bucket.tokens >= 1) return 0;
    
    const tokensNeeded = 1 - bucket.tokens;
    const timeForTokens = (tokensNeeded / bucket.refillRate) * 1000;
    const queueDelay = queueLength * (1000 / bucket.refillRate);
    
    return timeForTokens + queueDelay;
  }

  /**
   * Calculate minimum wait time for next token
   */
  private calculateMinWaitTime(connectionId: string, endpoint: string): number {
    const bucketKey = this.getBucketKey(connectionId, endpoint);
    const bucket = this.buckets.get(bucketKey);
    
    if (!bucket) return 1000;
    
    const tokensNeeded = 1 - bucket.tokens;
    return Math.max(0, (tokensNeeded / bucket.refillRate) * 1000);
  }

  /**
   * Get endpoint configuration
   */
  private getEndpointConfig(endpoint: string): EndpointRateLimit {
    // Normalize endpoint for pattern matching
    const normalizedEndpoint = endpoint.replace(/\/\d+/g, '/{id}');
    return ENDPOINT_RATE_LIMITS[normalizedEndpoint] || ENDPOINT_RATE_LIMITS.default;
  }

  /**
   * Generate bucket key
   */
  private getBucketKey(connectionId: string, endpoint: string): string {
    return `${connectionId}:${endpoint}`;
  }

  /**
   * Generate unique request ID
   */
  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Load buckets from storage
   */
  private async loadBucketsFromStorage(): Promise<void> {
    try {
      const connectionIds = await this.storage.getAllConnectionIds();
      
      for (const connectionId of connectionIds) {
        const connectionData = await this.storage.loadConnectionData(connectionId);
        if (connectionData) {
          for (const [endpoint, bucket] of Object.entries(connectionData.buckets)) {
            const bucketKey = this.getBucketKey(connectionId, endpoint);
            this.buckets.set(bucketKey, bucket);
          }
        }
      }
    } catch (error) {
      console.error('Failed to load buckets from storage:', error);
    }
  }

  /**
   * Update usage statistics
   */
  private async updateUsageStats(connectionId: string, updates: Partial<ApiUsageStats>): Promise<void> {
    try {
      await this.storage.updateUsageStats(connectionId, updates);
    } catch (error) {
      console.error('Failed to update usage stats:', error);
    }
  }

  /**
   * Start cleanup interval
   */
  private startCleanupInterval(): void {
    // Clean up old data every hour
    this.cleanupInterval = window.setInterval(async () => {
      try {
        await this.storage.cleanup();
      } catch (error) {
        console.error('Cleanup failed:', error);
      }
    }, 60 * 60 * 1000);
  }

  /**
   * Utility delay function
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    
    // Cancel all pending requests
    this.requestQueue.forEach(request => {
      request.controller.abort();
      request.reject(new Error('Rate limit manager destroyed'));
    });
    this.requestQueue = [];
  }
}

// Export singleton instance
export const rateLimitManager = RateLimitManager.getInstance();
