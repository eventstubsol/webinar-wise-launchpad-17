
import { supabase } from '@/integrations/supabase/client';
import { ZoomConnection, ZoomConnectionInsert, ZoomConnectionUpdate, ConnectionStatus } from '@/types/zoom';
import { toast } from '@/hooks/use-toast';

/**
 * Direct database operations for connections
 */
export class ConnectionDatabase {
  /**
   * Validate UUID format
   */
  private static isValidUUID(uuid: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
  }

  /**
   * Get the current authenticated user ID
   */
  private static async getCurrentUserId(): Promise<string> {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) {
      throw new Error('User not authenticated');
    }
    
    // Validate user ID format
    if (!this.isValidUUID(user.id)) {
      throw new Error('Invalid user ID format');
    }
    
    return user.id;
  }

  /**
   * Insert a new connection into the database
   */
  static async insertConnection(data: ZoomConnectionInsert): Promise<any | null> {
    try {
      // Validate user_id if provided
      if (data.user_id && !this.isValidUUID(data.user_id)) {
        console.error('Invalid user_id format:', data.user_id);
        toast({
          title: "Validation Error",
          description: "Invalid user ID format.",
          variant: "destructive",
        });
        return null;
      }

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
      // Validate connection ID format
      if (!this.isValidUUID(id)) {
        console.error('Invalid connection ID format:', id);
        toast({
          title: "Validation Error",
          description: "Invalid connection ID format.",
          variant: "destructive",
        });
        return null;
      }

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

      // Validate user ID format
      if (!this.isValidUUID(actualUserId)) {
        console.error('Invalid user ID format:', actualUserId);
        toast({
          title: "Validation Error",
          description: "Invalid user ID format.",
          variant: "destructive",
        });
        return [];
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
      // Validate connection ID format
      if (!this.isValidUUID(id)) {
        console.error('Invalid connection ID format:', id);
        toast({
          title: "Validation Error",
          description: "Invalid connection ID format.",
          variant: "destructive",
        });
        return null;
      }

      // Validate user_id in updates if provided
      if (updates.user_id && !this.isValidUUID(updates.user_id)) {
        console.error('Invalid user_id in updates:', updates.user_id);
        toast({
          title: "Validation Error",
          description: "Invalid user ID format in updates.",
          variant: "destructive",
        });
        return null;
      }

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
      // Validate connection ID format
      if (!this.isValidUUID(id)) {
        console.error('Invalid connection ID format:', id);
        toast({
          title: "Validation Error",
          description: "Invalid connection ID format.",
          variant: "destructive",
        });
        return false;
      }

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
      // Validate connection ID format
      if (!this.isValidUUID(id)) {
        console.error('Invalid connection ID format:', id);
        return null;
      }

      const { data, error } = await supabase
        .from('zoom_connections')
        .select('user_id')
        .eq('id', id)
        .single();

      if (error || !data) {
        console.error('Failed to get connection user_id:', error);
        return null;
      }

      // Validate returned user_id format
      if (!this.isValidUUID(data.user_id)) {
        console.error('Retrieved user_id has invalid format:', data.user_id);
        return null;
      }

      return data.user_id;
    } catch (error) {
      console.error('Unexpected error getting connection user_id:', error);
      return null;
    }
  }
}
