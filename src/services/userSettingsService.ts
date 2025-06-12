
import { supabase } from '@/integrations/supabase/client';
import { Tables } from '@/integrations/supabase/types';

export type UserSettings = Tables<'user_settings'> & {
  theme_preference: 'light' | 'dark' | 'system';
};

export const userSettingsService = {
  async getUserSettings(userId: string): Promise<UserSettings | null> {
    const { data, error } = await supabase
      .from('user_settings')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      console.error('Error fetching user settings:', error);
      throw error;
    }

    return data as UserSettings | null;
  },

  async updateUserSettings(userId: string, updates: Partial<UserSettings>): Promise<UserSettings> {
    const { data, error } = await supabase
      .from('user_settings')
      .update(updates)
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      console.error('Error updating user settings:', error);
      throw error;
    }

    return data as UserSettings;
  },

  async createUserSettings(userId: string): Promise<UserSettings> {
    const { data, error } = await supabase
      .from('user_settings')
      .insert([{ id: userId }])
      .select()
      .single();

    if (error) {
      console.error('Error creating user settings:', error);
      throw error;
    }

    return data as UserSettings;
  }
};
