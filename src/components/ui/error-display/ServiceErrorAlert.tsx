import React from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface ServiceErrorAlertProps {
  error?: string;
  onRetry?: () => void;
  isRetrying?: boolean;
}

export const ServiceErrorAlert: React.FC<ServiceErrorAlertProps> = ({
  error,
  onRetry,
  isRetrying = false
}) => {
  // Map technical errors to user-friendly messages
  const getUserFriendlyMessage = (errorMsg?: string): string => {
    if (!errorMsg) return 'We encountered an issue. Please try again.';
    
    // Service unavailable errors
    if (errorMsg.includes('sleeping') || errorMsg.includes('tier limitation') || errorMsg.includes('503')) {
      return 'Our sync service is temporarily unavailable. Please try again in a few moments.';
    }
    
    // Connection errors
    if (errorMsg.includes('network') || errorMsg.includes('connection') || errorMsg.includes('ECONNREFUSED')) {
      return 'Connection issue detected. Please check your internet connection and try again.';
    }
    
    // Authentication errors
    if (errorMsg.includes('401') || errorMsg.includes('auth') || errorMsg.includes('token')) {
      return 'Your session has expired. Please refresh the page and try again.';
    }
    
    // Rate limit errors
    if (errorMsg.includes('429') || errorMsg.includes('rate limit')) {
      return 'You\'ve made too many requests. Please wait a moment before trying again.';
    }
    
    // Generic server errors
    if (errorMsg.includes('500') || errorMsg.includes('server error')) {
      return 'Something went wrong on our end. Our team has been notified.';
    }
    
    // Default message for any other errors
    return 'We encountered an issue processing your request. Please try again.';
  };

  const message = getUserFriendlyMessage(error);

  return (
    <Alert variant="destructive" className="mb-4">
      <AlertTriangle className="h-4 w-4" />
      <AlertDescription>
        <div className="space-y-2">
          <p>{message}</p>
          {onRetry && (
            <Button
              onClick={onRetry}
              disabled={isRetrying}
              variant="outline"
              size="sm"
              className="mt-2"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isRetrying ? 'animate-spin' : ''}`} />
              {isRetrying ? 'Retrying...' : 'Try Again'}
            </Button>
          )}
        </div>
      </AlertDescription>
    </Alert>
  );
};
