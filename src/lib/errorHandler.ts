/**
 * User-friendly error message handler
 * Maps technical error messages to user-friendly alternatives
 */

interface ErrorMapping {
  pattern: RegExp | string;
  message: string;
  action?: string;
}

const ERROR_MAPPINGS: ErrorMapping[] = [
  // Service availability errors
  {
    pattern: /sleeping|free tier|tier limitation/i,
    message: "The sync service is temporarily unavailable.",
    action: "Please try again in a few moments."
  },
  {
    pattern: /503|service unavailable/i,
    message: "Our servers are experiencing high demand.",
    action: "Please wait a moment and try again."
  },
  {
    pattern: /cold start|starting up|warming/i,
    message: "The service is initializing.",
    action: "Please wait a moment."
  },
  
  // Authentication errors
  {
    pattern: /401|unauthorized|auth|token expired/i,
    message: "Your session has expired.",
    action: "Please refresh the page to continue."
  },
  {
    pattern: /403|forbidden|permission/i,
    message: "You don't have permission to perform this action.",
    action: "Please contact support if you believe this is an error."
  },
  
  // Connection errors
  {
    pattern: /network|connection|ECONNREFUSED|timeout/i,
    message: "Unable to connect to our servers.",
    action: "Please check your internet connection and try again."
  },
  {
    pattern: /CORS|cross-origin/i,
    message: "There's a configuration issue.",
    action: "Our team has been notified and is working on it."
  },
  
  // Rate limiting
  {
    pattern: /429|rate limit|too many requests/i,
    message: "You've made too many requests.",
    action: "Please wait a moment before trying again."
  },
  
  // Server errors
  {
    pattern: /500|internal server|server error/i,
    message: "Something went wrong on our end.",
    action: "Our team has been notified. Please try again later."
  },
  {
    pattern: /502|bad gateway/i,
    message: "We're having trouble connecting to our services.",
    action: "Please try again in a moment."
  },
  
  // Database errors
  {
    pattern: /database|postgres|supabase/i,
    message: "We're having trouble accessing your data.",
    action: "Please try again. If the problem persists, contact support."
  },
  
  // Validation errors
  {
    pattern: /validation|invalid|required field/i,
    message: "Please check your input and try again.",
    action: "Make sure all required fields are filled correctly."
  },
  
  // Generic API errors
  {
    pattern: /API|endpoint|route not found/i,
    message: "We encountered a technical issue.",
    action: "Please try again or contact support if the problem persists."
  },
  
  // Render-specific errors (should be hidden)
  {
    pattern: /render|deployment|environment variable/i,
    message: "Our services are being updated.",
    action: "Please try again shortly."
  },
  
  // Development/technical terms that should be hidden
  {
    pattern: /stack|framework|middleware|webpack|vite|react|typescript/i,
    message: "We encountered a technical issue.",
    action: "Our team is working on it."
  }
];

export interface UserFriendlyError {
  message: string;
  action?: string;
  originalError?: string;
}

/**
 * Converts technical error messages to user-friendly ones
 */
export function getUserFriendlyError(error: string | Error | unknown): UserFriendlyError {
  const errorMessage = typeof error === 'string' 
    ? error 
    : error instanceof Error 
      ? error.message 
      : 'An unexpected error occurred';

  // Check each mapping
  for (const mapping of ERROR_MAPPINGS) {
    const pattern = mapping.pattern;
    const matches = typeof pattern === 'string' 
      ? errorMessage.toLowerCase().includes(pattern.toLowerCase())
      : pattern.test(errorMessage);
    
    if (matches) {
      return {
        message: mapping.message,
        action: mapping.action,
        originalError: process.env.NODE_ENV === 'development' ? errorMessage : undefined
      };
    }
  }

  // Default fallback
  return {
    message: "Something went wrong. Please try again.",
    action: "If the problem persists, please contact support.",
    originalError: process.env.NODE_ENV === 'development' ? errorMessage : undefined
  };
}

/**
 * Formats error for display in UI components
 */
export function formatErrorForDisplay(error: UserFriendlyError): string {
  if (error.action) {
    return `${error.message} ${error.action}`;
  }
  return error.message;
}

/**
 * Checks if an error requires user to reconnect
 */
export function requiresReconnection(error: string | Error | unknown): boolean {
  const errorMessage = typeof error === 'string' 
    ? error 
    : error instanceof Error 
      ? error.message 
      : '';

  return /401|unauthorized|token expired|invalid token|refresh failed/i.test(errorMessage);
}

/**
 * Checks if an error is temporary and should be retried
 */
export function isTemporaryError(error: string | Error | unknown): boolean {
  const errorMessage = typeof error === 'string' 
    ? error 
    : error instanceof Error 
      ? error.message 
      : '';

  return /503|starting up|cold start|rate limit|timeout|network/i.test(errorMessage);
}
