
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
  const [isConnecting, setIsConnecting] = useState(false);
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

  // Mutation to handle OAuth initiation
  const initiateOAuthMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) {
        throw new Error('User not authenticated');
      }

      if (!credentials) {
        throw new Error('Zoom credentials not configured');
      }

      // Generate secure state parameter
      const state = crypto.randomUUID();
      
      // Store state in sessionStorage for validation
      sessionStorage.setItem('zoom_oauth_state', state);
      
      // Construct OAuth URL using user's credentials
      const baseUrl = 'https://zoom.us/oauth/authorize';
      const redirectUri = `${window.location.origin}/auth/zoom/callback`;
      const scope = 'webinar:read:admin webinar:write:admin user:read:admin';
      
      const oauthUrl = new URL(baseUrl);
      oauthUrl.searchParams.set('response_type', 'code');
      oauthUrl.searchParams.set('client_id', credentials.client_id);
      oauthUrl.searchParams.set('redirect_uri', redirectUri);
      oauthUrl.searchParams.set('scope', scope);
      oauthUrl.searchParams.set('state', state);
      
      return oauthUrl.toString();
    },
    onSuccess: (oauthUrl) => {
      setIsConnecting(true);
      // Redirect to Zoom OAuth
      window.location.href = oauthUrl;
    },
    onError: (error: Error) => {
      const errorMessage = error.message || 'Failed to initiate Zoom connection';
      toast({
        title: "Connection Error",
        description: errorMessage,
        variant: "destructive",
      });
      onConnectionError?.(errorMessage);
      setIsConnecting(false);
    },
  });

  // Check for OAuth callback on component mount
  React.useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const state = urlParams.get('state');
    const storedState = sessionStorage.getItem('zoom_oauth_state');

    if (code && state && storedState === state) {
      handleOAuthCallback(code, state);
      
      // Clean up URL parameters
      const cleanUrl = window.location.pathname;
      window.history.replaceState({}, document.title, cleanUrl);
    }
  }, []);

  const handleOAuthCallback = async (code: string, state: string) => {
    if (!user?.id || !credentials) return;

    setIsConnecting(true);
    
    try {
      // Get the session token for authentication
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        throw new Error('No valid session found');
      }

      // Call the edge function to exchange the code for tokens
      const response = await fetch('/api/zoom-oauth-exchange', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          code,
          state,
          redirectUri: `${window.location.origin}/auth/zoom/callback`,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to complete OAuth exchange');
      }

      const result = await response.json();
      
      if (result.success) {
        // Clear OAuth state
        sessionStorage.removeItem('zoom_oauth_state');
        
        // Refresh connection query
        queryClient.invalidateQueries({ queryKey: ['zoom-connection'] });
        
        toast({
          title: "Success!",
          description: "Your Zoom account has been connected successfully.",
        });
        
        if (result.connection) {
          onConnectionSuccess?.(result.connection);
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to complete Zoom connection';
      toast({
        title: "Connection Failed",
        description: errorMessage,
        variant: "destructive",
      });
      onConnectionError?.(errorMessage);
    } finally {
      setIsConnecting(false);
    }
  };

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
    if (isLoadingConnection || isConnecting) {
      return (
        <>
          <Loader className="h-4 w-4 animate-spin" />
          <span>{isConnecting ? 'Connecting...' : 'Loading...'}</span>
        </>
      );
    }

    if (connection) {
      const isExpired = ZoomConnectionService.isTokenExpired(connection.token_expires_at);
      
      if (isExpired) {
        return (
          <>
            <AlertCircle className="h-4 w-4" />
            <span>Reconnect Zoom</span>
          </>
        );
      }

      return (
        <>
          <CheckCircle className="h-4 w-4" />
          <span>Connected to Zoom</span>
        </>
      );
    }

    return (
      <>
        <Link className="h-4 w-4" />
        <span>Connect Zoom Account</span>
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
        description: "Please log in to connect your Zoom account.",
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
        // Reconnect flow
        initiateOAuthMutation.mutate();
      } else {
        // Show disconnect option
        handleDisconnect();
      }
    } else {
      // Start connection flow
      initiateOAuthMutation.mutate();
    }
  };

  const isDisabled = isLoadingConnection || isConnecting || !user || (!credentials && !connection);

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
          Connected as: {connection.zoom_email}
        </div>
      )}
      
      {!credentials && !connection && (
        <div className="text-xs text-muted-foreground">
          Configure OAuth credentials to enable connection
        </div>
      )}
    </div>
  );
};
