
import { QueuedRequest, RateLimitConfig } from './types';
import { HttpClient } from './httpClient';

/**
 * Rate limiting and request queue management for Zoom API
 */
export class RateLimiter {
  private requestQueue: QueuedRequest[] = [];
  private isProcessingQueue = false;
  private lastRequestTime = 0;
  private readonly rateLimitConfig: RateLimitConfig = {
    maxRequestsPerSecond: 10,
    retryAttempts: 3,
    baseDelay: 1000,
  };

  /**
   * Add request to queue
   */
  enqueueRequest(request: QueuedRequest): void {
    this.requestQueue.push(request);
    this.processQueue();
  }

  /**
   * Process the request queue with rate limiting
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessingQueue || this.requestQueue.length === 0) {
      return;
    }

    this.isProcessingQueue = true;

    while (this.requestQueue.length > 0) {
      const request = this.requestQueue.shift()!;
      
      // Rate limiting - ensure minimum delay between requests
      const timeSinceLastRequest = Date.now() - this.lastRequestTime;
      const minDelay = 1000 / this.rateLimitConfig.maxRequestsPerSecond;
      
      if (timeSinceLastRequest < minDelay) {
        await HttpClient.delay(minDelay - timeSinceLastRequest);
      }

      try {
        const result = await this.executeRequest(request);
        request.resolve(result);
      } catch (error) {
        request.reject(error);
      }

      this.lastRequestTime = Date.now();
    }

    this.isProcessingQueue = false;
  }

  /**
   * Execute a single API request with retry logic
   */
  private async executeRequest(request: QueuedRequest): Promise<any> {
    // This would be imported and used by the main API client
    // Implementation moved to ZoomApiClient for now to avoid circular dependencies
    throw new Error('Method should be implemented by ZoomApiClient');
  }

  /**
   * Get current queue status (for debugging)
   */
  getQueueStatus() {
    return {
      queueLength: this.requestQueue.length,
      isProcessing: this.isProcessingQueue,
      lastRequestTime: this.lastRequestTime,
    };
  }
}
