
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { NotificationService } from '@/services/notifications/NotificationService';
import { useToast } from '@/hooks/use-toast';

interface NotificationPreferences {
  browser_notifications_enabled: boolean;
  toast_notifications_enabled: boolean;
  email_notifications_enabled: boolean;
  notification_types: string[];
}

export const useNotificationSystem = (userId?: string) => {
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const loadPreferences = async () => {
    if (!userId) return;

    try {
      const { data, error } = await supabase
        .from('notification_preferences')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data) {
        setPreferences({
          browser_notifications_enabled: data.browser_notifications_enabled,
          toast_notifications_enabled: data.toast_notifications_enabled,
          email_notifications_enabled: data.email_notifications_enabled,
          notification_types: data.notification_types || [],
        });
      } else {
        // Create default preferences
        await createDefaultPreferences();
      }
    } catch (error) {
      console.error('Failed to load notification preferences:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const createDefaultPreferences = async () => {
    if (!userId) return;

    const defaultPrefs = {
      user_id: userId,
      browser_notifications_enabled: false,
      toast_notifications_enabled: true,
      email_notifications_enabled: false,
      notification_types: ['sync_complete', 'sync_failed', 'rate_limit_warning'],
    };

    try {
      const { data, error } = await supabase
        .from('notification_preferences')
        .insert(defaultPrefs)
        .select()
        .single();

      if (error) throw error;

      setPreferences({
        browser_notifications_enabled: data.browser_notifications_enabled,
        toast_notifications_enabled: data.toast_notifications_enabled,
        email_notifications_enabled: data.email_notifications_enabled,
        notification_types: data.notification_types || [],
      });
    } catch (error) {
      console.error('Failed to create default preferences:', error);
    }
  };

  const updatePreferences = async (updates: Partial<NotificationPreferences>) => {
    if (!userId || !preferences) return;

    try {
      const { error } = await supabase
        .from('notification_preferences')
        .update(updates)
        .eq('user_id', userId);

      if (error) throw error;

      setPreferences({ ...preferences, ...updates });
      
      toast({
        title: 'Preferences Updated',
        description: 'Your notification preferences have been saved.',
      });
    } catch (error) {
      console.error('Failed to update preferences:', error);
      toast({
        title: 'Update Failed',
        description: 'Failed to save notification preferences.',
        variant: 'destructive',
      });
    }
  };

  const requestBrowserPermission = async () => {
    const granted = await NotificationService.requestPermission();
    if (granted) {
      await updatePreferences({ browser_notifications_enabled: true });
    }
    return granted;
  };

  useEffect(() => {
    loadPreferences();
  }, [userId]);

  // Set up toast listener
  useEffect(() => {
    if (!preferences?.toast_notifications_enabled) return;

    const unsubscribe = NotificationService.onToast((toastNotification) => {
      toast({
        title: toastNotification.title,
        description: toastNotification.message,
        variant: toastNotification.type === 'error' ? 'destructive' : 'default',
      });
    });

    return unsubscribe;
  }, [preferences?.toast_notifications_enabled, toast]);

  return {
    preferences,
    isLoading,
    updatePreferences,
    requestBrowserPermission,
    refreshPreferences: loadPreferences,
  };
};
