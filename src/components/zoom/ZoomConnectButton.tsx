
import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { ZoomConnectionService } from '@/services/zoom/ZoomConnectionService';
import { ZoomConnection } from '@/types/zoom';
import { Link, CheckCircle, AlertCircle, Loader } from 'lucide-react';
import { useZoomCredentials } from '@/hooks/useZoomCredentials';
import { supabase } from '@/integrations/supabase/client';

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
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isValidating, setIsValidating] = useState(false);
  const { credentials } = useZoomCredentials();

  // Query to get current connection status
  const { data: connection, isLoading: isLoadingConnection } = useQuery({
    queryKey: ['zoom-connection', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      return await ZoomConnectionService.getPrimaryConnection(user.id);
    },
    enabled: !!user?.id,
    refetchInterval: (data) => {
      // Poll more frequently when no connection exists
      return data ? undefined : 5000;
    },
  });

  // Mutation to validate Zoom credentials
  const validateCredentialsMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) {
        throw new Error('User not authenticated');
      }

      if (!credentials) {
        throw new Error('Zoom credentials not configured');
      }

      // Get the session token for authentication
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        throw new Error('No valid session found');
      }

      // Call the edge function to validate credentials
      const response = await fetch('/functions/v1/validate-zoom-credentials', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to validate credentials');
      }

      return await response.json();
    },
    onSuccess: (result) => {
      setIsValidating(false);
      
      // Refresh connection query
      queryClient.invalidateQueries({ queryKey: ['zoom-connection'] });
      
      toast({
        title: "Success!",
        description: "Your Zoom credentials have been validated and connection established.",
      });
      
      if (result.connection) {
        onConnectionSuccess?.(result.connection);
      }
    },
    onError: (error: Error) => {
      setIsValidating(false);
      const errorMessage = error.message || 'Failed to validate Zoom credentials';
      toast({
        title: "Validation Failed",
        description: errorMessage,
        variant: "destructive",
      });
      onConnectionError?.(errorMessage);
    },
  });

  const handleDisconnect = async () => {
    if (!connection) return;

    try {
      const success = await ZoomConnectionService.deleteConnection(connection.id);
      if (success) {
        queryClient.invalidateQueries({ queryKey: ['zoom-connection'] });
        toast({
          title: "Disconnected",
          description: "Your Zoom account has been disconnected.",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to disconnect Zoom account.",
        variant: "destructive",
      });
    }
  };

  const getButtonContent = () => {
    if (isLoadingConnection || isValidating) {
      return (
        <>
          <Loader className="h-4 w-4 animate-spin" />
          <span>{isValidating ? 'Validating...' : 'Loading...'}</span>
        </>
      );
    }

    if (connection) {
      const isExpired = ZoomConnectionService.isTokenExpired(connection.token_expires_at);
      
      if (isExpired) {
        return (
          <>
            <AlertCircle className="h-4 w-4" />
            <span>Revalidate Credentials</span>
          </>
        );
      }

      return (
        <>
          <CheckCircle className="h-4 w-4" />
          <span>Credentials Validated</span>
        </>
      );
    }

    return (
      <>
        <Link className="h-4 w-4" />
        <span>Validate Credentials</span>
      </>
    );
  };

  const getButtonVariant = () => {
    if (connection) {
      const isExpired = ZoomConnectionService.isTokenExpired(connection.token_expires_at);
      return isExpired ? 'destructive' : 'secondary';
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
      const isExpired = ZoomConnectionService.isTokenExpired(connection.token_expires_at);
      if (isExpired) {
        // Revalidate credentials
        setIsValidating(true);
        validateCredentialsMutation.mutate();
      } else {
        // Show disconnect option
        handleDisconnect();
      }
    } else {
      // Start validation
      setIsValidating(true);
      validateCredentialsMutation.mutate();
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
        {getButtonContent()}
      </Button>
      
      {connection && !ZoomConnectionService.isTokenExpired(connection.token_expires_at) && (
        <div className="text-xs text-muted-foreground">
          Validated for: {connection.zoom_email}
        </div>
      )}
      
      {!credentials && !connection && (
        <div className="text-xs text-muted-foreground">
          Configure OAuth credentials to enable validation
        </div>
      )}
    </div>
  );
};
