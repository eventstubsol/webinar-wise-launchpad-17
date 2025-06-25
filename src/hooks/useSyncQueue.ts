
import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface SyncQueueItem {
  id: string;
  sync_id: string;
  webinar_id?: string;
  webinar_title?: string;
  queue_position: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  started_at?: string;
  completed_at?: string;
  error_message?: string;
  estimated_duration_seconds?: number;
  created_at: string;
  updated_at: string;
}

export const useSyncQueue = (connectionId?: string, syncId?: string) => {
  const [realtimeUpdates, setRealtimeUpdates] = useState<SyncQueueItem[]>([]);

  // Query for sync queue items
  const { data: queueItems = [], isLoading, error, refetch } = useQuery({
    queryKey: ['sync-queue', connectionId, syncId],
    queryFn: async () => {
      if (!connectionId) return [];

      try {
        let query = supabase
          .from('sync_queue')
          .select(`
            *,
            zoom_sync_logs!inner (
              connection_id,
              created_at,
              sync_status
            )
          `)
          .eq('zoom_sync_logs.connection_id', connectionId)
          .order('queue_position', { ascending: true });

        if (syncId) {
          query = query.eq('sync_id', syncId);
        }

        const { data, error } = await query;
        
        if (error) throw error;
        
        return (data || []) as SyncQueueItem[];
      } catch (error) {
        console.error('Error fetching sync queue:', error);
        return [];
      }
    },
    enabled: !!connectionId,
    refetchInterval: 5000,
  });

  // Calculate queue statistics
  const queueStats = React.useMemo(() => {
    const total = queueItems.length;
    const pending = queueItems.filter(item => item.status === 'pending').length;
    const processing = queueItems.filter(item => item.status === 'processing').length;
    const completed = queueItems.filter(item => item.status === 'completed').length;
    const failed = queueItems.filter(item => item.status === 'failed').length;

    const estimatedTotalTime = queueItems
      .filter(item => item.status === 'pending' && item.estimated_duration_seconds)
      .reduce((sum, item) => sum + (item.estimated_duration_seconds || 0), 0);

    return {
      total,
      pending,
      processing,
      completed,
      failed,
      estimatedTotalTime,
      completionRate: total > 0 ? (completed / total) * 100 : 0,
    };
  }, [queueItems]);

  // Helper functions
  const getQueueSummary = () => queueStats;
  const getCurrentItem = () => queueItems.find(item => item.status === 'processing');
  const getEstimatedTimeRemaining = () => queueStats.estimatedTotalTime;

  // Set up real-time subscription
  useEffect(() => {
    if (!connectionId) return;

    const channel = supabase
      .channel(`sync-queue-${connectionId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'sync_queue',
        },
        (payload) => {
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const item = payload.new as SyncQueueItem;
            setRealtimeUpdates(prev => {
              const filtered = prev.filter(i => i.id !== item.id);
              return [...filtered, item].sort((a, b) => a.queue_position - b.queue_position);
            });
          } else if (payload.eventType === 'DELETE') {
            setRealtimeUpdates(prev => prev.filter(i => i.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [connectionId]);

  // Add item to queue
  const addToQueue = async (
    syncId: string,
    webinarId?: string,
    webinarTitle?: string,
    estimatedDuration?: number
  ) => {
    try {
      // Get next queue position
      const { data: lastItem } = await supabase
        .from('sync_queue')
        .select('queue_position')
        .eq('sync_id', syncId)
        .order('queue_position', { ascending: false })
        .limit(1)
        .maybeSingle();

      const nextPosition = (lastItem?.queue_position || 0) + 1;

      const { error } = await supabase
        .from('sync_queue')
        .insert({
          sync_id: syncId,
          webinar_id: webinarId,
          webinar_title: webinarTitle,
          queue_position: nextPosition,
          estimated_duration_seconds: estimatedDuration,
        });

      if (error) throw error;
    } catch (error) {
      console.error('Error adding to sync queue:', error);
    }
  };

  // Update queue item status
  const updateQueueItem = async (
    itemId: string,
    status: SyncQueueItem['status'],
    errorMessage?: string
  ) => {
    try {
      const updates: any = { status };
      
      if (status === 'processing') {
        updates.started_at = new Date().toISOString();
      } else if (status === 'completed' || status === 'failed') {
        updates.completed_at = new Date().toISOString();
        if (errorMessage) {
          updates.error_message = errorMessage;
        }
      }

      const { error } = await supabase
        .from('sync_queue')
        .update(updates)
        .eq('id', itemId);

      if (error) throw error;
    } catch (error) {
      console.error('Error updating queue item:', error);
    }
  };

  return {
    queueItems,
    realtimeUpdates,
    queueStats,
    getQueueSummary,
    getCurrentItem,
    getEstimatedTimeRemaining,
    isLoading,
    error,
    refetch,
    addToQueue,
    updateQueueItem,
  };
};
