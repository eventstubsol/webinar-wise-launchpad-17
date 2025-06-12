
import { supabase } from '@/integrations/supabase/client';
import { 
  ZoomConnection, 
  ZoomConnectionInsert, 
  ZoomConnectionUpdate,
  ConnectionStatus 
} from '@/types/zoom';
import { toast } from '@/hooks/use-toast';
import { TokenUtils } from '../utils/tokenUtils';

/**
 * CRUD operations for Zoom connections
 */
export class ConnectionCrud {
  /**
   * Create a new Zoom connection
   */
  static async createConnection(connectionData: ZoomConnectionInsert): Promise<ZoomConnection | null> {
    try {
      // Encrypt tokens before storing
      const encryptedData = {
        ...connectionData,
        access_token: TokenUtils.encryptToken(connectionData.access_token),
        refresh_token: TokenUtils.encryptToken(connectionData.refresh_token),
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
        access_token: TokenUtils.decryptToken(data.access_token),
        refresh_token: TokenUtils.decryptToken(data.refresh_token),
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
        access_token: TokenUtils.decryptToken(data.access_token),
        refresh_token: TokenUtils.decryptToken(data.refresh_token),
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
        access_token: TokenUtils.decryptToken(connection.access_token),
        refresh_token: TokenUtils.decryptToken(connection.refresh_token),
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
   * Update a connection
   */
  static async updateConnection(id: string, updates: ZoomConnectionUpdate): Promise<ZoomConnection | null> {
    try {
      // Encrypt tokens if they're being updated
      const encryptedUpdates = { ...updates };
      if (updates.access_token) {
        encryptedUpdates.access_token = TokenUtils.encryptToken(updates.access_token);
      }
      if (updates.refresh_token) {
        encryptedUpdates.refresh_token = TokenUtils.encryptToken(updates.refresh_token);
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
}
