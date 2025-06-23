
import { supabase } from '@/integrations/supabase/client';
import { ZoomConnection, ConnectionStatus } from '@/types/zoom';
import { toast } from '@/hooks/use-toast';
import { TokenUtils } from '../utils/tokenUtils';
import { ConnectionCleanup } from '../utils/connectionCleanup';

/**
 * Connection status management operations with proper Server-to-Server support
 */
export class ConnectionStatusOperations {
  /**
   * Get the primary connection for a user with automatic token refresh
   */
  static async getPrimaryConnection(userId: string): Promise<ZoomConnection | null> {
    try {
      // First, auto-cleanup any corrupted connections
      await ConnectionCleanup.autoCleanupCorruptedConnections(userId);

      const { data, error } = await supabase
        .from('zoom_connections')
        .select('*')
        .eq('user_id', userId)
        .eq('is_primary', true)
        .eq('connection_status', 'active')
        .maybeSingle();

      if (error) {
        console.error('Failed to get primary connection:', error);
        return null;
      }

      if (!data) {
        return null;
      }

      // Cast the connection_status to the proper enum type
      const connection = {
        ...data,
        connection_status: data.connection_status as ConnectionStatus,
      } as ZoomConnection;

      // Check if connection needs token refresh
      if (TokenUtils.needsTokenRefresh(connection)) {
        console.log('Connection token is expired, attempting refresh...');
        const refreshedConnection = await this.refreshToken(connection);
        if (refreshedConnection) {
          return refreshedConnection;
        } else {
          // If refresh failed, mark connection as expired
          await this.updateConnectionStatus(connection.id, 'expired' as ConnectionStatus);
          return null;
        }
      }

      // Validate connection based on type
      if (TokenUtils.isServerToServerConnection(connection)) {
        // For Server-to-Server, validate credentials
        if (!connection.client_id || !connection.client_secret || !connection.account_id) {
          console.warn('Invalid Server-to-Server credentials, cleaning up connection:', connection.id);
          
          await supabase
            .from('zoom_connections')
            .delete()
            .eq('id', connection.id);
          
          toast({
            title: "Connection Reset",
            description: "Invalid Server-to-Server credentials detected. Please reconnect your Zoom account.",
            variant: "destructive",
          });
          
          return null;
        }
      } else {
        // For OAuth, validate tokens
        if (!TokenUtils.isValidToken(connection.access_token) || !TokenUtils.isValidToken(connection.refresh_token)) {
          console.warn('Invalid OAuth tokens detected, cleaning up connection:', connection.id);
          
          await supabase
            .from('zoom_connections')
            .delete()
            .eq('id', connection.id);
          
          toast({
            title: "Connection Reset",
            description: "Invalid connection tokens detected. Please reconnect your Zoom account.",
            variant: "destructive",
          });
          
          return null;
        }
      }

      return connection;
    } catch (error) {
      console.error('Unexpected error getting primary connection:', error);
      return null;
    }
  }

  /**
   * Set a connection as primary (and unset others)
   */
  static async setPrimaryConnection(connectionId: string, userId: string): Promise<boolean> {
    try {
      // First, unset all primary connections for the user
      const { error: unsetError } = await supabase
        .from('zoom_connections')
        .update({ is_primary: false })
        .eq('user_id', userId);

      if (unsetError) {
        console.error('Failed to unset primary connections:', unsetError);
        return false;
      }

      // Then set the specified connection as primary
      const { error: setPrimaryError } = await supabase
        .from('zoom_connections')
        .update({ 
          is_primary: true,
          updated_at: new Date().toISOString(),
        })
        .eq('id', connectionId);

      if (setPrimaryError) {
        console.error('Failed to set primary connection:', setPrimaryError);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Unexpected error setting primary connection:', error);
      return false;
    }
  }

  /**
   * Update connection status
   */
  static async updateConnectionStatus(id: string, status: ConnectionStatus): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('zoom_connections')
        .update({ 
          connection_status: status,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) {
        console.error('Failed to update connection status:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Unexpected error updating connection status:', error);
      return false;
    }
  }

  /**
   * Check connection health by attempting to validate token
   */
  static async checkConnectionStatus(connection: ZoomConnection): Promise<ConnectionStatus> {
    try {
      // Check if token needs refresh
      if (TokenUtils.needsTokenRefresh(connection)) {
        if (TokenUtils.canRefreshToken(connection)) {
          const refreshedConnection = await this.refreshToken(connection);
          if (refreshedConnection) return 'active' as ConnectionStatus;
        }

        await this.updateConnectionStatus(connection.id, 'expired' as ConnectionStatus);
        return 'expired' as ConnectionStatus;
      }

      if (connection.connection_status === 'active') {
        return 'active' as ConnectionStatus;
      }

      return connection.connection_status;
    } catch (error) {
      console.error('Error checking connection status:', error);
      await this.updateConnectionStatus(connection.id, 'error' as ConnectionStatus);
      return 'error' as ConnectionStatus;
    }
  }

  /**
   * Refresh an expired access token using the zoom-api-gateway
   */
  static async refreshToken(connection: ZoomConnection): Promise<ZoomConnection | null> {
    try {
      console.log('Starting token refresh for connection:', connection.id, 'type:', connection.connection_type);

      // For Server-to-Server connections, use validate-credentials action
      if (TokenUtils.isServerToServerConnection(connection)) {
        const { data, error } = await supabase.functions.invoke('zoom-api-gateway', {
          body: { action: 'validate-credentials' }
        });

        if (error) {
          throw new Error(error.message || 'Unknown error during Server-to-Server token refresh.');
        }

        if (data?.success && data?.connection) {
          console.log('Server-to-Server token refreshed successfully');
          return data.connection;
        }
      } else {
        // For OAuth connections, use the token refresh function
        const { data, error } = await supabase.functions.invoke('zoom-token-refresh', {
          body: { connectionId: connection.id }
        });

        if (error) {
          throw new Error(error.message || 'Unknown error during OAuth token refresh.');
        }

        if (data?.success && data?.connection) {
          toast({
            title: "Connection Refreshed",
            description: "Your Zoom token has been successfully refreshed.",
          });
          return data.connection;
        }
      }

      throw new Error('Token refresh failed');
    } catch (error) {
      console.error('Error refreshing token:', error);
      
      const errorMessage = TokenUtils.isServerToServerConnection(connection) 
        ? "Could not refresh your Server-to-Server connection. Please check your credentials in settings."
        : "Could not refresh your Zoom connection. Please re-authenticate in settings.";
      
      toast({
        title: "Refresh Failed",
        description: errorMessage,
        variant: "destructive",
      });
      
      await this.updateConnectionStatus(connection.id, 'expired' as ConnectionStatus);
      return null;
    }
  }

  /**
   * Silently refresh Server-to-Server tokens without UI feedback
   */
  static async refreshTokenSilently(connection: ZoomConnection): Promise<ZoomConnection | null> {
    try {
      console.log('Silently refreshing Server-to-Server token for connection:', connection.id);

      const { data, error } = await supabase.functions.invoke('zoom-api-gateway', {
        body: { action: 'validate-credentials' }
      });

      if (error) {
        console.error('Silent token refresh failed:', error);
        return null;
      }

      if (data?.success && data?.connection) {
        console.log('Server-to-Server token refreshed silently');
        return data.connection;
      }

      return null;
    } catch (error) {
      console.error('Error during silent token refresh:', error);
      return null;
    }
  }
}
