
import React from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, AlertTriangle, XCircle, Info } from 'lucide-react';
import { ZoomConnection } from '@/types/zoom';
import { ZoomCredentials } from '@/types/zoomCredentials';
import { TokenUtils, TokenStatus } from '@/services/zoom/utils/tokenUtils';

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

  if (connection) {
    const tokenStatus = TokenUtils.getTokenStatus(connection);
    const isServerToServer = TokenUtils.isServerToServerConnection(connection);
    
    if (tokenStatus === TokenStatus.INVALID || tokenStatus === TokenStatus.REFRESH_EXPIRED) {
      return (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Your {isServerToServer ? 'Server-to-Server credentials are invalid' : 'connection has expired'}. 
            Click "{isServerToServer ? 'Validate Connection' : 'Reconnect Zoom'}" to fix this.
          </AlertDescription>
        </Alert>
      );
    }
    
    if (tokenStatus === TokenStatus.ACCESS_EXPIRED) {
      return (
        <Alert className="bg-yellow-50 border-yellow-200">
          <AlertTriangle className="h-4 w-4 text-yellow-600" />
          <AlertDescription className="text-yellow-800">
            Your {isServerToServer ? 'access token needs refresh' : 'connection needs to be renewed'}. 
            Click to {isServerToServer ? 'refresh' : 'reconnect'}.
          </AlertDescription>
        </Alert>
      );
    }
  }

  return null;
};
