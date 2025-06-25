
import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { NotificationService } from '@/services/notifications/NotificationService';

interface NotificationPreferences {
  id: string;
  user_id: string;
  browser_notifications_enabled: boolean;
  toast_notifications_enabled: boolean;
  email_notifications_enabled: boolean;
  notification_types: string[];
  created_at: string;
  updated_at: string;
}

interface NotificationState {
  browserPermission: NotificationPermission;
  toastEnabled: boolean;
  emailEnabled: boolean;
  supportedTypes: string[];
}

export const useNotificationSystem = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  const [notificationState, setNotificationState] = useState<NotificationState>({
    browserPermission: 'default',
    toastEnabled: true,
    emailEnabled: false,
    supportedTypes: ['sync_complete', 'sync_failed', 'rate_limit_warning'],
  });

  // Load user notification preferences
  const { data: preferences, isLoading } = useQuery({
    queryKey: ['notification-preferences', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      const { data, error } = await supabase
        .from('notification_preferences')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      return data as NotificationPreferences | null;
    },
    enabled: !!user?.id,
  });

  // Update notification preferences mutation
  const updatePreferencesMutation = useMutation({
    mutationFn: async (updates: Partial<NotificationPreferences>) => {
      if (!user?.id) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('notification_preferences')
        .upsert({
          user_id: user.id,
          ...updates,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notification-preferences', user?.id] });
    },
  });

  // Initialize notification state
  useEffect(() => {
    const initializeState = async () => {
      // Check browser notification permission
      const permission = 'Notification' in window ? Notification.permission : 'denied';
      
      setNotificationState(prev => ({
        ...prev,
        browserPermission: permission,
        toastEnabled: preferences?.toast_notifications_enabled ?? true,
        emailEnabled: preferences?.email_notifications_enabled ?? false,
        supportedTypes: preferences?.notification_types ?? prev.supportedTypes,
      }));
    };

    initializeState();
  }, [preferences]);

  // Set up toast notification listener
  useEffect(() => {
    if (!notificationState.toastEnabled) return;

    const unsubscribe = NotificationService.onToast((type: string, message: string) => {
      // Handle toast notifications
      console.log(`Toast notification: ${type} - ${message}`);
      
      // Optionally send browser notification for important toasts
      if (notificationState.browserPermission === 'granted' && 
          preferences?.browser_notifications_enabled &&
          ['error', 'warning'].includes(type)) {
        NotificationService.showBrowserNotification(`Webinar Sync ${type}`, {
          body: message,
          tag: `sync-${type}`,
        });
      }
    });

    return unsubscribe;
  }, [notificationState.toastEnabled, notificationState.browserPermission, preferences?.browser_notifications_enabled]);

  // Request browser notification permission
  const requestBrowserPermission = useCallback(async () => {
    try {
      const permission = await NotificationService.requestPermission();
      setNotificationState(prev => ({
        ...prev,
        browserPermission: permission,
      }));

      if (permission === 'granted') {
        // Update preferences to enable browser notifications
        await updatePreferencesMutation.mutateAsync({
          browser_notifications_enabled: true,
        });
      }

      return permission;
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      return 'denied';
    }
  }, [updatePreferencesMutation]);

  // Update notification preferences
  const updatePreferences = useCallback(async (updates: Partial<NotificationPreferences>) => {
    try {
      await updatePreferencesMutation.mutateAsync(updates);
    } catch (error) {
      console.error('Error updating notification preferences:', error);
      throw error;
    }
  }, [updatePreferencesMutation]);

  // Send notification based on type and user preferences
  const sendNotification = useCallback((
    type: string,
    message: string,
    options?: {
      title?: string;
      priority?: 'low' | 'normal' | 'high';
      persistent?: boolean;
    }
  ) => {
    const { title = 'Webinar Sync Notification', priority = 'normal' } = options || {};

    // Check if notification type is enabled
    if (!notificationState.supportedTypes.includes(type)) {
      return;
    }

    // Show toast notification
    if (notificationState.toastEnabled) {
      switch (type) {
        case 'sync_complete':
          NotificationService.showSuccess(message);
          break;
        case 'sync_failed':
          NotificationService.showError(message);
          break;
        case 'rate_limit_warning':
          NotificationService.showWarning(message);
          break;
        default:
          NotificationService.showInfo(message);
      }
    }

    // Show browser notification for important messages
    if (notificationState.browserPermission === 'granted' && 
        preferences?.browser_notifications_enabled &&
        (priority === 'high' || ['sync_failed', 'rate_limit_warning'].includes(type))) {
      NotificationService.showBrowserNotification(title, {
        body: message,
        tag: `sync-${type}`,
        requireInteraction: options?.persistent,
      });
    }
  }, [notificationState, preferences]);

  return {
    preferences,
    notificationState,
    isLoading,
    requestBrowserPermission,
    updatePreferences,
    sendNotification,
    isUpdating: updatePreferencesMutation.isPending,
  };
};
