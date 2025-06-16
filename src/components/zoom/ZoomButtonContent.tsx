
import React from 'react';
import { Loader2, Wifi, WifiOff, RefreshCw, AlertTriangle } from 'lucide-react';
import { ZoomConnection } from '@/types/zoom';
import { TokenUtils, TokenStatus } from '@/services/zoom/utils/tokenUtils';

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
    const tokenStatus = TokenUtils.getTokenStatus(connection);
    const isServerToServer = TokenUtils.isServerToServerConnection(connection);
    
    if (tokenStatus === TokenStatus.INVALID || tokenStatus === TokenStatus.REFRESH_EXPIRED) {
      return (
        <>
          <AlertTriangle className="w-4 h-4" />
          Reconnect Zoom
        </>
      );
    }
    
    if (tokenStatus === TokenStatus.ACCESS_EXPIRED) {
      return (
        <>
          <AlertTriangle className="w-4 h-4" />
          {isServerToServer ? "Refresh Credentials" : "Reconnect Zoom"}
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
