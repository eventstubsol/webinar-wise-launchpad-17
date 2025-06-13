
import React from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';

interface ConnectionAlertProps {
  isConnected: boolean;
}

export const ConnectionAlert: React.FC<ConnectionAlertProps> = ({
  isConnected,
}) => {
  if (isConnected) return null;

  return (
    <Alert variant="destructive">
      <AlertCircle className="h-4 w-4" />
      <AlertDescription>
        Real-time sync updates are currently unavailable. Some information may be delayed.
      </AlertDescription>
    </Alert>
  );
};
