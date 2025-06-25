
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { SyncStatus } from '@/types/zoom';

interface SyncProgressData {
  id: string;
  sync_id: string;
  total_webinars: number;
  completed_webinars: number;
  current_webinar_name: string | null;
  current_webinar_index: number;
  current_stage: string | null;
  estimated_completion: string | null;
  started_at: string;
  updated_at: string;
}

interface SyncLogData {
  id: string;
  sync_status: SyncStatus;
  total_items: number | null;
  processed_items: number | null;
  // Use processed_items instead of failed_items to match database schema
  webinars_synced: number | null;
  error_message: string | null;
  started_at: string;
  completed_at: string | null;
}

interface RecentWebinar {
  id: string;
  name: string;
  status: 'completed' | 'failed' | 'processing';
  completedAt: string;
}

export const useRealTimeSyncProgress = (connectionId: string) => {
  const [activeProgress, setActiveProgress] = useState<SyncProgressData | null>(null);
  const [activeSyncLog, setActiveSyncLog] = useState<SyncLogData | null>(null);
  const [recentWebinars, setRecentWebinars] = useState<RecentWebinar[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Calculate progress percentage
  const progressPercentage = activeProgress 
    ? Math.round((activeProgress.completed_webinars / Math.max(activeProgress.total_webinars, 1)) * 100)
    : 0;

  // Calculate estimated time remaining
  const estimatedTimeRemaining = useCallback(() => {
    if (!activeProgress || !activeProgress.estimated_completion) return null;
    
    const now = new Date();
    const completion = new Date(activeProgress.estimated_completion);
    const diffMs = completion.getTime() - now.getTime();
    
    if (diffMs <= 0) return null;
    
    const minutes = Math.round(diffMs / (1000 * 60));
    if (minutes < 60) return `${minutes}m remaining`;
    
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes}m remaining`;
  }, [activeProgress]);

  // Load initial active sync
  const loadActiveSyncProgress = useCallback(async () => {
    try {
      const { data: syncLogs, error: syncError } = await supabase
        .from('zoom_sync_logs')
        .select('id, sync_status, total_items, processed_items, webinars_synced, error_message, started_at, completed_at')
        .eq('connection_id', connectionId)
        .in('sync_status', ['started', 'in_progress'])
        .order('started_at', { ascending: false })
        .limit(1);

      if (syncError) throw syncError;

      if (syncLogs && syncLogs.length > 0) {
        const syncLog = syncLogs[0] as SyncLogData;
        setActiveSyncLog(syncLog);

        // Load progress data for this sync
        const { data: progressData, error: progressError } = await supabase
          .from('sync_progress')
          .select('*')
          .eq('sync_id', syncLog.id)
          .order('updated_at', { ascending: false })
          .limit(1);

        if (progressError) throw progressError;
        
        if (progressData && progressData.length > 0) {
          setActiveProgress(progressData[0] as SyncProgressData);
        }
      } else {
        setActiveProgress(null);
        setActiveSyncLog(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load sync progress');
    }
  }, [connectionId]);

  // Load recent webinars
  const loadRecentWebinars = useCallback(async () => {
    try {
      const { data: logs, error } = await supabase
        .from('zoom_sync_logs')
        .select('id, sync_status, completed_at, updated_at')
        .eq('connection_id', connectionId)
        .in('sync_status', ['completed', 'failed'])
        .order('completed_at', { ascending: false })
        .limit(5);

      if (error) throw error;

      if (logs) {
        const webinars: RecentWebinar[] = logs.map((log: any) => ({
          id: log.id,
          name: `Sync ${log.id.slice(0, 8)}`,
          status: log.sync_status === 'completed' ? 'completed' : 'failed',
          completedAt: log.completed_at || log.updated_at
        }));
        setRecentWebinars(webinars);
      }
    } catch (err) {
      console.error('Failed to load recent webinars:', err);
    }
  }, [connectionId]);

  // Cancel sync function
  const cancelSync = useCallback(async () => {
    if (!activeSyncLog) return;

    try {
      // Update sync log status to cancelled
      const { error } = await supabase
        .from('zoom_sync_logs')
        .update({ 
          sync_status: 'cancelled',
          completed_at: new Date().toISOString(),
          error_message: 'Sync cancelled by user'
        })
        .eq('id', activeSyncLog.id);

      if (error) throw error;

      // Clear active progress
      setActiveProgress(null);
      setActiveSyncLog(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to cancel sync');
    }
  }, [activeSyncLog]);

  // Set up real-time subscriptions
  useEffect(() => {
    if (!connectionId) return;

    const progressChannel = supabase
      .channel(`sync-progress-${connectionId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'sync_progress',
        },
        (payload) => {
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const progressData = payload.new as SyncProgressData;
            setActiveProgress(progressData);
          } else if (payload.eventType === 'DELETE') {
            setActiveProgress(null);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'zoom_sync_logs',
          filter: `connection_id=eq.${connectionId}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const syncLog = payload.new as any;
            
            if (syncLog.sync_status === 'started' || syncLog.sync_status === 'in_progress') {
              setActiveSyncLog({
                id: syncLog.id,
                sync_status: syncLog.sync_status,
                total_items: syncLog.total_items,
                processed_items: syncLog.processed_items,
                webinars_synced: syncLog.webinars_synced,
                error_message: syncLog.error_message,
                started_at: syncLog.started_at,
                completed_at: syncLog.completed_at
              });
            } else if (syncLog.sync_status === 'completed' || 
                      syncLog.sync_status === 'failed' || 
                      syncLog.sync_status === 'cancelled') {
              setActiveSyncLog(null);
              setActiveProgress(null);
              loadRecentWebinars(); // Refresh recent webinars
            }
          }
        }
      )
      .subscribe((status) => {
        setIsConnected(status === 'SUBSCRIBED');
        if (status === 'CHANNEL_ERROR') {
          setError('Lost real-time connection');
        }
      });

    // Load initial data
    loadActiveSyncProgress();
    loadRecentWebinars();

    return () => {
      supabase.removeChannel(progressChannel);
    };
  }, [connectionId, loadActiveSyncProgress, loadRecentWebinars]);

  return {
    activeProgress,
    activeSyncLog,
    recentWebinars,
    progressPercentage,
    estimatedTimeRemaining: estimatedTimeRemaining(),
    isConnected,
    error,
    cancelSync,
    refreshData: () => {
      loadActiveSyncProgress();
      loadRecentWebinars();
    }
  };
};
