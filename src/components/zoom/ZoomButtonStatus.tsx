
import React from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, AlertTriangle, XCircle, Info } from 'lucide-react';
import { ZoomConnection } from '@/types/zoom';
import { ZoomCredentials } from '@/types/zoomCredentials';

interface ZoomButtonStatusProps {
  connection: ZoomConnection | null;
  credentials: ZoomCredentials | null;
  validationResult: any;
}

export const ZoomButtonStatus: React.FC<ZoomButtonStatusProps> = ({
  connection,
  credentials,
  validationResult
}) => {
  if (validationResult?.success) {
    return (
      <Alert className="bg-green-50 border-green-200">
        <CheckCircle className="h-4 w-4 text-green-600" />
        <AlertDescription className="text-green-800">
          Zoom connection validated successfully! Your integration is ready.
        </AlertDescription>
      </Alert>
    );
  }

  if (validationResult?.error) {
    return (
      <Alert variant="destructive">
        <XCircle className="h-4 w-4" />
        <AlertDescription>
          Validation failed: {validationResult.error}
        </AlertDescription>
      </Alert>
    );
  }

  if (!credentials) {
    return (
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          Please configure your Zoom Server-to-Server OAuth app credentials first.
        </AlertDescription>
      </Alert>
    );
  }

  if (connection && connection.access_token?.length < 50) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          Your current connection has an invalid token. Click "Validate Connection" to fix this.
        </AlertDescription>
      </Alert>
    );
  }

  return null;
};
