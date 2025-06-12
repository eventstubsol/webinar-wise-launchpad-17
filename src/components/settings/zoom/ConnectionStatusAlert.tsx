
import React from 'react';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, AlertCircle, Clock } from 'lucide-react';

interface ConnectionStatusAlertProps {
  isLoading: boolean;
  isConnected: boolean;
  isExpired: boolean;
}

export const ConnectionStatusAlert: React.FC<ConnectionStatusAlertProps> = ({
  isLoading,
  isConnected,
  isExpired,
}) => {
  if (isLoading) {
    return (
      <Alert>
        <Clock className="h-4 w-4" />
        <AlertTitle>Loading</AlertTitle>
        <AlertDescription>Checking connection status...</AlertDescription>
      </Alert>
    );
  }

  if (!isConnected) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Not Connected</AlertTitle>
        <AlertDescription>
          Connect your Zoom account to start syncing webinar data and analytics.
        </AlertDescription>
      </Alert>
    );
  }

  if (isExpired) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Connection Expired</AlertTitle>
        <AlertDescription>
          Your Zoom connection has expired. Please reconnect to continue syncing data.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Alert className="border-green-200 bg-green-50">
      <CheckCircle className="h-4 w-4 text-green-600" />
      <AlertTitle className="text-green-800">Connected</AlertTitle>
      <AlertDescription className="text-green-700">
        Your Zoom account is connected and active.
      </AlertDescription>
    </Alert>
  );
};
