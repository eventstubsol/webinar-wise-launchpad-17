
import { useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface RealtimeUpdateHandlers {
  onWebinarUpdate?: (webinar: any) => void;
  onSyncUpdate?: (syncLog: any) => void;
  onParticipantUpdate?: (participant: any) => void;
}

export const useRealtimeUpdates = (handlers: RealtimeUpdateHandlers = {}) => {
  const { user } = useAuth();
  const { toast } = useToast();

  const handleWebinarUpdate = useCallback((payload: any) => {
    const { eventType, new: newRecord, old: oldRecord } = payload;
    
    if (handlers.onWebinarUpdate) {
      handlers.onWebinarUpdate(newRecord);
    }

    // Show notification for important updates
    if (eventType === 'INSERT') {
      toast({
        title: "New Webinar Added",
        description: `"${newRecord.topic}" has been added to your account`,
      });
    } else if (eventType === 'UPDATE' && newRecord.status !== oldRecord?.status) {
      const statusMessages = {
        started: 'has started',
        finished: 'has ended',
        cancelled: 'has been cancelled'
      };
      
      const message = statusMessages[newRecord.status as keyof typeof statusMessages];
      if (message) {
        toast({
          title: "Webinar Status Update",
          description: `"${newRecord.topic}" ${message}`,
        });
      }
    }
  }, [handlers.onWebinarUpdate, toast]);

  const handleSyncUpdate = useCallback((payload: any) => {
    const { new: newRecord } = payload;
    
    if (handlers.onSyncUpdate) {
      handlers.onSyncUpdate(newRecord);
    }

    // Show notification for sync completion
    if (newRecord.sync_status === 'completed') {
      toast({
        title: "Sync Completed",
        description: `${newRecord.sync_type} sync finished successfully`,
      });
    } else if (newRecord.sync_status === 'failed') {
      toast({
        title: "Sync Failed",
        description: newRecord.error_message || 'Sync operation failed',
        variant: "destructive",
      });
    }
  }, [handlers.onSyncUpdate, toast]);

  const handleParticipantUpdate = useCallback((payload: any) => {
    const { new: newRecord } = payload;
    
    if (handlers.onParticipantUpdate) {
      handlers.onParticipantUpdate(newRecord);
    }
  }, [handlers.onParticipantUpdate]);

  useEffect(() => {
    if (!user) return;

    // Subscribe to webinar updates
    const webinarChannel = supabase
      .channel('webinar-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'zoom_webinars',
          filter: `connection_id=in.(select id from zoom_connections where user_id=eq.${user.id})`
        },
        handleWebinarUpdate
      )
      .subscribe();

    // Subscribe to sync log updates
    const syncChannel = supabase
      .channel('sync-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'zoom_sync_logs',
          filter: `connection_id=in.(select id from zoom_connections where user_id=eq.${user.id})`
        },
        handleSyncUpdate
      )
      .subscribe();

    // Subscribe to participant updates
    const participantChannel = supabase
      .channel('participant-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'zoom_participants',
          filter: `webinar_id=in.(select id from zoom_webinars where connection_id in (select id from zoom_connections where user_id=eq.${user.id}))`
        },
        handleParticipantUpdate
      )
      .subscribe();

    return () => {
      supabase.removeChannel(webinarChannel);
      supabase.removeChannel(syncChannel);
      supabase.removeChannel(participantChannel);
    };
  }, [user, handleWebinarUpdate, handleSyncUpdate, handleParticipantUpdate]);

  return {
    // Channel status could be exposed here if needed
  };
};
