
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
      console.log('🔄 Button: Connection validation successful, triggering callback...');
      setIsRefreshing(true);
      
      try {
        // Force invalidate all connection queries
        await queryClient.invalidateQueries({ queryKey: ['zoom-connection'] });
        await queryClient.invalidateQueries({ queryKey: ['zoom-connections'] });
        
        // Wait for queries to refetch
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Call the success callback
        if (onConnectionSuccess) {
          await onConnectionSuccess(connection);
        }
        
        console.log('✅ Button: Connection success callback completed');
      } catch (error) {
        console.error('❌ Button: Error in connection success callback:', error);
      } finally {
        setIsRefreshing(false);
      }
    },
    onConnectionError: (error) => {
      console.error('❌ Button: Connection error callback triggered:', error);
      setIsRefreshing(false);
      onConnectionError?.(error);
    },
  });
  
  const { handleDisconnect } = useZoomDisconnect();

  // Query to get current connection status with more aggressive refetching
  const { data: connection, isLoading: isLoadingConnection, refetch } = useQuery({
    queryKey: ['zoom-connection', user?.id],
    queryFn: async () => {
      if (!user?.id) {
        console.log('🔍 Button: No user ID for connection query');
        return null;
      }
      
      console.log('🔍 Button: Fetching connection for user:', user.id);
      const result = await ZoomConnectionService.getPrimaryConnection(user.id);
      console.log('🔍 Button: Connection query result:', result ? 'found' : 'not found');
      return result;
    },
    enabled: !!user?.id,
    refetchInterval: (data) => {
      // Refetch more frequently when we don't have a connection but expect one
      return data ? 30000 : 5000;
    },
    staleTime: 1000, // Very short stale time for immediate freshness
  });

  const getButtonVariant = () => {
    if (connection) {
      const tokenStatus = TokenUtils.getTokenStatus(connection);
      return tokenStatus === TokenStatus.INVALID || tokenStatus === TokenStatus.REFRESH_EXPIRED ? 'destructive' : 'secondary';
    }
    return variant;
  };

  const handleClick = () => {
    console.log('🖱️ Button: Click handler triggered');
    
    if (!user) {
      console.log('❌ Button: No user authenticated');
      toast({
        title: "Authentication Required",
        description: "Please log in to connect your Zoom account.",
        variant: "destructive",
      });
      return;
    }

    if (connection) {
      const tokenStatus = TokenUtils.getTokenStatus(connection);
      console.log('🔍 Button: Existing connection status:', tokenStatus);
      
      if (tokenStatus === TokenStatus.INVALID || tokenStatus === TokenStatus.REFRESH_EXPIRED) {
        console.log('🔄 Button: Starting reconnection process...');
        setIsRefreshing(true);
        startValidation();
      } else {
        console.log('🔌 Button: Disconnecting existing connection...');
        handleDisconnect(connection);
      }
    } else {
      console.log('➕ Button: Opening connection modal...');
      setShowConnectionModal(true);
    }
  };

  const handleModalConnectionSuccess = async () => {
    console.log('🎉 Button: Modal connection success triggered');
    setShowConnectionModal(false);
    setIsRefreshing(true);
    
    try {
      // Force immediate query refetch
      console.log('🔄 Button: Forcing connection query refetch...');
      await refetch();
      
      // Wait a moment for state to update
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Get the fresh connection
      const freshConnection = await ZoomConnectionService.getPrimaryConnection(user!.id);
      console.log('🔍 Button: Fresh connection check:', freshConnection ? 'found' : 'not found');
      
      if (freshConnection) {
        toast({
          title: "Success!",
          description: "Your Zoom account has been connected successfully.",
        });
        
        // Trigger the success callback
        if (onConnectionSuccess) {
          console.log('🎯 Button: Calling external success callback');
          await onConnectionSuccess(freshConnection);
        }
      } else {
        console.warn('⚠️ Button: No fresh connection found after modal success');
        toast({
          title: "Connection Status Unclear",
          description: "Please refresh the page to see the updated connection status.",
          variant: "default",
        });
      }
    } catch (error) {
      console.error('❌ Button: Error handling modal connection success:', error);
      toast({
        title: "Error",
        description: "There was an issue verifying your connection. Please refresh the page.",
        variant: "destructive",
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  const isDisabled = isLoadingConnection || isValidating || isRefreshing || !user;
  const isLoading = isLoadingConnection || isValidating || isRefreshing;

  console.log('🔍 Button: Render state:', {
    hasConnection: !!connection,
    connectionId: connection?.id,
    isLoading,
    isDisabled,
    showModal: showConnectionModal
  });

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
