
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface SyncQueueItem {
  id: string;
  sync_id: string;
  webinar_id: string;
  webinar_title: string | null;
  queue_position: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  started_at: string | null;
  completed_at: string | null;
  error_message: string | null;
  estimated_duration_seconds: number | null;
  created_at: string;
  updated_at: string;
}

export const useSyncQueue = (connectionId: string) => {
  const [queueItems, setQueueItems] = useState<SyncQueueItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadSyncQueue = async () => {
    if (!connectionId) return;

    try {
      setIsLoading(true);
      setError(null);

      const { data, error: queueError } = await supabase
        .from('sync_queue')
        .select(`
          *,
          zoom_sync_logs!inner(connection_id)
        `)
        .eq('zoom_sync_logs.connection_id', connectionId)
        .order('queue_position', { ascending: true });

      if (queueError) throw queueError;

      setQueueItems(data as SyncQueueItem[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load sync queue');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadSyncQueue();

    // Set up real-time subscription for queue updates
    const channel = supabase
      .channel(`sync-queue-${connectionId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'sync_queue',
        },
        () => {
          loadSyncQueue();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [connectionId]);

  const getQueueSummary = () => {
    const pending = queueItems.filter(item => item.status === 'pending').length;
    const processing = queueItems.filter(item => item.status === 'processing').length;
    const completed = queueItems.filter(item => item.status === 'completed').length;
    const failed = queueItems.filter(item => item.status === 'failed').length;

    return { pending, processing, completed, failed, total: queueItems.length };
  };

  const getCurrentItem = () => {
    return queueItems.find(item => item.status === 'processing') || null;
  };

  const getEstimatedTimeRemaining = () => {
    const pendingItems = queueItems.filter(item => item.status === 'pending');
    const totalEstimatedSeconds = pendingItems.reduce(
      (sum, item) => sum + (item.estimated_duration_seconds || 120), // Default 2 minutes
      0
    );
    return totalEstimatedSeconds;
  };

  return {
    queueItems,
    isLoading,
    error,
    refreshQueue: loadSyncQueue,
    getQueueSummary,
    getCurrentItem,
    getEstimatedTimeRemaining,
  };
};
