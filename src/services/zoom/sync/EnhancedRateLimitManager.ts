
import { RateLimitStatus, EnhancedSyncOptions } from '@/types/zoom/enhancedSyncTypes';
import { EnhancedErrorHandler } from './EnhancedErrorHandler';

/**
 * Enhanced rate limit manager with intelligent backoff and queue management
 */
export class EnhancedRateLimitManager {
  private static readonly DEFAULT_DAILY_LIMIT = 10000;
  private static readonly DEFAULT_CONCURRENT_REQUESTS = 5;

  private rateLimitStatus: RateLimitStatus = {
    remaining: this.DEFAULT_DAILY_LIMIT,
    resetTime: Date.now() + 24 * 60 * 60 * 1000,
    dailyLimit: this.DEFAULT_DAILY_LIMIT,
    currentUsage: 0,
    isLimited: false
  };

  private requestQueue: Array<{
    id: string;
    priority: number;
    execute: () => Promise<any>;
    resolve: (value: any) => void;
    reject: (error: any) => void;
  }> = [];

  private activeRequests = 0;
  private maxConcurrentRequests: number;

  constructor(options: EnhancedSyncOptions = {}) {
    this.maxConcurrentRequests = options.maxConcurrentRequests || this.DEFAULT_CONCURRENT_REQUESTS;
  }

  async queueRequest<T>(
    requestId: string,
    priority: number,
    requestFn: () => Promise<T>
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      this.requestQueue.push({
        id: requestId,
        priority,
        execute: requestFn,
        resolve,
        reject
      });

      // Sort queue by priority (lower number = higher priority)
      this.requestQueue.sort((a, b) => a.priority - b.priority);

      this.processQueue();
    });
  }

  private async processQueue(): Promise<void> {
    if (this.activeRequests >= this.maxConcurrentRequests || this.requestQueue.length === 0) {
      return;
    }

    if (this.rateLimitStatus.isLimited) {
      const waitTime = this.rateLimitStatus.resetTime - Date.now();
      if (waitTime > 0) {
        console.log(`Rate limit active, waiting ${Math.round(waitTime / 1000)}s before processing queue`);
        setTimeout(() => this.processQueue(), Math.min(waitTime, 60000)); // Check at least every minute
        return;
      } else {
        // Reset rate limit status
        this.rateLimitStatus.isLimited = false;
        this.rateLimitStatus.remaining = this.rateLimitStatus.dailyLimit;
      }
    }

    const request = this.requestQueue.shift();
    if (!request) return;

    this.activeRequests++;

    try {
      const result = await this.executeWithRateLimit(request.execute);
      request.resolve(result);
    } catch (error) {
      const enhancedError = EnhancedErrorHandler.categorizeError(error);
      
      if (enhancedError.category === 'rate_limit') {
        // Re-queue the request for later
        this.requestQueue.unshift(request);
        this.handleRateLimit(error);
      } else {
        request.reject(enhancedError);
      }
    } finally {
      this.activeRequests--;
      // Continue processing queue
      setTimeout(() => this.processQueue(), 100);
    }
  }

  private async executeWithRateLimit<T>(requestFn: () => Promise<T>): Promise<T> {
    if (this.rateLimitStatus.remaining <= 0) {
      throw new Error('Rate limit exceeded');
    }

    try {
      const result = await requestFn();
      
      // Update rate limit status on successful request
      this.rateLimitStatus.remaining = Math.max(0, this.rateLimitStatus.remaining - 1);
      this.rateLimitStatus.currentUsage++;

      return result;
    } catch (error: any) {
      // Check if error includes rate limit headers
      if (error.headers) {
        this.updateRateLimitFromHeaders(error.headers);
      }
      throw error;
    }
  }

  private handleRateLimit(error: any): void {
    console.log('Rate limit detected, updating status and scheduling retry');
    
    this.rateLimitStatus.isLimited = true;
    this.rateLimitStatus.remaining = 0;

    // Extract retry-after header if available
    const retryAfter = error.headers?.['retry-after'] || error.retryAfter;
    if (retryAfter) {
      const retryTime = parseInt(retryAfter) * 1000; // Convert to milliseconds
      this.rateLimitStatus.resetTime = Date.now() + retryTime;
    } else {
      // Default to 1 hour if no retry-after header
      this.rateLimitStatus.resetTime = Date.now() + 60 * 60 * 1000;
    }
  }

  private updateRateLimitFromHeaders(headers: Record<string, string>): void {
    const remaining = headers['x-ratelimit-remaining'] || headers['x-rate-limit-remaining'];
    const reset = headers['x-ratelimit-reset'] || headers['x-rate-limit-reset'];
    const limit = headers['x-ratelimit-limit'] || headers['x-rate-limit-limit'];

    if (remaining) {
      this.rateLimitStatus.remaining = parseInt(remaining);
    }

    if (reset) {
      this.rateLimitStatus.resetTime = parseInt(reset) * 1000; // Convert to milliseconds
    }

    if (limit) {
      this.rateLimitStatus.dailyLimit = parseInt(limit);
    }

    // Update limited status
    this.rateLimitStatus.isLimited = this.rateLimitStatus.remaining <= 0;
  }

  getRateLimitStatus(): RateLimitStatus {
    return { ...this.rateLimitStatus };
  }

  getQueueStatus(): { queuedRequests: number; activeRequests: number; isProcessing: boolean } {
    return {
      queuedRequests: this.requestQueue.length,
      activeRequests: this.activeRequests,
      isProcessing: this.activeRequests > 0 || this.requestQueue.length > 0
    };
  }

  clearQueue(): void {
    this.requestQueue.forEach(request => {
      request.reject(new Error('Queue cleared'));
    });
    this.requestQueue = [];
  }
}
