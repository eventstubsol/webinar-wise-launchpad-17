
import React from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw, Settings } from 'lucide-react';
import { Link } from 'react-router-dom';
import { getUserFriendlyError, formatErrorForDisplay } from '@/lib/errorHandler';

interface ServiceStatusAlertProps {
  healthCheck: any;
  onRefresh?: () => void;
  syncState?: {
    error: string | null;
    requiresReconnection: boolean;
  };
}

export const ServiceStatusAlert: React.FC<ServiceStatusAlertProps> = ({
  healthCheck,
  onRefresh,
  syncState
}) => {
  // Show reconnection alert if required
  if (syncState?.requiresReconnection) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          <div className="space-y-2">
            <div>
              <strong>Connection Expired</strong>
            </div>
            <div>Your Zoom connection has expired and needs to be renewed. Please reconnect your account to continue syncing.</div>
            <div className="flex gap-2 mt-2">
              <Button asChild variant="default" size="sm">
                <Link to="/settings">
                  <Settings className="h-4 w-4 mr-2" />
                  Reconnect Account
                </Link>
              </Button>
            </div>
          </div>
        </AlertDescription>
      </Alert>
    );
  }

  // Show sync error alert
  if (syncState?.error && !syncState.requiresReconnection) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          <div className="space-y-2">
            <div>
              <strong>Sync Error</strong>
            </div>
            <div>{syncState.error}</div>
            <div className="flex gap-2 mt-2">
              <Button onClick={onRefresh} variant="outline" size="sm">
                <RefreshCw className="h-4 w-4 mr-2" />
                Retry
              </Button>
            </div>
          </div>
        </AlertDescription>
      </Alert>
    );
  }

  // Show service health alert
  if (!healthCheck || healthCheck.success) {
    return null;
  }

  const getAlertContent = () => {
    const error = healthCheck.error || '';
    const userFriendlyError = getUserFriendlyError(error);
    
    // Determine variant based on error type
    let variant: "default" | "destructive" = "destructive";
    if (error.includes('starting up') || error.includes('503') || error.includes('cold start')) {
      variant = "default";
    }
    
    return {
      title: "Service Status",
      description: formatErrorForDisplay(userFriendlyError),
      variant,
      actions: (
        <Button onClick={onRefresh} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Try Again
        </Button>
      )
    };
  };

  const { title, description, variant, actions } = getAlertContent();

  return (
    <Alert variant={variant}>
      <AlertTriangle className="h-4 w-4" />
      <AlertDescription>
        <div className="space-y-2">
          <div>
            <strong>{title}</strong>
          </div>
          <div>{description}</div>
          {actions}
        </div>
      </AlertDescription>
    </Alert>
  );
};
