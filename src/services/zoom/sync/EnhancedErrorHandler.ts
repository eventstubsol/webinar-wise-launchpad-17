
import { ErrorCategory, EnhancedError } from '@/types/zoom/enhancedSyncTypes';
import { getUserFriendlyError } from '@/lib/errorHandler';

/**
 * Enhanced error handler for categorizing and managing sync errors
 */
export class EnhancedErrorHandler {
  private static readonly ERROR_PATTERNS = {
    [ErrorCategory.RATE_LIMIT]: [
      /rate limit/i,
      /too many requests/i,
      /429/,
      /quota exceeded/i
    ],
    [ErrorCategory.NETWORK]: [
      /network/i,
      /connection/i,
      /timeout/i,
      /ENOTFOUND/,
      /ECONNRESET/,
      /fetch failed/i
    ],
    [ErrorCategory.AUTHENTICATION]: [
      /unauthorized/i,
      /401/,
      /invalid token/i,
      /expired token/i,
      /authentication failed/i
    ],
    [ErrorCategory.API_ERROR]: [
      /400/,
      /404/,
      /500/,
      /internal server error/i,
      /bad request/i
    ],
    [ErrorCategory.TIMEOUT]: [
      /timeout/i,
      /timed out/i,
      /request timeout/i
    ],
    [ErrorCategory.VALIDATION]: [
      /validation/i,
      /invalid/i,
      /required/i,
      /missing/i
    ]
  };

  private static readonly RETRY_CONFIGS: Record<ErrorCategory, Partial<EnhancedError>> = {
    [ErrorCategory.RATE_LIMIT]: {
      retryable: true,
      retryStrategy: 'exponential',
      maxRetries: 5,
      baseDelay: 60000 // 1 minute
    },
    [ErrorCategory.NETWORK]: {
      retryable: true,
      retryStrategy: 'exponential',
      maxRetries: 3,
      baseDelay: 5000 // 5 seconds
    },
    [ErrorCategory.AUTHENTICATION]: {
      retryable: false,
      retryStrategy: 'none',
      maxRetries: 0,
      baseDelay: 0
    },
    [ErrorCategory.API_ERROR]: {
      retryable: true,
      retryStrategy: 'linear',
      maxRetries: 2,
      baseDelay: 10000 // 10 seconds
    },
    [ErrorCategory.TIMEOUT]: {
      retryable: true,
      retryStrategy: 'linear',
      maxRetries: 3,
      baseDelay: 15000 // 15 seconds
    },
    [ErrorCategory.VALIDATION]: {
      retryable: false,
      retryStrategy: 'none',
      maxRetries: 0,
      baseDelay: 0
    },
    [ErrorCategory.UNKNOWN]: {
      retryable: true,
      retryStrategy: 'exponential',
      maxRetries: 2,
      baseDelay: 5000
    }
  };

  static categorizeError(error: any): EnhancedError {
    const errorMessage = error?.message || error?.toString() || 'Unknown error';
    const statusCode = error?.status || error?.statusCode || error?.code;

    // Categorize based on error patterns
    let category = ErrorCategory.UNKNOWN;
    for (const [cat, patterns] of Object.entries(this.ERROR_PATTERNS)) {
      if (patterns.some(pattern => {
        if (typeof pattern === 'string') {
          return errorMessage.includes(pattern) || statusCode?.toString() === pattern;
        }
        return pattern.test(errorMessage) || pattern.test(statusCode?.toString() || '');
      })) {
        category = cat as ErrorCategory;
        break;
      }
    }

    const config = this.RETRY_CONFIGS[category];
    
    return {
      category,
      message: errorMessage,
      originalError: error,
      ...config
    } as EnhancedError;
  }

  static calculateRetryDelay(attempt: number, config: EnhancedError): number {
    const { retryStrategy, baseDelay } = config;
    
    switch (retryStrategy) {
      case 'immediate':
        return 0;
      case 'linear':
        return baseDelay * attempt;
      case 'exponential':
        return Math.min(baseDelay * Math.pow(2, attempt - 1), 300000); // Max 5 minutes
      default:
        return 0;
    }
  }

  static shouldRetry(error: EnhancedError, currentAttempt: number): boolean {
    return error.retryable && currentAttempt < error.maxRetries;
  }

  static formatErrorForUser(error: EnhancedError): string {
    // Use the centralized error handler for user-friendly messages
    const userFriendlyError = getUserFriendlyError(error.originalError || error.message);
    return userFriendlyError.action 
      ? `${userFriendlyError.message} ${userFriendlyError.action}`
      : userFriendlyError.message;
  }
}
