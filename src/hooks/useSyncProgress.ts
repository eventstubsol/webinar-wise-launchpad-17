
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useZoomConnection } from '@/hooks/useZoomConnection';
import { ZoomSyncLog, SyncStatus, SyncType } from '@/types/zoom';

export interface SyncProgressData {
  id: string;
  syncType: SyncType;
  status: SyncStatus;
  totalItems: number;
  processedItems: number;
  resourceType?: string;
  errorMessage?: string;
  startedAt: string;
  progressPercentage: number;
}

export const useSyncProgress = () => {
  const { connection } = useZoomConnection();
  const [activeSyncs, setActiveSyncs] = useState<SyncProgressData[]>([]);
  const [isConnected, setIsConnected] = useState(false);

  const calculateProgress = useCallback((totalItems: number, processedItems: number): number => {
    if (!totalItems || totalItems === 0) return 0;
    return Math.min(100, Math.round((processedItems / totalItems) * 100));
  }, []);

  const transformSyncLog = useCallback((syncLog: ZoomSyncLog): SyncProgressData => {
    return {
      id: syncLog.id,
      syncType: syncLog.sync_type,
      status: syncLog.sync_status,
      totalItems: syncLog.total_items || 0,
      processedItems: syncLog.processed_items || 0,
      resourceType: syncLog.resource_type || undefined,
      errorMessage: syncLog.error_message || undefined,
      startedAt: syncLog.started_at,
      progressPercentage: calculateProgress(syncLog.total_items || 0, syncLog.processed_items || 0),
    };
  }, [calculateProgress]);

  const getActiveSyncById = useCallback((id: string) => {
    return activeSyncs.find(sync => sync.id === id);
  }, [activeSyncs]);

  const hasActiveSyncs = activeSyncs.length > 0;
  const hasFailedSyncs = activeSyncs.some(sync => sync.status === SyncStatus.FAILED);
  const hasInProgressSyncs = activeSyncs.some(sync => 
    sync.status === SyncStatus.IN_PROGRESS || sync.status === SyncStatus.STARTED
  );

  useEffect(() => {
    if (!connection?.id) return;

    const channel = supabase
      .channel('sync-progress-hook')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'zoom_sync_logs',
          filter: `connection_id=eq.${connection.id}`,
        },
        (payload) => {
          const syncLog = payload.new as ZoomSyncLog;
          
          if (payload.eventType === 'DELETE') {
            setActiveSyncs(prev => prev.filter(sync => sync.id !== (payload.old as ZoomSyncLog).id));
            return;
          }

          if (syncLog) {
            const syncData = transformSyncLog(syncLog);
            
            setActiveSyncs(prev => {
              const existingIndex = prev.findIndex(sync => sync.id === syncData.id);
              
              if (existingIndex >= 0) {
                // Update existing sync
                const updated = [...prev];
                updated[existingIndex] = syncData;
                
                // Remove completed/cancelled syncs after a delay
                if (syncData.status === SyncStatus.COMPLETED || syncData.status === SyncStatus.CANCELLED) {
                  setTimeout(() => {
                    setActiveSyncs(current => current.filter(sync => sync.id !== syncData.id));
                  }, 5000);
                }
                
                return updated;
              } else {
                // Add new sync if it's active
                if (syncData.status === SyncStatus.STARTED || 
                    syncData.status === SyncStatus.IN_PROGRESS ||
                    syncData.status === SyncStatus.FAILED) {
                  return [...prev, syncData];
                }
                return prev;
              }
            });
          }
        }
      )
      .subscribe((status) => {
        setIsConnected(status === 'SUBSCRIBED');
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [connection?.id, transformSyncLog]);

  const clearSync = useCallback((syncId: string) => {
    setActiveSyncs(prev => prev.filter(sync => sync.id !== syncId));
  }, []);

  const clearAllSyncs = useCallback(() => {
    setActiveSyncs([]);
  }, []);

  return {
    activeSyncs,
    isConnected,
    hasActiveSyncs,
    hasFailedSyncs,
    hasInProgressSyncs,
    getActiveSyncById,
    clearSync,
    clearAllSyncs,
  };
};
