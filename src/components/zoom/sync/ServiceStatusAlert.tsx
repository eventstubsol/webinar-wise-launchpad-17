
import React from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw, ExternalLink, Settings } from 'lucide-react';
import { Link } from 'react-router-dom';

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
    
    if (error.includes('starting up') || error.includes('unavailable')) {
      return {
        title: "Service Starting Up",
        description: "The Render sync service is starting up. This usually takes 1-2 minutes for cold starts.",
        variant: "default" as const,
        actions: (
          <div className="flex gap-2 mt-2">
            <Button onClick={onRefresh} variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              Check Again
            </Button>
            <Button asChild variant="outline" size="sm">
              <a 
                href="https://dashboard.render.com" 
                target="_blank" 
                rel="noopener noreferrer"
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Render Status
              </a>
            </Button>
          </div>
        )
      };
    }
    
    if (error.includes('environment variables') || error.includes('Internal server error')) {
      return {
        title: "Service Configuration Issue",
        description: "The sync service has a configuration problem. Please check that all environment variables are properly set in your Render service.",
        variant: "destructive" as const,
        actions: (
          <div className="flex gap-2 mt-2">
            <Button onClick={onRefresh} variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
            <Button asChild variant="outline" size="sm">
              <a 
                href="https://dashboard.render.com" 
                target="_blank" 
                rel="noopener noreferrer"
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Check Render Config
              </a>
            </Button>
          </div>
        )
      };
    }
    
    return {
      title: "Service Unavailable",
      description: error || "The sync service is currently unavailable. Please try again later.",
      variant: "destructive" as const,
      actions: (
        <Button onClick={onRefresh} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Retry
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
