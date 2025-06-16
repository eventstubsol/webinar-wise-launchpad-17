import { supabase } from '@/integrations/supabase/client';
import { ZoomConnection, ConnectionStatus } from '@/types/zoom';
import { toast } from '@/hooks/use-toast';
import { TokenUtils, TokenDecryptionError } from '../utils/tokenUtils';

/**
 * Connection status management operations with improved error handling
 */
export class ConnectionStatusOperations {
  /**
   * Get the primary connection for a user with enhanced error handling
   */
  static async getPrimaryConnection(userId: string): Promise<ZoomConnection | null> {
    try {
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
        return null; // No primary connection found
      }

      // Enhanced token validation - check for corrupted tokens
      try {
        const decryptedAccessToken = await TokenUtils.decryptToken(data.access_token, data.user_id);
        const decryptedRefreshToken = await TokenUtils.decryptToken(data.refresh_token, data.user_id);

        // Validate that decrypted tokens don't contain binary data
        if (this.containsBinaryData(decryptedAccessToken) || this.containsBinaryData(decryptedRefreshToken)) {
          console.warn('Detected corrupted tokens with binary data, cleaning up connection:', data.id);
          
          // Force delete the corrupted connection
          try {
            await supabase
              .from('zoom_connections')
              .delete()
              .eq('id', data.id);
            
            console.log('Corrupted connection deleted successfully');
            toast({
              title: "Connection Reset",
              description: "Detected corrupted connection data. Please reconnect your Zoom account.",
              variant: "destructive",
            });
          } catch (deleteError) {
            console.error('Failed to delete corrupted connection:', deleteError);
          }
          
          return null; // Return null to indicate no valid connection
        }

        return {
          ...data,
          access_token: decryptedAccessToken,
          refresh_token: decryptedRefreshToken,
          connection_status: data.connection_status as ConnectionStatus,
        } as ZoomConnection;
      } catch (error) {
        if (error instanceof TokenDecryptionError || error instanceof Error) {
          console.warn('Token decryption failed, cleaning up corrupted connection:', data.id);
          
          // Force delete the corrupted connection
          try {
            await supabase
              .from('zoom_connections')
              .delete()
              .eq('id', data.id);
            
            console.log('Corrupted connection deleted successfully');
            toast({
              title: "Connection Reset",
              description: "Unable to decrypt connection tokens. Please reconnect your Zoom account.",
              variant: "destructive",
            });
          } catch (deleteError) {
            console.error('Failed to delete corrupted connection:', deleteError);
          }
          
          return null; // Return null to indicate no valid connection
        }
        throw error;
      }
    } catch (error) {
      console.error('Unexpected error getting primary connection:', error);
      return null;
    }
  }

  /**
   * Check if string contains binary data that would be invalid in HTTP headers
   */
  private static containsBinaryData(str: string): boolean {
    // Check for non-printable characters that would indicate binary data
    return /[\x00-\x08\x0E-\x1F\x7F-\xFF]/.test(str);
  }

  /**
   * Clean up all connections for a user (for fresh start)
   */
  static async cleanupUserConnections(userId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('zoom_connections')
        .delete()
        .eq('user_id', userId);

      if (error) {
        console.error('Failed to cleanup user connections:', error);
        return false;
      }

      console.log('All connections cleaned up for user:', userId);
      return true;
    } catch (error) {
      console.error('Unexpected error cleaning up connections:', error);
      return false;
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
        toast({
          title: "Error",
          description: "Failed to set as primary connection.",
          variant: "destructive",
        });
        return false;
      }

      toast({
        title: "Success",
        description: "Primary connection updated successfully.",
      });

      return true;
    } catch (error) {
      console.error('Unexpected error setting primary connection:', error);
      toast({
        title: "Error",
        description: "Failed to update primary connection. Please try again.",
        variant: "destructive",
      });
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
      // Check if token is expired first
      if (TokenUtils.isTokenExpired(connection.token_expires_at)) {
        const refreshedConnection = await this.refreshToken(connection);
        if (refreshedConnection) return 'active' as ConnectionStatus;

        await this.updateConnectionStatus(connection.id, 'expired' as ConnectionStatus);
        return 'expired' as ConnectionStatus;
      }

      // In a real implementation, you would make a test API call to Zoom here
      // For now, we'll assume active connections are healthy
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
