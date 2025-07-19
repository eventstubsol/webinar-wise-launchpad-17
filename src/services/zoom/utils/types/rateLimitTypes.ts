
/**
 * Rate limiting types and configurations
 */

/** Priority levels for API requests */
export enum RequestPriority {
  CRITICAL = 1,  // Token refresh, health checks
  HIGH = 2,      // Incremental sync, single webinar
  NORMAL = 3,    // Standard operations
  LOW = 4        // Background processing, analytics
}

/** Rate limit configuration for endpoints */
export interface EndpointRateLimit {
  tokensPerSecond: number;
  bucketSize: number;
  description?: string;
}

/** Token bucket state */
export interface TokenBucket {
  tokens: number;
  lastRefill: number;
  bucketSize: number;
  refillRate: number;
}

/** API request structure for queueing */
export interface QueuedApiRequest {
  id: string;
  method: string;
  endpoint: string;
  data?: any;
  priority: RequestPriority;
  connectionId: string;
  timestamp: number;
  timeout?: number;
  resolve: (value: any) => void;
  reject: (error: any) => void;
  controller: AbortController;
}

/** Rate limit status information */
export interface RateLimitInfo {
  currentTokens: number;
  maxTokens: number;
  refillRate: number;
  queueLength: number;
  estimatedWaitTime: number;
  isRateLimited: boolean;
}

/** Endpoint rate limit configurations */
export const ENDPOINT_RATE_LIMITS: Record<string, EndpointRateLimit> = {
  // User and account endpoints
  '/users/me': { tokensPerSecond: 10, bucketSize: 50, description: 'User info' },
  '/users/me/webinars': { tokensPerSecond: 5, bucketSize: 20, description: 'List webinars' },
  
  // Webinar endpoints
  '/webinars/{id}': { tokensPerSecond: 8, bucketSize: 30, description: 'Webinar details' },
  '/webinars/{id}/registrants': { tokensPerSecond: 3, bucketSize: 15, description: 'Webinar registrants' },
  '/webinars/{id}/polls': { tokensPerSecond: 8, bucketSize: 30, description: 'Webinar polls' },
  '/webinars/{id}/qa': { tokensPerSecond: 8, bucketSize: 30, description: 'Webinar Q&A' },
  
  // Report endpoints (more restrictive)
  '/report/webinars/{id}/participants': { tokensPerSecond: 2, bucketSize: 10, description: 'Participant reports' },
  '/report/webinars/{id}/polls': { tokensPerSecond: 3, bucketSize: 15, description: 'Poll reports' },
  '/report/webinars/{id}/qa': { tokensPerSecond: 3, bucketSize: 15, description: 'Q&A reports' },
  
  // Default fallback
  'default': { tokensPerSecond: 5, bucketSize: 25, description: 'Default rate limit' }
};

/** API usage statistics */
export interface ApiUsageStats {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  rateLimitedRequests: number;
  averageResponseTime: number;
  lastUsage: number;
}

/** Rate limit violation record */
export interface RateLimitViolation {
  timestamp: number;
  endpoint: string;
  connectionId: string;
  retryAfter?: number;
}

/** Connection-specific rate limit data */
export interface ConnectionRateLimit {
  connectionId: string;
  buckets: Record<string, TokenBucket>;
  stats: ApiUsageStats;
  violations: RateLimitViolation[];
  lastCleanup: number;
}
