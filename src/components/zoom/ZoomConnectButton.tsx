
import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { ZoomConnectionService } from '@/services/zoom/ZoomConnectionService';
import { ZoomConnection } from '@/types/zoom';
import { TokenUtils, TokenStatus } from '@/services/zoom/utils/tokenUtils';
import { useZoomValidation } from '@/hooks/useZoomValidation';
import { useZoomDisconnect } from '@/hooks/useZoomDisconnect';
import { ZoomButtonContent } from './ZoomButtonContent';
import { ZoomButtonStatus } from './ZoomButtonStatus';
import { ZoomConnectionModal } from './ZoomConnectionModal';
import { ZoomCredentials } from '@/types/zoomCredentials';

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
  const queryClient = useQueryClient();
  const [showConnectionModal, setShowConnectionModal] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  const { isValidating, startValidation, credentials, user, validationResult } = useZoomValidation({
    onConnectionSuccess: async (connection) => {
      console.log('🔄 Connection validation successful, triggering callback...');
      setIsRefreshing(true);
      
      try {
        // Invalidate connection queries to get fresh data
        await queryClient.invalidateQueries({ queryKey: ['zoom-connection'] });
        
        // Call the success callback
        if (onConnectionSuccess) {
          await onConnectionSuccess(connection);
        }
      } catch (error) {
        console.error('Error in connection success callback:', error);
      } finally {
        setIsRefreshing(false);
      }
    },
    onConnectionError: (error) => {
      setIsRefreshing(false);
      onConnectionError?.(error);
    },
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
        description: "Please log in to connect your Zoom account.",
        variant: "destructive",
      });
      return;
    }

    if (connection) {
      const tokenStatus = TokenUtils.getTokenStatus(connection);
      // Use centralized token status logic instead of direct expiration check
      if (tokenStatus === TokenStatus.INVALID || tokenStatus === TokenStatus.REFRESH_EXPIRED) {
        console.log('🔄 Starting reconnection process...');
        startValidation();
      } else {
        handleDisconnect(connection);
      }
    } else {
      // Open the connection modal instead of starting validation immediately
      setShowConnectionModal(true);
    }
  };

  const handleModalConnectionSuccess = async () => {
    setShowConnectionModal(false);
    setIsRefreshing(true);
    
    try {
      // Invalidate and refetch connection data
      await queryClient.invalidateQueries({ queryKey: ['zoom-connection'] });
      
      // Wait a moment for the query to refetch
      setTimeout(async () => {
        const freshConnection = await ZoomConnectionService.getPrimaryConnection(user!.id);
        if (freshConnection) {
          toast({
            title: "Success!",
            description: "Your Zoom account has been connected successfully.",
          });
          
          // Trigger the success callback
          if (onConnectionSuccess) {
            await onConnectionSuccess(freshConnection);
          }
        }
        setIsRefreshing(false);
      }, 1000);
    } catch (error) {
      console.error('Error handling modal connection success:', error);
      setIsRefreshing(false);
    }
  };

  const isDisabled = isLoadingConnection || isValidating || isRefreshing || !user;
  const isLoading = isLoadingConnection || isValidating || isRefreshing;

  return (
    <div className="flex flex-col items-center space-y-2">
      <Button
        onClick={handleClick}
        variant={getButtonVariant()}
        size={size}
        className={`gap-2 ${className}`}
        disabled={isDisabled}
      >
        <ZoomButtonContent
          isLoading={isLoading}
          isValidating={isValidating || isRefreshing}
          connection={connection}
        />
      </Button>
      
      <ZoomButtonStatus
        connection={connection}
        credentials={credentials as ZoomCredentials}
        validationResult={validationResult}
      />

      <ZoomConnectionModal
        open={showConnectionModal}
        onOpenChange={setShowConnectionModal}
        onSuccess={handleModalConnectionSuccess}
      />
    </div>
  );
};
