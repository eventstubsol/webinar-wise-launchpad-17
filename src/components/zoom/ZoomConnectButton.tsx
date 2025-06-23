
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { ZoomConnectionService } from '@/services/zoom/ZoomConnectionService';
import { ZoomConnection } from '@/types/zoom';
import { TokenUtils, TokenStatus } from '@/services/zoom/utils/tokenUtils';
import { useZoomValidation } from '@/hooks/useZoomValidation';
import { useZoomDisconnect } from '@/hooks/useZoomDisconnect';
import { ZoomButtonContent } from './ZoomButtonContent';
import { ZoomButtonStatus } from './ZoomButtonStatus';

interface ZoomConnectButtonProps {
  onConnectionSuccess?: (connection: ZoomConnection) => void;
  onConnectionError?: (error: string) => void;
  variant?: 'default' | 'outline' | 'secondary';
  size?: 'default' | 'sm' | 'lg';
  className?: string;
}

export const ZoomConnectButton: React.FC<ZoomConnectButtonProps> = ({
  onConnectionSuccess,
  onConnectionError,
  variant = 'default',
  size = 'default',
  className = '',
}) => {
  const { toast } = useToast();
  const { isValidating, startValidation, credentials, user, validationResult } = useZoomValidation({
    onConnectionSuccess,
    onConnectionError,
  });
  const { handleDisconnect } = useZoomDisconnect();

  // Query to get current connection status
  const { data: connection, isLoading: isLoadingConnection } = useQuery({
    queryKey: ['zoom-connection', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      return await ZoomConnectionService.getPrimaryConnection(user.id);
    },
    enabled: !!user?.id,
    refetchInterval: (data) => {
      return data ? undefined : 5000;
    },
  });

  const getButtonVariant = () => {
    if (connection) {
      const tokenStatus = TokenUtils.getTokenStatus(connection);
      // Use centralized token status instead of direct expiration check
      return tokenStatus === TokenStatus.INVALID || tokenStatus === TokenStatus.REFRESH_EXPIRED ? 'destructive' : 'secondary';
    }
    return variant;
  };

  const handleClick = () => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please log in to validate your Zoom credentials.",
        variant: "destructive",
      });
      return;
    }

    if (!credentials) {
      toast({
        title: "Configuration Required",
        description: "Please configure your Zoom OAuth credentials first.",
        variant: "destructive",
      });
      return;
    }

    if (connection) {
      const tokenStatus = TokenUtils.getTokenStatus(connection);
      // Use centralized token status logic instead of direct expiration check
      if (tokenStatus === TokenStatus.INVALID || tokenStatus === TokenStatus.REFRESH_EXPIRED) {
        startValidation();
      } else {
        handleDisconnect(connection);
      }
    } else {
      startValidation();
    }
  };

  const isDisabled = isLoadingConnection || isValidating || !user || (!credentials && !connection);

  return (
    <div className="space-y-2">
      <Button
        onClick={handleClick}
        variant={getButtonVariant()}
        size={size}
        className={`gap-2 ${className}`}
        disabled={isDisabled}
      >
        <ZoomButtonContent
          isLoading={isLoadingConnection}
          isValidating={isValidating}
          connection={connection}
        />
      </Button>
      
      <ZoomButtonStatus
        connection={connection}
        credentials={credentials}
        validationResult={validationResult}
      />
    </div>
  );
};
