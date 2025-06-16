
import { supabase } from '@/integrations/supabase/client';
import { ZoomConnection, ConnectionStatus } from '@/types/zoom';
import { toast } from '@/hooks/use-toast';
import { TokenUtils } from '../utils/tokenUtils';
import { ConnectionCleanup } from '../utils/connectionCleanup';

/**
 * Connection status management operations - no encryption, plain text tokens
 */
export class ConnectionStatusOperations {
  /**
   * Get the primary connection for a user - simplified for plain text tokens
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

      // Validate tokens are plain text and valid
      if (!TokenUtils.isValidToken(data.access_token) || !TokenUtils.isValidToken(data.refresh_token)) {
        console.warn('Invalid tokens detected, cleaning up connection:', data.id);
        
        await supabase
          .from('zoom_connections')
          .delete()
          .eq('id', data.id);
        
        toast({
          title: "Connection Reset",
          description: "Invalid connection tokens detected. Please reconnect your Zoom account.",
          variant: "destructive",
        });
        
        return null;
      }

      return {
        ...data,
        connection_status: data.connection_status as ConnectionStatus,
      } as ZoomConnection;
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
      if (TokenUtils.isTokenExpired(connection.token_expires_at)) {
        const refreshedConnection = await this.refreshToken(connection);
        if (refreshedConnection) return 'active' as ConnectionStatus;

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
   * Refresh an expired access token using the refresh token
   */
  static async refreshToken(connection: ZoomConnection): Promise<ZoomConnection | null> {
    try {
      toast({
        title: "Refreshing Connection",
        description: "Your Zoom connection is being refreshed...",
      });

      const { data, error } = await supabase.functions.invoke('zoom-token-refresh', {
        body: { connectionId: connection.id },
      });

      if (error) {
        throw new Error(error.message || 'Unknown error during token refresh.');
      }
      
      toast({
        title: "Connection Refreshed",
        description: "Your Zoom token has been successfully refreshed.",
      });

      return data.connection;
    } catch (error) {
      console.error('Error refreshing token:', error);
      toast({
        title: "Refresh Failed",
        description: "Could not refresh your Zoom connection. Please re-authenticate in settings.",
        variant: "destructive",
      });
      await this.updateConnectionStatus(connection.id, 'expired' as ConnectionStatus);
      return null;
    }
  }
}
