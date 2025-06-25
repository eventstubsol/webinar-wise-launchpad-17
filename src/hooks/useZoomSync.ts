
import { useState, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { ZoomConnection, SyncType } from '@/types/zoom';
import { RenderZoomService } from '@/services/zoom/RenderZoomService';
import { useQuery } from '@tanstack/react-query';

interface SyncProgress {
  progress: number;
  status: 'idle' | 'syncing' | 'completed' | 'failed' | 'no_data';
  currentOperation: string;
  syncId?: string;
}

export const useZoomSync = (connection: ZoomConnection | null) => {
  const { toast } = useToast();
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

  const isSyncing = syncProgress.status === 'syncing';
  const syncStatus = syncProgress.status;
  const currentOperation = syncProgress.currentOperation;

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
        pollSyncProgress(result.syncId);

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
  }, [connection, healthCheck, toast]);

  const pollSyncProgress = useCallback(async (syncId: string) => {
    const pollInterval = setInterval(async () => {
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

          if (result.status === 'completed' || result.status === 'failed') {
            clearInterval(pollInterval);
            
            if (result.status === 'completed') {
              toast({
                title: "Sync Completed",
                description: "Webinar data has been synchronized successfully.",
              });
            }
          }
        }
      } catch (error) {
        console.error('Error polling sync progress:', error);
        clearInterval(pollInterval);
        setSyncProgress(prev => ({
          ...prev,
          status: 'failed',
          currentOperation: 'Failed to get sync progress',
        }));
      }
    }, 2000);

    // Clear interval after 5 minutes to prevent infinite polling
    setTimeout(() => clearInterval(pollInterval), 5 * 60 * 1000);
  }, [toast]);

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

  return {
    startSync,
    testApiConnection,
    isSyncing,
    syncProgress: syncProgress.progress,
    syncStatus,
    currentOperation,
    healthCheck,
  };
};
