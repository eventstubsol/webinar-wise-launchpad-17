
import { useState, useCallback, useRef, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { ZoomConnection, SyncType } from '@/types/zoom';
import { RenderZoomService } from '@/services/zoom/RenderZoomService';
import { useQuery, useQueryClient } from '@tanstack/react-query';

interface SyncProgress {
  progress: number;
  status: 'idle' | 'syncing' | 'completed' | 'failed' | 'no_data';
  currentOperation: string;
  syncId?: string;
}

export const useZoomSync = (connection: ZoomConnection | null) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  const [syncProgress, setSyncProgress] = useState<SyncProgress>({
    progress: 0,
    status: 'idle',
    currentOperation: '',
  });

  // Health check query
  const { data: healthCheck } = useQuery({
    queryKey: ['render-health'],
    queryFn: () => RenderZoomService.healthCheck(),
    refetchInterval: 60000,
    retry: 1,
  });

  const clearProgressInterval = useCallback(() => {
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
  }, []);

  const isSyncing = syncProgress.status === 'syncing';
  const syncStatus = syncProgress.status;
  const currentOperation = syncProgress.currentOperation;
  const activeSyncId = syncProgress.syncId;

  const pollSyncProgress = useCallback(async (syncId: string) => {
    try {
      const result = await RenderZoomService.getSyncProgress(syncId);
      
      if (result.success) {
        setSyncProgress(prev => ({
          ...prev,
          progress: result.progress || prev.progress,
          currentOperation: result.currentOperation || prev.currentOperation,
          status: result.status === 'completed' ? 'completed' : 
                 result.status === 'failed' ? 'failed' : 'syncing',
        }));

        if (result.status === 'completed') {
          clearProgressInterval();
          queryClient.invalidateQueries({ queryKey: ['zoom-webinars'] });
          queryClient.invalidateQueries({ queryKey: ['zoom-sync-history'] });
          
          toast({
            title: "Sync Completed",
            description: "Webinar data has been synchronized successfully.",
          });
        } else if (result.status === 'failed') {
          clearProgressInterval();
          toast({
            title: "Sync Failed",
            description: result.error || "Sync operation failed.",
            variant: "destructive",
          });
        }
      }
    } catch (error) {
      console.error('Error polling sync progress:', error);
      clearProgressInterval();
      setSyncProgress(prev => ({
        ...prev,
        status: 'failed',
        currentOperation: 'Failed to get sync progress',
      }));
    }
  }, [clearProgressInterval, queryClient, toast]);

  const startSync = useCallback(async (syncType: SyncType) => {
    if (!connection) {
      toast({
        title: "No Connection",
        description: "Please connect your Zoom account first.",
        variant: "destructive",
      });
      return;
    }

    if (!healthCheck?.success) {
      toast({
        title: "Service Unavailable",
        description: "Render sync service is currently unavailable. Please try again later.",
        variant: "destructive",
      });
      return;
    }

    try {
      setSyncProgress({
        progress: 0,
        status: 'syncing',
        currentOperation: 'Starting sync...',
      });

      const syncTypeMap = {
        [SyncType.INITIAL]: 'initial' as const,
        [SyncType.INCREMENTAL]: 'incremental' as const,
        [SyncType.MANUAL]: 'incremental' as const,
      };

      const result = await RenderZoomService.startSync(
        connection.id,
        syncTypeMap[syncType]
      );

      if (result.success && result.syncId) {
        setSyncProgress(prev => ({
          ...prev,
          syncId: result.syncId,
          currentOperation: 'Sync started successfully',
        }));

        // Start polling for progress
        progressIntervalRef.current = setInterval(() => {
          pollSyncProgress(result.syncId!);
        }, 2000);

        toast({
          title: "Sync Started",
          description: result.message || "Webinar sync has been started.",
        });
      } else {
        throw new Error(result.error || 'Failed to start sync');
      }
    } catch (error) {
      console.error('Sync error:', error);
      setSyncProgress({
        progress: 0,
        status: 'failed',
        currentOperation: '',
      });

      toast({
        title: "Sync Failed",
        description: error instanceof Error ? error.message : 'Unknown error occurred',
        variant: "destructive",
      });
    }
  }, [connection, healthCheck, toast, pollSyncProgress]);

  const cancelSync = useCallback(async () => {
    if (!activeSyncId) return;

    try {
      const result = await RenderZoomService.cancelSync(activeSyncId);
      
      if (result.success) {
        setSyncProgress({
          progress: 0,
          status: 'idle',
          currentOperation: '',
        });
        clearProgressInterval();
        
        toast({
          title: "Sync cancelled",
          description: "The synchronization has been cancelled.",
        });
      } else {
        throw new Error(result.error || 'Failed to cancel sync');
      }
    } catch (error) {
      console.error('Error cancelling sync:', error);
      toast({
        title: "Cancel failed",
        description: "Unable to cancel the sync operation.",
        variant: "destructive",
      });
    }
  }, [activeSyncId, clearProgressInterval, toast]);

  const testApiConnection = useCallback(async () => {
    if (!connection) {
      toast({
        title: "No Connection",
        description: "Please connect your Zoom account first.",
        variant: "destructive",
      });
      return;
    }

    try {
      const result = await RenderZoomService.testConnection();
      
      if (result.success) {
        toast({
          title: "Connection Test Successful",
          description: result.message,
        });
      } else {
        toast({
          title: "Connection Test Failed",
          description: result.message,
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Test Failed",
        description: error instanceof Error ? error.message : 'Unknown error occurred',
        variant: "destructive",
      });
    }
  }, [connection, toast]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearProgressInterval();
    };
  }, [clearProgressInterval]);

  return {
    startSync,
    cancelSync,
    testApiConnection,
    isSyncing,
    syncProgress: syncProgress.progress,
    syncStatus,
    currentOperation,
    activeSyncId,
    healthCheck,
  };
};
