import { supabase } from '@/integrations/supabase/client';
import { ZoomCredentials, ZoomCredentialsInsert, ZoomCredentialsUpdate } from '@/types/zoomCredentials';
import { toast } from '@/hooks/use-toast';

export class ZoomCredentialsService {
  /**
   * Get active Zoom credentials for a user
   */
  static async getActiveCredentials(userId: string): Promise<ZoomCredentials | null> {
    try {
      const { data, error } = await supabase
        .from('zoom_credentials')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null; // No credentials found
        }
        console.error('Failed to get Zoom credentials:', error);
        return null;
      }

      return data as ZoomCredentials;
    } catch (error) {
      console.error('Unexpected error getting Zoom credentials:', error);
      return null;
    }
  }

  /**
   * Create new Zoom credentials, or update if they already exist.
   */
  static async createCredentials(credentials: ZoomCredentialsInsert): Promise<ZoomCredentials | null> {
    try {
      // Check for any existing credentials for this user
      const { data: existing, error: getError } = await supabase
        .from('zoom_credentials')
        .select('id')
        .eq('user_id', credentials.user_id)
        .single();

      if (getError && getError.code !== 'PGRST116') {
        console.error('Error checking for existing credentials:', getError);
        toast({
          title: "Database Error",
          description: "Could not verify existing credentials configuration.",
          variant: "destructive",
        });
        return null;
      }

      if (existing) {
        // If credentials exist, update them. The service will show its own toast.
        return this.updateCredentials(existing.id, { ...credentials, is_active: true });
      }

      // No credentials exist, so create new ones.
      const { data, error } = await supabase
        .from('zoom_credentials')
        .insert({
          ...credentials,
          is_active: true,
        })
        .select()
        .single();

      if (error) {
        console.error('Failed to create Zoom credentials:', error);
        toast({
          title: "Error",
          description: "Failed to save Zoom credentials. Please try again.",
          variant: "destructive",
        });
        return null;
      }

      toast({
        title: "Success",
        description: "Zoom credentials saved successfully!",
      });

      return data as ZoomCredentials;
    } catch (error) {
      console.error('Unexpected error creating Zoom credentials:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
      return null;
    }
  }

  /**
   * Update existing Zoom credentials
   */
  static async updateCredentials(id: string, updates: ZoomCredentialsUpdate): Promise<ZoomCredentials | null> {
    try {
      const { data, error } = await supabase
        .from('zoom_credentials')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Failed to update Zoom credentials:', error);
        toast({
          title: "Error",
          description: "Failed to update Zoom credentials.",
          variant: "destructive",
        });
        return null;
      }

      toast({
        title: "Success",
        description: "Zoom credentials updated successfully!",
      });

      return data as ZoomCredentials;
    } catch (error) {
      console.error('Unexpected error updating Zoom credentials:', error);
      toast({
        title: "Error",
        description: "Failed to update credentials. Please try again.",
        variant: "destructive",
      });
      return null;
    }
  }

  /**
   * Delete Zoom credentials
   */
  static async deleteCredentials(id: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('zoom_credentials')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Failed to delete Zoom credentials:', error);
        toast({
          title: "Error",
          description: "Failed to delete Zoom credentials.",
          variant: "destructive",
        });
        return false;
      }

      toast({
        title: "Success",
        description: "Zoom credentials deleted successfully.",
      });

      return true;
    } catch (error) {
      console.error('Unexpected error deleting Zoom credentials:', error);
      toast({
        title: "Error",
        description: "Failed to delete credentials. Please try again.",
        variant: "destructive",
      });
      return false;
    }
  }

  /**
   * Deactivate existing active credentials for a user
   */
  private static async deactivateExistingCredentials(userId: string): Promise<void> {
    try {
      await supabase
        .from('zoom_credentials')
        .update({ is_active: false })
        .eq('user_id', userId)
        .eq('is_active', true);
    } catch (error) {
      console.error('Failed to deactivate existing credentials:', error);
    }
  }

  /**
   * Validate credential format
   */
  static validateCredentials(credentials: Omit<ZoomCredentialsInsert, 'user_id'>): string[] {
    const errors: string[] = [];

    if (!credentials.account_id || credentials.account_id.trim().length === 0) {
      errors.push('Account ID is required');
    }

    if (!credentials.client_id || credentials.client_id.trim().length === 0) {
      errors.push('Client ID is required');
    }

    if (!credentials.client_secret || credentials.client_secret.trim().length === 0) {
      errors.push('Client Secret is required');
    }

    // Basic format validation
    if (credentials.account_id && !/^[a-zA-Z0-9_-]+$/.test(credentials.account_id)) {
      errors.push('Account ID contains invalid characters');
    }

    if (credentials.client_id && !/^[a-zA-Z0-9_-]+$/.test(credentials.client_id)) {
      errors.push('Client ID contains invalid characters');
    }

    return errors;
  }
}
