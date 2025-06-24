
import { supabase } from '@/integrations/supabase/client';
import { ZoomConnection, ZoomConnectionInsert, ZoomConnectionUpdate, ConnectionStatus } from '@/types/zoom';
import { toast } from '@/hooks/use-toast';

/**
 * Direct database operations for connections
 */
export class ConnectionDatabase {
  /**
   * Get the current authenticated user ID
   */
  private static async getCurrentUserId(): Promise<string> {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) {
      throw new Error('User not authenticated');
    }
    return user.id;
  }

  /**
   * Insert a new connection into the database
   */
  static async insertConnection(data: ZoomConnectionInsert): Promise<any | null> {
    try {
      const { data: result, error } = await supabase
        .from('zoom_connections')
        .insert(data)
        .select()
        .single();

      if (error) {
        console.error('Database insert error:', error);
        toast({
          title: "Database Error",
          description: "Failed to save connection to database.",
          variant: "destructive",
        });
        return null;
      }

      return result;
    } catch (error) {
      console.error('Unexpected database error:', error);
      toast({
        title: "Error",
        description: "Unexpected database error occurred.",
        variant: "destructive",
      });
      return null;
    }
  }

  /**
   * Get a connection by ID
   */
  static async getConnectionById(id: string): Promise<any | null> {
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
        console.error('Database get error:', error);
        toast({
          title: "Error",
          description: "Failed to retrieve connection details.",
          variant: "destructive",
        });
        return null;
      }

      return data;
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
   * Get all connections for a user - now properly resolves current user ID
   */
  static async getConnectionsByUserId(userId?: string): Promise<any[]> {
    try {
      // If no userId provided or userId is "current", get the authenticated user ID
      let actualUserId = userId;
      if (!actualUserId || actualUserId === 'current') {
        actualUserId = await this.getCurrentUserId();
      }

      const { data, error } = await supabase
        .from('zoom_connections')
        .select('*')
        .eq('user_id', actualUserId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Database get user connections error:', error);
        toast({
          title: "Error",
          description: "Failed to load your Zoom connections.",
          variant: "destructive",
        });
        return [];
      }

      return data || [];
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
   * Update a connection in the database
   */
  static async updateConnectionById(id: string, updates: any): Promise<any | null> {
    try {
      const { data, error } = await supabase
        .from('zoom_connections')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Database update error:', error);
        toast({
          title: "Update Error",
          description: "Failed to update Zoom connection.",
          variant: "destructive",
        });
        return null;
      }

      return data;
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
   * Delete a connection from the database
   */
  static async deleteConnectionById(id: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('zoom_connections')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Database delete error:', error);
        toast({
          title: "Delete Error",
          description: "Failed to disconnect Zoom account.",
          variant: "destructive",
        });
        return false;
      }

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
   * Get existing connection to retrieve user_id for encryption
   */
  static async getConnectionUserIdById(id: string): Promise<string | null> {
    try {
      const { data, error } = await supabase
        .from('zoom_connections')
        .select('user_id')
        .eq('id', id)
        .single();

      if (error || !data) {
        console.error('Failed to get connection user_id:', error);
        return null;
      }

      return data.user_id;
    } catch (error) {
      console.error('Unexpected error getting connection user_id:', error);
      return null;
    }
  }
}
