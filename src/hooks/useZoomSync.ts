
import { useState, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { EdgeFunctionZoomService } from '@/services/zoom/EdgeFunctionZoomService';
import { ZoomConnection, SyncType } from '@/types/zoom';
import { useQuery, useQueryClient } from '@tanstack/react-query';

interface SyncState {
  isSyncing: boolean;
  syncProgress: number;
  syncStatus: 'idle' | 'pending' | 'running' | 'completed' | 'failed' | 'cancelled' | 'in_progress';
  currentOperation: string;
  syncId: string | null;
  error: string | null;
  requiresReconnection: boolean;
}

export function useZoomSync(connection: ZoomConnection | null) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [syncState, setSyncState] = useState<SyncState>({
    isSyncing: false,
    syncProgress: 0,
    syncStatus: 'idle',
    currentOperation: '',
    syncId: null,
    error: null,
    requiresReconnection: false
  });

  // Health check query with better error handling
  const { data: healthCheck, refetch: refetchHealth } = useQuery({
    queryKey: ['edge-function-health'],
    queryFn: async () => {
      const result = await EdgeFunctionZoomService.healthCheck();
      return result;
    },
    refetchInterval: 60000, // Check every minute
    retry: (failureCount, error) => {
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
      error: null,
      requiresReconnection: false
    }));

    try {
      console.log(`🔄 Starting ${syncType} sync for connection:`, connection.id);
      
      const result = await EdgeFunctionZoomService.startSync(connection.id, syncType);
      
      if (result.success && result.syncId) {
        setSyncState(prev => ({
          ...prev,
          syncStatus: 'running',
          syncId: result.syncId,
          currentOperation: 'Sync started successfully...'
        }));

        toast({
          title: "Sync Started",
          description: result.message || "Webinar sync has been initiated.",
        });

        // Start polling for progress immediately
        setTimeout(() => pollSyncProgress(result.syncId), 1000);

      } else {
        throw new Error(result.error || 'Failed to start sync');
      }

    } catch (error) {
      console.error('Sync error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      // Check if this is a token/reconnection error
      const requiresReconnection = errorMessage.includes('reconnect') || 
                                   errorMessage.includes('token') ||
                                   errorMessage.includes('expired') ||
                                   errorMessage.includes('invalid');
      
      setSyncState(prev => ({
        ...prev,
        isSyncing: false,
        syncStatus: 'failed',
        error: errorMessage,
        currentOperation: '',
        requiresReconnection
      }));

      // Show appropriate error message based on the error type
      if (requiresReconnection) {
        toast({
          title: "Connection Issue",
          description: "Your Zoom connection has expired. Please reconnect your account.",
          variant: "destructive",
        });
      } else if (errorMessage.includes('unavailable') || errorMessage.includes('starting up')) {
        toast({
          title: "Service Starting",
          description: "The sync service is starting up. Please wait a moment and try again.",
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

  const pollSyncProgress = useCallback(async (syncId: string) => {
    if (!syncId) return;

    try {
      const result = await EdgeFunctionZoomService.getSyncProgress(syncId);
      
      if (result.success) {
        setSyncState(prev => ({
          ...prev,
          syncProgress: result.progress || prev.syncProgress,
          currentOperation: result.currentOperation || prev.currentOperation
        }));

        if (result.status === 'completed') {
          setSyncState(prev => ({
            ...prev,
            isSyncing: false,
            syncStatus: 'completed',
            syncProgress: 100,
            currentOperation: 'Sync completed!'
          }));

          // Invalidate queries to refresh data
          queryClient.invalidateQueries({ queryKey: ['zoom-webinars'] });
          queryClient.invalidateQueries({ queryKey: ['zoom-sync-stats'] });

          toast({
            title: "Sync Completed",
            description: "Your Zoom data has been synchronized successfully.",
          });

        } else if (result.status === 'failed') {
          setSyncState(prev => ({
            ...prev,
            isSyncing: false,
            syncStatus: 'failed',
            error: result.error || 'Sync failed',
            currentOperation: ''
          }));

          toast({
            title: "Sync Failed",
            description: result.error || "An error occurred during synchronization.",
            variant: "destructive",
          });

        } else if (result.status === 'running' || result.status === 'pending') {
          // Continue polling
          setTimeout(() => pollSyncProgress(syncId), 2000);
        }
      }
    } catch (error) {
      console.error('Error polling sync progress:', error);
      // Continue polling despite errors (service might be temporarily unavailable)
      setTimeout(() => pollSyncProgress(syncId), 5000);
    }
  }, [queryClient, toast]);

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
      const result = await EdgeFunctionZoomService.cancelSync(syncState.syncId);
      
      if (result.success) {
        setSyncState(prev => ({
          ...prev,
          isSyncing: false,
          syncStatus: 'idle',
          syncProgress: 0,
          currentOperation: '',
          syncId: null,
          error: null,
          requiresReconnection: false
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
      const result = await EdgeFunctionZoomService.testConnection(connection.id);
      
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
      const errorMessage = error instanceof Error ? error.message : 'Failed to test connection';
      
      toast({
        title: "Connection Test Failed",
        description: errorMessage,
        variant: "destructive",
      });
    }
  }, [connection, toast]);

  const forceHealthCheck = useCallback(async () => {
    await EdgeFunctionZoomService.forceHealthCheck();
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
