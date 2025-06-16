
import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { SyncType, SyncStatus, ZoomSyncLog } from '@/types/zoom';
import { SyncRecoveryService } from '@/services/zoom/sync/SyncRecoveryService';
import { SyncError } from './types';

export const useSyncOperations = (connectionId: string) => {
  const { user } = useAuth();
  const { toast } = useToast();

  // Start sync operation with improved error handling
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
      // First, cleanup any stuck syncs
      await SyncRecoveryService.cleanupStuckSyncs(connectionId);

      // Check for active syncs
      const hasActive = await SyncRecoveryService.hasActiveSyncs(connectionId);
      if (hasActive) {
        toast({
          title: "Sync Already Running",
          description: "Please wait for the current sync to complete before starting a new one.",
          variant: "destructive",
        });
        return;
      }

      const response = await supabase.functions.invoke('zoom-sync-webinars', {
        body: {
          connectionId,
          syncType: type,
          webinarId: options?.webinarId,
        },
      });

      if (response.error) {
        // Handle specific error types
        if (response.error.message?.includes('409') || response.error.message?.includes('already in progress')) {
          // Try to cleanup and retry once
          await SyncRecoveryService.cleanupStuckSyncs(connectionId);
          
          toast({
            title: "Sync Conflict Resolved",
            description: "Cleaned up stuck sync. Please try again.",
            variant: "default",
          });
          return;
        }
        
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

  // Retry failed sync
  const retryFailedSync = useCallback(async (syncType: SyncType = SyncType.INCREMENTAL) => {
    if (!user || !connectionId) {
      toast({
        title: "Authentication Required",
        description: "Please sign in to retry sync operations.",
        variant: "destructive",
      });
      return;
    }

    try {
      await SyncRecoveryService.retryFailedSync(connectionId, syncType);
      
      toast({
        title: "Sync Retry Started",
        description: "The failed sync operation has been retried.",
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to retry sync';
      
      toast({
        title: "Retry Failed",
        description: errorMessage,
        variant: "destructive",
      });
      
      throw new Error(errorMessage);
    }
  }, [user, connectionId, toast]);

  // Cancel sync operation with improved handling
  const cancelSync = useCallback(async (currentSync: ZoomSyncLog | null) => {
    if (!currentSync) return;

    try {
      // Try to cancel via the recovery service
      await SyncRecoveryService.cancelActiveSync(connectionId);

      toast({
        title: "Sync Cancelled",
        description: "The sync operation has been cancelled.",
      });
    } catch (error) {
      // Fallback to direct database update
      try {
        const { error: dbError } = await supabase
          .from('zoom_sync_logs')
          .update({
            sync_status: SyncStatus.CANCELLED,
            completed_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', currentSync.id);

        if (dbError) throw dbError;

        toast({
          title: "Sync Cancelled",
          description: "The sync operation has been cancelled.",
        });
      } catch (dbError) {
        toast({
          title: "Failed to Cancel",
          description: dbError instanceof Error ? dbError.message : "Unknown error occurred",
          variant: "destructive",
        });
      }
    }
  }, [connectionId, toast]);

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
    retryFailedSync,
    cancelSync,
    transformToHistoryEntry,
  };
};
