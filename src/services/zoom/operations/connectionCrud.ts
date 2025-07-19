
import { supabase } from '@/integrations/supabase/client';
import { ZoomConnection, ZoomConnectionInsert, ZoomConnectionUpdate } from '@/types/zoom';

export class ConnectionCrud {
  static async createConnection(connection: ZoomConnectionInsert): Promise<ZoomConnection> {
    const { data, error } = await supabase
      .from('zoom_connections')
      .insert(connection)
      .select()
      .single();

    if (error) {
      console.error('Error creating connection:', error);
      throw error;
    }

    return data;
  }

  static async getConnection(id: string): Promise<ZoomConnection | null> {
    const { data, error } = await supabase
      .from('zoom_connections')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      console.error('Error fetching connection:', error);
      return null;
    }

    return data;
  }

  static async getUserConnections(userId: string): Promise<ZoomConnection[]> {
    const { data, error } = await supabase
      .from('zoom_connections')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching user connections:', error);
      throw error;
    }

    return data || [];
  }

  static async updateConnection(id: string, updates: ZoomConnectionUpdate): Promise<ZoomConnection> {
    const { data, error } = await supabase
      .from('zoom_connections')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating connection:', error);
      throw error;
    }

    return data;
  }

  static async deleteConnection(id: string): Promise<boolean> {
    const { error } = await supabase
      .from('zoom_connections')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting connection:', error);
      throw error;
    }

    return true;
  }
}
