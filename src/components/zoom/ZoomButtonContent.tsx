
import React from 'react';
import { Loader2, Wifi, WifiOff, RefreshCw, AlertTriangle } from 'lucide-react';
import { ZoomConnection } from '@/types/zoom';
import { ZoomConnectionService } from '@/services/zoom/ZoomConnectionService';

interface ZoomButtonContentProps {
  isLoading: boolean;
  isValidating: boolean;
  connection: ZoomConnection | null;
}

export const ZoomButtonContent: React.FC<ZoomButtonContentProps> = ({
  isLoading,
  isValidating,
  connection
}) => {
  if (isLoading) {
    return (
      <>
        <Loader2 className="w-4 h-4 animate-spin" />
        Checking...
      </>
    );
  }

  if (isValidating) {
    return (
      <>
        <RefreshCw className="w-4 h-4 animate-spin" />
        Validating...
      </>
    );
  }

  if (connection) {
    const isExpired = ZoomConnectionService.isTokenExpired(connection.token_expires_at);
    
    if (isExpired) {
      return (
        <>
          <AlertTriangle className="w-4 h-4" />
          Reconnect Zoom
        </>
      );
    }
    
    return (
      <>
        <WifiOff className="w-4 h-4" />
        Disconnect Zoom
      </>
    );
  }

  return (
    <>
      <Wifi className="w-4 h-4" />
      Validate Connection
    </>
  );
};
