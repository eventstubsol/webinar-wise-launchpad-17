
import { supabase } from '@/integrations/supabase/client';
import { ZoomConnection, ConnectionStatus } from '@/types/zoom';
import { toast } from '@/hooks/use-toast';
import { TokenUtils } from '../utils/tokenUtils';

/**
 * Connection status management operations
 */
export class ConnectionStatus {
  /**
   * Get the primary connection for a user
   */
  static async getPrimaryConnection(userId: string): Promise<ZoomConnection | null> {
    try {
      const { data, error } = await supabase
        .from('zoom_connections')
        .select('*')
        .eq('user_id', userId)
        .eq('is_primary', true)
        .eq('connection_status', 'active')
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null; // No primary connection found
        }
        console.error('Failed to get primary connection:', error);
        return null;
      }

      // Decrypt tokens and cast types
      return {
        ...data,
        access_token: TokenUtils.decryptToken(data.access_token),
        refresh_token: TokenUtils.decryptToken(data.refresh_token),
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
   * Note: This is a placeholder - actual implementation would call Zoom's OAuth endpoint
   */
  static async refreshToken(connection: ZoomConnection): Promise<ZoomConnection | null> {
    try {
      // TODO: Implement actual token refresh logic with Zoom OAuth endpoint
      // This would involve:
      // 1. POST to https://zoom.us/oauth/token with refresh_token
      // 2. Get new access_token and refresh_token
      // 3. Update the connection record
      
      console.log('Token refresh not yet implemented for connection:', connection.id);
      
      toast({
        title: "Token Refresh",
        description: "Token refresh functionality will be implemented with Zoom OAuth integration.",
      });

      return connection;
    } catch (error) {
      console.error('Error refreshing token:', error);
      toast({
        title: "Refresh Error",
        description: "Failed to refresh access token.",
        variant: "destructive",
      });
      return null;
    }
  }
}
