
import { useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { SyncStatus } from '@/types/zoom';
import { SyncError, SyncHistoryEntry } from './types';

interface UseSyncSubscriptionProps {
  connectionId: string;
  onSyncUpdate: (syncLog: any) => void;
  onHistoryUpdate: (entry: SyncHistoryEntry) => void;
  onError: (error: SyncError) => void;
  onConnectionChange: (connected: boolean) => void;
  updateProgressHistory: (processed: number) => void;
  transformToHistoryEntry: (syncLog: any) => SyncHistoryEntry;
}

export const useSyncSubscription = ({
  connectionId,
  onSyncUpdate,
  onHistoryUpdate,
  onError,
  onConnectionChange,
  updateProgressHistory,
  transformToHistoryEntry,
}: UseSyncSubscriptionProps) => {

  // Set up real-time subscription
  useEffect(() => {
    if (!connectionId) return;

    const channel = supabase
      .channel(`sync-progress-${connectionId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'zoom_sync_logs',
          filter: `connection_id=eq.${connectionId}`,
        },
        (payload) => {
          const syncLog = payload.new as any;
          
          if (payload.eventType === 'DELETE') {
            return;
          }

          if (syncLog) {
            // Update progress history for time estimation
            if (syncLog.processed_items !== undefined) {
              updateProgressHistory(syncLog.processed_items);
            }

            // Handle active syncs
            if (syncLog.sync_status === SyncStatus.STARTED || 
                syncLog.sync_status === SyncStatus.IN_PROGRESS) {
              onSyncUpdate(syncLog);
            }
            
            // Handle completed/failed syncs
            else if (syncLog.sync_status === SyncStatus.COMPLETED ||
                     syncLog.sync_status === SyncStatus.FAILED ||
                     syncLog.sync_status === SyncStatus.CANCELLED) {
              
              // Add to history
              const historyEntry = transformToHistoryEntry(syncLog);
              onHistoryUpdate(historyEntry);

              // Handle errors
              if (syncLog.sync_status === SyncStatus.FAILED && syncLog.error_message) {
                onError({
                  id: `sync-error-${syncLog.id}`,
                  message: syncLog.error_message,
                  code: syncLog.error_details?.error_code,
                  timestamp: new Date().toISOString(),
                  dismissible: true,
                });
              }
            }
          }
        }
      )
      .subscribe((status) => {
        onConnectionChange(status === 'SUBSCRIBED');
        
        if (status === 'CHANNEL_ERROR') {
          onError({
            id: `connection-error-${Date.now()}`,
            message: 'Lost real-time connection. Some updates may be delayed.',
            timestamp: new Date().toISOString(),
            dismissible: true,
          });
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [connectionId, onSyncUpdate, onHistoryUpdate, onError, onConnectionChange, updateProgressHistory, transformToHistoryEntry]);

  // Load initial sync history
  const loadSyncHistory = useCallback(async () => {
    if (!connectionId) return [];

    const { data, error } = await supabase
      .from('zoom_sync_logs')
      .select('*')
      .eq('connection_id', connectionId)
      .in('sync_status', [SyncStatus.COMPLETED, SyncStatus.FAILED, SyncStatus.CANCELLED])
      .order('started_at', { ascending: false })
      .limit(10);

    if (error) {
      console.error('Failed to load sync history:', error);
      return [];
    }

    if (data) {
      return data.map(transformToHistoryEntry);
    }

    return [];
  }, [connectionId, transformToHistoryEntry]);

  return {
    loadSyncHistory,
  };
};
