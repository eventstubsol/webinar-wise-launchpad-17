import { useState, useCallback, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { RenderZoomService } from '@/services/zoom/RenderZoomService';
import { SyncRecoveryService } from '@/services/zoom/sync/SyncRecoveryService';
import { SyncManagementService } from '@/services/zoom/sync/SyncManagementService';
import { ZoomConnection, SyncType } from '@/types/zoom';
import { useQuery, useQueryClient } from '@tanstack/react-query';

interface SyncState {
  isSyncing: boolean;
  syncProgress: number;
  syncStatus: 'idle' | 'pending' | 'running' | 'completed' | 'failed';
  currentOperation: string;
  syncId: string | null;
  error: string | null;
  requiresReconnection: boolean;
  syncMode: 'render' | 'direct' | null;
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
    requiresReconnection: false,
    syncMode: null
  });

  // Enhanced health check with better error handling
  const { data: healthCheck, refetch: refetchHealth } = useQuery({
    queryKey: ['render-health'],
    queryFn: async () => {
      try {
        const isHealthy = await SyncManagementService.isRenderServiceHealthy();
        return { success: isHealthy, error: isHealthy ? null : 'Service unavailable' };
      } catch (error) {
        console.error('Health check failed:', error);
        return { success: false, error: 'Service unavailable' };
      }
    },
    refetchInterval: 30000, // Check every 30 seconds
    retry: 1,
    retryDelay: 5000,
  });

  // More aggressive auto-recovery of stuck syncs
  useEffect(() => {
    if (!connection?.id) return;

    const checkForStuckSyncs = async () => {
      try {
        const recoveredCount = await SyncRecoveryService.detectAndRecoverStuckSyncs(connection.id);
        if (recoveredCount > 0) {
          console.log(`Auto-recovered ${recoveredCount} stuck sync(s)`);
          queryClient.invalidateQueries({ queryKey: ['zoom-sync-stats'] });
          
          toast({
            title: "Auto-Recovery",
            description: `Automatically cancelled ${recoveredCount} stuck sync(s)`,
          });
        }
      } catch (error) {
        console.error('Error in automatic stuck sync recovery:', error);
      }
    };

    // Check immediately and then every minute
    checkForStuckSyncs();
    const interval = setInterval(checkForStuckSyncs, 60000);

    return () => clearInterval(interval);
  }, [connection?.id, queryClient, toast]);

  const startSync = useCallback(async (syncType: SyncType = SyncType.MANUAL) => {
    if (!connection?.id) {
      toast({
        title: "No Connection",
        description: "Please connect your Zoom account first.",
        variant: "destructive",
      });
      return;
    }

    // Check for existing active syncs
    try {
      const currentSync = await SyncRecoveryService.getCurrentSyncStatus(connection.id);
      if (currentSync && !currentSync.isStuck) {
        toast({
          title: "Sync Already Running",
          description: "A sync is already in progress. Please wait or cancel it first.",
          variant: "destructive",
        });
        return;
      }
    } catch (error) {
      console.error('Error checking current sync status:', error);
    }

    setSyncState(prev => ({
      ...prev,
      isSyncing: true,
      syncStatus: 'pending',
      currentOperation: 'Preparing sync...',
      error: null,
      requiresReconnection: false,
      syncProgress: 5
    }));

    try {
      console.log(`🔄 Starting enhanced ${syncType} sync for connection:`, connection.id);
      
      const result = await SyncManagementService.startReliableSync(connection.id, syncType);
      
      if (result.success && result.syncId) {
        setSyncState(prev => ({
          ...prev,
          syncStatus: 'running',
          syncId: result.syncId,
          currentOperation: 'Sync started successfully...',
          syncProgress: 10,
          syncMode: result.mode
        }));

        toast({
          title: "Sync Started",
          description: `${result.message} (${result.mode} mode)`,
        });

        // Start polling for progress
        setTimeout(() => pollSyncProgress(result.syncId!), 2000);

      } else {
        throw new Error(result.message || 'Failed to start sync');
      }

    } catch (error) {
      console.error('Enhanced sync error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
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
        requiresReconnection,
        syncProgress: 0,
        syncMode: null
      }));

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
  }, [connection, toast]);

  const pollSyncProgress = useCallback(async (syncId: string) => {
    if (!syncId) return;

    try {
      const result = await RenderZoomService.getSyncProgress(syncId);
      
      if (result.success) {
        setSyncState(prev => ({
          ...prev,
          syncProgress: Math.max(prev.syncProgress, result.progress || 0),
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
            currentOperation: '',
            syncProgress: 0
          }));

          toast({
            title: "Sync Failed",
            description: result.error || "An error occurred during synchronization.",
            variant: "destructive",
          });

        } else if (result.status === 'running') {
          // Continue polling, but with shorter intervals for better responsiveness
          setTimeout(() => pollSyncProgress(syncId), 2000);
        }
      }
    } catch (error) {
      console.error('Error polling sync progress:', error);
      // Continue polling despite errors, but less frequently
      setTimeout(() => pollSyncProgress(syncId), 5000);
    }
  }, [queryClient, toast]);

  const cancelSync = useCallback(async () => {
    if (!syncState.syncId) {
      // Try to force cancel current sync if no syncId available
      if (connection?.id) {
        try {
          const result = await SyncRecoveryService.forceCancelCurrentSync(connection.id);
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
            return;
          }
        } catch (error) {
          console.error('Force cancel error:', error);
        }
      }
      
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
  }, [syncState.syncId, connection?.id, toast]);

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
      const errorMessage = error instanceof Error ? error.message : 'Failed to test connection';
      
      toast({
        title: "Connection Test Failed",
        description: errorMessage,
        variant: "destructive",
      });
    }
  }, [connection, toast]);

  const forceHealthCheck = useCallback(async () => {
    await RenderZoomService.forceHealthCheck();
    refetchHealth();
  }, [refetchHealth]);

  const forceCleanupStuckSyncs = useCallback(async () => {
    if (!connection?.id) return;

    try {
      const result = await SyncRecoveryService.forceCleanupStuckSyncs(connection.id);
      
      if (result.success) {
        setSyncState(prev => ({
          ...prev,
          isSyncing: false,
          syncStatus: 'idle',
          syncProgress: 0,
          currentOperation: '',
          syncId: null,
          error: null,
          requiresReconnection: false,
          syncMode: null
        }));

        queryClient.invalidateQueries({ queryKey: ['zoom-sync-stats'] });
        
        toast({
          title: "Cleanup Successful",
          description: result.message,
        });
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      console.error('Force cleanup error:', error);
      toast({
        title: "Cleanup Failed",
        description: error instanceof Error ? error.message : 'Failed to cleanup stuck syncs',
        variant: "destructive",
      });
    }
  }, [connection?.id, queryClient, toast]);

  return {
    ...syncState,
    startSync,
    cancelSync,
    testApiConnection,
    healthCheck,
    forceHealthCheck,
    forceCleanupStuckSyncs
  };
}
