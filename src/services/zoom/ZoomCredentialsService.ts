
import { supabase } from '@/integrations/supabase/client';
import { ZoomCredentialsInsert, ZoomCredentialsUpdate } from '@/types/zoomCredentials';

export class ZoomCredentialsService {
  static async getActiveCredentials(userId: string) {
    const { data, error } = await supabase
      .from('zoom_credentials')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .maybeSingle();

    if (error) {
      console.error('Error fetching zoom credentials:', error);
      return null;
    }

    return data;
  }

  static async createCredentials(credentials: ZoomCredentialsInsert) {
    const { data, error } = await supabase
      .from('zoom_credentials')
      .insert(credentials)
      .select()
      .single();

    if (error) {
      console.error('Error creating zoom credentials:', error);
      throw error;
    }

    return data;
  }

  static async updateCredentials(id: string, updates: ZoomCredentialsUpdate) {
    const { data, error } = await supabase
      .from('zoom_credentials')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating zoom credentials:', error);
      throw error;
    }

    return data;
  }

  static async deleteCredentials(id: string) {
    const { error } = await supabase
      .from('zoom_credentials')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting zoom credentials:', error);
      throw error;
    }

    return true;
  }

  static async getAllCredentials(userId: string) {
    const { data, error } = await supabase
      .from('zoom_credentials')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching all zoom credentials:', error);
      throw error;
    }

    return data || [];
  }
}
