
import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { ZoomConnectionService } from '@/services/zoom/ZoomConnectionService';
import { ZoomConnection } from '@/types/zoom';
import { Link, CheckCircle, AlertCircle, Loader } from 'lucide-react';

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

  // Query to get current connection status
  const { data: connection, isLoading: isLoadingConnection } = useQuery({
    queryKey: ['zoom-connection', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      return await ZoomConnectionService.getPrimaryConnection(user.id);
    },
    enabled: !!user?.id,
    refetchInterval: connection ? undefined : 5000, // Poll when disconnected
  });

  // Mutation to handle OAuth initiation
  const initiateOAuthMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) {
        throw new Error('User not authenticated');
      }

      // Generate secure state parameter
      const state = crypto.randomUUID();
      
      // Store state in sessionStorage for validation
      sessionStorage.setItem('zoom_oauth_state', state);
      
      // Construct OAuth URL
      const baseUrl = 'https://zoom.us/oauth/authorize';
      const clientId = import.meta.env.VITE_ZOOM_CLIENT_ID || 'your_zoom_client_id';
      const redirectUri = `${window.location.origin}/dashboard`; // Redirect back to dashboard
      const scope = 'webinar:read:admin webinar:write:admin user:read:admin';
      
      const oauthUrl = new URL(baseUrl);
      oauthUrl.searchParams.set('response_type', 'code');
      oauthUrl.searchParams.set('client_id', clientId);
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
    if (!user?.id) return;

    setIsConnecting(true);
    
    try {
      // In a real implementation, you would exchange the code for tokens
      // This is a placeholder - actual token exchange should happen in a secure backend
      const mockConnection: ZoomConnection = {
        id: crypto.randomUUID(),
        user_id: user.id,
        zoom_user_id: 'mock_zoom_user_id',
        zoom_account_id: 'mock_account_id',
        zoom_email: user.email || 'user@example.com',
        access_token: 'mock_access_token',
        refresh_token: 'mock_refresh_token',
        token_expires_at: new Date(Date.now() + 3600000).toISOString(), // 1 hour from now
        connection_status: 'connected',
        scopes: ['webinar:read:admin', 'webinar:write:admin', 'user:read:admin'],
        is_primary: true,
        auto_sync_enabled: true,
        sync_frequency_hours: 24,
        zoom_account_type: 'Pro',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        last_sync_at: null,
        next_sync_at: null,
      };

      // Store the connection
      const savedConnection = await ZoomConnectionService.createConnection(mockConnection);
      
      if (savedConnection) {
        // Clear OAuth state
        sessionStorage.removeItem('zoom_oauth_state');
        
        // Refresh connection query
        queryClient.invalidateQueries({ queryKey: ['zoom-connection'] });
        
        toast({
          title: "Success!",
          description: "Your Zoom account has been connected successfully.",
        });
        
        onConnectionSuccess?.(savedConnection);
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

  return (
    <div className="space-y-2">
      <Button
        onClick={handleClick}
        variant={getButtonVariant()}
        size={size}
        className={`gap-2 ${className}`}
        disabled={isLoadingConnection || isConnecting || !user}
      >
        {getButtonContent()}
      </Button>
      
      {connection && !ZoomConnectionService.isTokenExpired(connection.token_expires_at) && (
        <div className="text-xs text-muted-foreground">
          Connected as: {connection.zoom_email}
        </div>
      )}
    </div>
  );
};
