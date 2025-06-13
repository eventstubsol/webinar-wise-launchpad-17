
import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { SyncType, SyncStatus, ZoomSyncLog } from '@/types/zoom';
import { SyncError } from './types';

export const useSyncOperations = (connectionId: string) => {
  const { user } = useAuth();
  const { toast } = useToast();

  // Start sync operation
  const startSync = useCallback(async (type: SyncType, options?: { webinarId?: string }) => {
    if (!user || !connectionId) {
      toast({
        title: "Authentication Required",
        description: "Please sign in to start sync operations.",
        variant: "destructive",
      });
      return;
    }

    try {
      const response = await supabase.functions.invoke('zoom-sync-webinars', {
        body: {
          connectionId,
          syncType: type,
          webinarId: options?.webinarId,
        },
      });

      if (response.error) {
        throw new Error(response.error.message || 'Failed to start sync');
      }

      toast({
        title: "Sync Started",
        description: `${type} sync has been initiated successfully.`,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      
      toast({
        title: "Sync Failed to Start",
        description: errorMessage,
        variant: "destructive",
      });
      
      throw new Error(errorMessage);
    }
  }, [user, connectionId, toast]);

  // Cancel sync operation
  const cancelSync = useCallback(async (currentSync: ZoomSyncLog | null) => {
    if (!currentSync) return;

    try {
      // Update sync status to cancelled
      const { error } = await supabase
        .from('zoom_sync_logs')
        .update({
          sync_status: SyncStatus.CANCELLED,
          completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', currentSync.id);

      if (error) throw error;

      toast({
        title: "Sync Cancelled",
        description: "The sync operation has been cancelled.",
      });
    } catch (error) {
      toast({
        title: "Failed to Cancel",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive",
      });
    }
  }, [toast]);

  // Transform sync log to history entry
  const transformToHistoryEntry = useCallback((syncLog: ZoomSyncLog) => {
    const duration = syncLog.completed_at && syncLog.started_at
      ? Math.round((new Date(syncLog.completed_at).getTime() - new Date(syncLog.started_at).getTime()) / 1000)
      : undefined;

    return {
      id: syncLog.id,
      type: syncLog.sync_type,
      status: syncLog.sync_status,
      startedAt: syncLog.started_at,
      completedAt: syncLog.completed_at || undefined,
      totalItems: syncLog.total_items || 0,
      processedItems: syncLog.processed_items || 0,
      duration,
    };
  }, []);

  return {
    startSync,
    cancelSync,
    transformToHistoryEntry,
  };
};
