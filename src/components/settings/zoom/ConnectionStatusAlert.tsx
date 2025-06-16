
import React from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, AlertTriangle, XCircle, Loader2 } from 'lucide-react';

interface ConnectionStatusAlertProps {
  isLoading: boolean;
  isConnected: boolean;
  isExpired: boolean;
}

export const ConnectionStatusAlert: React.FC<ConnectionStatusAlertProps> = ({
  isLoading,
  isConnected,
  isExpired
}) => {
  if (isLoading) {
    return (
      <Alert>
        <Loader2 className="h-4 w-4 animate-spin" />
        <AlertDescription>
          Checking your Zoom connection status...
        </AlertDescription>
      </Alert>
    );
  }

  if (isExpired) {
    return (
      <Alert variant="destructive">
        <XCircle className="h-4 w-4" />
        <AlertDescription>
          Your Zoom connection has expired or is invalid. Please re-validate your credentials to restore the connection.
        </AlertDescription>
      </Alert>
    );
  }

  if (isConnected) {
    return (
      <Alert className="bg-green-50 border-green-200">
        <CheckCircle className="h-4 w-4 text-green-600" />
        <AlertDescription className="text-green-800">
          Your Zoom account is successfully connected and ready to sync webinar data.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Alert variant="destructive">
      <AlertTriangle className="h-4 w-4" />
      <AlertDescription>
        No active Zoom connection found. Please validate your credentials to establish a connection.
      </AlertDescription>
    </Alert>
  );
};
