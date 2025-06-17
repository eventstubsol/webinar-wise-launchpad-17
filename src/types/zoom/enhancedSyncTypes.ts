
/**
 * Enhanced sync types for improved error handling, rate limiting, and feature flags
 */

export enum ErrorCategory {
  RATE_LIMIT = 'rate_limit',
  NETWORK = 'network',
  AUTHENTICATION = 'authentication',
  API_ERROR = 'api_error',
  TIMEOUT = 'timeout',
  VALIDATION = 'validation',
  UNKNOWN = 'unknown'
}

export interface EnhancedError {
  category: ErrorCategory;
  retryable: boolean;
  retryStrategy: 'immediate' | 'linear' | 'exponential' | 'none';
  maxRetries: number;
  baseDelay: number;
  message: string;
  originalError?: any;
}

export interface EnhancedSyncOptions {
  // Test Mode
  testMode?: boolean;
  maxWebinarsInTest?: number;
  
  // Rate Limiting
  respectRateLimits?: boolean;
  maxConcurrentRequests?: number;
  customRateLimitConfig?: Record<string, number>;
  
  // Error Recovery
  enableAutoRetry?: boolean;
  maxRetryAttempts?: number;
  retryDelayStrategy?: 'immediate' | 'linear' | 'exponential';
  
  // Feature Flags
  dryRun?: boolean;
  maxWebinars?: number;
  skipValidation?: boolean;
  verboseLogging?: boolean;
  
  // Processing Control
  forceSync?: boolean;
  skipEligibilityCheck?: boolean;
  includeRegistrants?: boolean;
  includeParticipants?: boolean;
}

export interface RateLimitStatus {
  remaining: number;
  resetTime: number;
  dailyLimit: number;
  currentUsage: number;
  isLimited: boolean;
}

export interface TestModeConfig {
  enabled: boolean;
  maxWebinars: number;
  enhancedLogging: boolean;
  dryRun: boolean;
  confirmationRequired: boolean;
}

export interface RetryConfig {
  enabled: boolean;
  maxAttempts: number;
  strategy: 'immediate' | 'linear' | 'exponential';
  baseDelay: number;
  maxDelay: number;
  categorizedRetries: Record<ErrorCategory, Partial<RetryConfig>>;
}

export interface SyncProgress {
  phase: string;
  currentItem: number;
  totalItems: number;
  percentage: number;
  estimatedTimeRemaining?: number;
  currentOperation: string;
  errors: EnhancedError[];
  warnings: string[];
}
