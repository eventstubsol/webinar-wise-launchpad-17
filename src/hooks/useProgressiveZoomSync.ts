import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';
import { useQueryClient } from '@tanstack/react-query';

export interface SyncProgress {
  total_pages: number;
  current_page: number;
  total_webinars: number;
  synced_webinars: number;
  status: 'running' | 'completed' | 'failed';
  message: string;
}

export function useProgressiveZoomSync(connectionId?: string) {
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState<SyncProgress | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const startSync = useCallback(async () => {
    if (!connectionId) {
      toast({
        title: "No Connection",
        description: "Please connect to Zoom first",
        variant: "destructive"
      });
      return;
    }

    setIsSyncing(true);
    setSyncProgress({
      total_pages: 0,
      current_page: 0,
      total_webinars: 0,
      synced_webinars: 0,
      status: 'running',
      message: 'Initializing sync...'
    });

    try {
      // Call the progressive sync edge function
      const { data, error } = await supabase.functions.invoke('zoom-progressive-sync', {
        body: { connection_id: connectionId }
      });

      if (error) throw error;

      // Update progress with final result
      setSyncProgress(data.progress);

      if (data.progress.status === 'completed') {
        toast({
          title: "Sync Completed",
          description: `Successfully synced ${data.progress.synced_webinars} webinars`,
        });

        // Invalidate queries to refresh data
        queryClient.invalidateQueries({ queryKey: ['webinars'] });
        queryClient.invalidateQueries({ queryKey: ['webinar-metrics'] });
        queryClient.invalidateQueries({ queryKey: ['last-sync-timestamp'] });
      } else {
        throw new Error(data.progress.message || 'Sync failed');
      }
    } catch (error: any) {
      console.error('Sync error:', error);
      
      const errorMessage = error.message || 'Failed to sync webinars';
      setSyncProgress(prev => prev ? {
        ...prev,
        status: 'failed',
        message: errorMessage
      } : null);

      toast({
        title: "Sync Failed",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setIsSyncing(false);
    }
  }, [connectionId, toast, queryClient]);

  // Subscribe to real-time sync progress updates
  const subscribeSyncProgress = useCallback(async () => {
    if (!connectionId) return;

    const channel = supabase
      .channel(`sync-progress-${connectionId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'zoom_sync_logs',
          filter: `connection_id=eq.${connectionId}`
        },
        (payload) => {
          if (payload.new && payload.new.progress) {
            setSyncProgress(payload.new.progress as SyncProgress);
          }
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [connectionId]);

  const resetProgress = useCallback(() => {
    setSyncProgress(null);
  }, []);

  return {
    isSyncing,
    syncProgress,
    startSync,
    subscribeSyncProgress,
    resetProgress
  };
}