
import { useState, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { RenderZoomService } from '@/services/zoom/RenderZoomService';
import { ZoomConnection, SyncType } from '@/types/zoom';
import { useQuery } from '@tanstack/react-query';

interface SyncState {
  isSyncing: boolean;
  syncProgress: number;
  syncStatus: 'idle' | 'pending' | 'running' | 'completed' | 'failed';
  currentOperation: string;
  syncId: string | null;
  error: string | null;
}

export function useZoomSync(connection: ZoomConnection | null) {
  const { toast } = useToast();
  const [syncState, setSyncState] = useState<SyncState>({
    isSyncing: false,
    syncProgress: 0,
    syncStatus: 'idle',
    currentOperation: '',
    syncId: null,
    error: null
  });

  // Health check query with better error handling
  const { data: healthCheck, refetch: refetchHealth } = useQuery({
    queryKey: ['render-health'],
    queryFn: async () => {
      const result = await RenderZoomService.healthCheck();
      return result;
    },
    refetchInterval: 60000, // Check every minute
    retry: (failureCount, error) => {
      // Don't retry if it's a known service issue
      return failureCount < 2;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  const startSync = useCallback(async (syncType: SyncType = SyncType.MANUAL) => {
    if (!connection?.id) {
      toast({
        title: "No Connection",
        description: "Please connect your Zoom account first.",
        variant: "destructive",
      });
      return;
    }

    // Check service health first
    if (healthCheck && !healthCheck.success) {
      toast({
        title: "Service Unavailable",
        description: healthCheck.error || "Render sync service is currently unavailable. Please try again in a few minutes.",
        variant: "destructive",
      });
      return;
    }

    setSyncState(prev => ({
      ...prev,
      isSyncing: true,
      syncStatus: 'pending',
      currentOperation: 'Preparing to sync...',
      error: null
    }));

    try {
      console.log(`🔄 Starting ${syncType} sync for connection:`, connection.id);
      
      const result = await RenderZoomService.startSync(connection.id, syncType);
      
      if (result.success) {
        setSyncState(prev => ({
          ...prev,
          syncStatus: 'running',
          syncId: result.syncId || null,
          currentOperation: 'Sync started successfully...'
        }));

        toast({
          title: "Sync Started",
          description: result.message || "Webinar sync has been initiated.",
        });

        // Simulate progress updates (replace with actual progress tracking later)
        const progressInterval = setInterval(() => {
          setSyncState(prev => {
            if (prev.syncProgress >= 100) {
              clearInterval(progressInterval);
              return {
                ...prev,
                isSyncing: false,
                syncStatus: 'completed',
                syncProgress: 100,
                currentOperation: 'Sync completed!'
              };
            }
            return {
              ...prev,
              syncProgress: Math.min(prev.syncProgress + 10, 95)
            };
          });
        }, 2000);

      } else {
        throw new Error(result.error || 'Failed to start sync');
      }

    } catch (error) {
      console.error('Sync error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      setSyncState(prev => ({
        ...prev,
        isSyncing: false,
        syncStatus: 'failed',
        error: errorMessage,
        currentOperation: ''
      }));

      // Show appropriate error message based on the error
      if (errorMessage.includes('unavailable') || errorMessage.includes('starting up')) {
        toast({
          title: "Service Starting",
          description: "The sync service is starting up. Please wait a moment and try again.",
          variant: "destructive",
        });
      } else if (errorMessage.includes('environment variables') || errorMessage.includes('Internal server error')) {
        toast({
          title: "Service Configuration Issue",
          description: "There's a configuration issue with the sync service. Please contact support.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Sync Failed",
          description: errorMessage,
          variant: "destructive",
        });
      }
    }
  }, [connection, toast, healthCheck]);

  const cancelSync = useCallback(async () => {
    if (!syncState.syncId) {
      toast({
        title: "No Active Sync",
        description: "There's no active sync to cancel.",
        variant: "destructive",
      });
      return;
    }

    try {
      const result = await RenderZoomService.cancelSync(syncState.syncId);
      
      if (result.success) {
        setSyncState(prev => ({
          ...prev,
          isSyncing: false,
          syncStatus: 'idle',
          syncProgress: 0,
          currentOperation: '',
          syncId: null
        }));

        toast({
          title: "Sync Cancelled",
          description: "The sync operation has been cancelled.",
        });
      } else {
        throw new Error(result.error || 'Failed to cancel sync');
      }
    } catch (error) {
      console.error('Cancel sync error:', error);
      toast({
        title: "Cancel Failed",
        description: error instanceof Error ? error.message : 'Failed to cancel sync',
        variant: "destructive",
      });
    }
  }, [syncState.syncId, toast]);

  const testApiConnection = useCallback(async () => {
    if (!connection?.id) {
      toast({
        title: "No Connection",
        description: "Please connect your Zoom account first.",
        variant: "destructive",
      });
      return;
    }

    try {
      const result = await RenderZoomService.testConnection(connection.id);
      
      if (result.success) {
        toast({
          title: "Connection Test Successful",
          description: "Your Zoom connection is working properly.",
        });
      } else {
        throw new Error(result.error || 'Connection test failed');
      }
    } catch (error) {
      console.error('Connection test error:', error);
      toast({
        title: "Connection Test Failed",
        description: error instanceof Error ? error.message : 'Failed to test connection',
        variant: "destructive",
      });
    }
  }, [connection, toast]);

  const forceHealthCheck = useCallback(async () => {
    await RenderZoomService.forceHealthCheck();
    refetchHealth();
  }, [refetchHealth]);

  return {
    ...syncState,
    startSync,
    cancelSync,
    testApiConnection,
    healthCheck,
    forceHealthCheck
  };
}
