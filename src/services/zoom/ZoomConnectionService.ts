
import { supabase } from '@/integrations/supabase/client';
import { 
  ZoomConnection, 
  ZoomConnectionInsert, 
  ZoomConnectionUpdate,
  ConnectionStatus 
} from '@/types/zoom';
import { toast } from '@/hooks/use-toast';

export class ZoomConnectionService {
  /**
   * Simple token encryption using Base64 (for demo purposes)
   * In production, this should use proper encryption
   */
  private static encryptToken(token: string): string {
    try {
      return btoa(token);
    } catch (error) {
      console.error('Token encryption failed:', error);
      throw new Error('Failed to encrypt token');
    }
  }

  /**
   * Simple token decryption using Base64
   */
  private static decryptToken(encryptedToken: string): string {
    try {
      return atob(encryptedToken);
    } catch (error) {
      console.error('Token decryption failed:', error);
      throw new Error('Failed to decrypt token');
    }
  }

  /**
   * Check if the access token is expired
   */
  static isTokenExpired(connection: ZoomConnection): boolean {
    if (!connection.token_expires_at) return true;
    
    const expirationTime = new Date(connection.token_expires_at);
    const now = new Date();
    
    // Add 5-minute buffer before actual expiration
    const bufferTime = 5 * 60 * 1000; // 5 minutes in milliseconds
    return (expirationTime.getTime() - bufferTime) <= now.getTime();
  }

  /**
   * Create a new Zoom connection
   */
  static async createConnection(connectionData: ZoomConnectionInsert): Promise<ZoomConnection | null> {
    try {
      // Encrypt tokens before storing
      const encryptedData = {
        ...connectionData,
        access_token: this.encryptToken(connectionData.access_token),
        refresh_token: this.encryptToken(connectionData.refresh_token),
      };

      const { data, error } = await supabase
        .from('zoom_connections')
        .insert(encryptedData)
        .select()
        .single();

      if (error) {
        console.error('Failed to create Zoom connection:', error);
        toast({
          title: "Connection Error",
          description: "Failed to save Zoom connection. Please try again.",
          variant: "destructive",
        });
        return null;
      }

      toast({
        title: "Success",
        description: "Zoom account connected successfully!",
      });

      // Cast and decrypt tokens for return
      return {
        ...data,
        access_token: this.decryptToken(data.access_token),
        refresh_token: this.decryptToken(data.refresh_token),
        connection_status: data.connection_status as ConnectionStatus,
      } as ZoomConnection;
    } catch (error) {
      console.error('Unexpected error creating connection:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
      return null;
    }
  }

  /**
   * Get a connection by ID with decrypted tokens
   */
  static async getConnection(id: string): Promise<ZoomConnection | null> {
    try {
      const { data, error } = await supabase
        .from('zoom_connections')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null; // Not found
        }
        console.error('Failed to get connection:', error);
        toast({
          title: "Error",
          description: "Failed to retrieve connection details.",
          variant: "destructive",
        });
        return null;
      }

      // Decrypt tokens and cast types for use
      return {
        ...data,
        access_token: this.decryptToken(data.access_token),
        refresh_token: this.decryptToken(data.refresh_token),
        connection_status: data.connection_status as ConnectionStatus,
      } as ZoomConnection;
    } catch (error) {
      console.error('Unexpected error getting connection:', error);
      toast({
        title: "Error",
        description: "Failed to retrieve connection. Please try again.",
        variant: "destructive",
      });
      return null;
    }
  }

  /**
   * Get all connections for a user
   */
  static async getUserConnections(userId: string): Promise<ZoomConnection[]> {
    try {
      const { data, error } = await supabase
        .from('zoom_connections')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Failed to get user connections:', error);
        toast({
          title: "Error",
          description: "Failed to load your Zoom connections.",
          variant: "destructive",
        });
        return [];
      }

      // Decrypt tokens and cast types for all connections
      return data.map(connection => ({
        ...connection,
        access_token: this.decryptToken(connection.access_token),
        refresh_token: this.decryptToken(connection.refresh_token),
        connection_status: connection.connection_status as ConnectionStatus,
      })) as ZoomConnection[];
    } catch (error) {
      console.error('Unexpected error getting user connections:', error);
      toast({
        title: "Error",
        description: "Failed to load connections. Please try again.",
        variant: "destructive",
      });
      return [];
    }
  }

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
        access_token: this.decryptToken(data.access_token),
        refresh_token: this.decryptToken(data.refresh_token),
        connection_status: data.connection_status as ConnectionStatus,
      } as ZoomConnection;
    } catch (error) {
      console.error('Unexpected error getting primary connection:', error);
      return null;
    }
  }

  /**
   * Update a connection
   */
  static async updateConnection(id: string, updates: ZoomConnectionUpdate): Promise<ZoomConnection | null> {
    try {
      // Encrypt tokens if they're being updated
      const encryptedUpdates = { ...updates };
      if (updates.access_token) {
        encryptedUpdates.access_token = this.encryptToken(updates.access_token);
      }
      if (updates.refresh_token) {
        encryptedUpdates.refresh_token = this.encryptToken(updates.refresh_token);
      }

      const { data, error } = await supabase
        .from('zoom_connections')
        .update({
          ...encryptedUpdates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Failed to update connection:', error);
        toast({
          title: "Update Error",
          description: "Failed to update Zoom connection.",
          variant: "destructive",
        });
        return null;
      }

      // Return with proper type casting
      return {
        ...data,
        connection_status: data.connection_status as ConnectionStatus,
      } as ZoomConnection;
    } catch (error) {
      console.error('Unexpected error updating connection:', error);
      toast({
        title: "Error",
        description: "Failed to update connection. Please try again.",
        variant: "destructive",
      });
      return null;
    }
  }

  /**
   * Delete a connection
   */
  static async deleteConnection(id: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('zoom_connections')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Failed to delete connection:', error);
        toast({
          title: "Delete Error",
          description: "Failed to disconnect Zoom account.",
          variant: "destructive",
        });
        return false;
      }

      toast({
        title: "Success",
        description: "Zoom account disconnected successfully.",
      });

      return true;
    } catch (error) {
      console.error('Unexpected error deleting connection:', error);
      toast({
        title: "Error",
        description: "Failed to disconnect account. Please try again.",
        variant: "destructive",
      });
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
      if (this.isTokenExpired(connection)) {
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
