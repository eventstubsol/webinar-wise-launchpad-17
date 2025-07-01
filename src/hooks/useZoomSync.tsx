
import React, { useState, useRef, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { ZoomConnection, SyncType } from '@/types/zoom';
import { RenderZoomService } from '@/services/zoom/RenderZoomService';
import { getUserFriendlyError, formatErrorForDisplay } from '@/lib/errorHandler';

export const useZoomSync = (connection?: ZoomConnection | null) => {
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState(0);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'completed' | 'failed' | 'no_data'>('idle');
  const [currentOperation, setCurrentOperation] = useState('');
  const [syncId, setSyncId] = useState<string | null>(null);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const clearProgressInterval = useCallback(() => {
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
  }, []);

  const pollSyncProgress = useCallback(async (syncId: string) => {
    try {
      const result = await RenderZoomService.getSyncProgress(syncId);
      
      if (result.success) {
        setSyncProgress(result.progress || 0);
        setCurrentOperation(result.currentOperation || '');
        
        if (result.status === 'completed') {
          setSyncStatus('completed');
          setIsSyncing(false);
          clearProgressInterval();
          
          // Invalidate queries to refresh data
          queryClient.invalidateQueries({ queryKey: ['zoom-webinars'] });
          queryClient.invalidateQueries({ queryKey: ['zoom-connection'] });
          queryClient.invalidateQueries({ queryKey: ['zoom-sync-stats'] });
          
          toast({
            title: "Sync completed successfully",
            description: "Your Zoom data has been synchronized.",
          });
        } else if (result.status === 'failed') {
          setSyncStatus('failed');
          setIsSyncing(false);
          clearProgressInterval();
          
          const userError = getUserFriendlyError(result.error || "An error occurred during synchronization.");
          toast({
            title: "Sync failed",
            description: formatErrorForDisplay(userError),
            variant: "destructive",
          });
        } else if (result.status === 'no_data') {
          setSyncStatus('no_data');
          setIsSyncing(false);
          clearProgressInterval();
          
          toast({
            title: "No data to sync",
            description: "No webinars found to synchronize.",
          });
        }
      } else {
        throw new Error(result.error || 'Failed to get sync progress');
      }
    } catch (error) {
      console.error('Error polling sync progress:', error);
      setSyncStatus('failed');
      setIsSyncing(false);
      clearProgressInterval();
      
      const userError = getUserFriendlyError(error);
      toast({
        title: "Sync monitoring failed",
        description: formatErrorForDisplay(userError),
        variant: "destructive",
      });
    }
  }, [clearProgressInterval, queryClient, toast]);

  const startSync = useCallback(async (syncType: SyncType = SyncType.INCREMENTAL) => {
    if (!connection?.id) {
      toast({
        title: "No connection",
        description: "Please connect your Zoom account first.",
        variant: "destructive",
      });
      return;
    }

    if (isSyncing) {
      toast({
        title: "Sync in progress",
        description: "A sync operation is already running.",
        variant: "destructive",
      });
      return;
    }

    setIsSyncing(true);
    setSyncProgress(0);
    setSyncStatus('syncing');
    setCurrentOperation('Starting sync...');

    try {
      const syncTypeMap = {
        [SyncType.INITIAL]: 'initial' as const,
        [SyncType.INCREMENTAL]: 'incremental' as const,
        [SyncType.MANUAL]: 'incremental' as const,
      };

      const result = await RenderZoomService.startSync(connection.id, syncTypeMap[syncType]);
      
      if (result.success && result.syncId) {
        setSyncId(result.syncId);
        
        // Start polling for progress updates
        progressIntervalRef.current = setInterval(() => {
          pollSyncProgress(result.syncId!);
        }, 2000); // Poll every 2 seconds
        
        toast({
          title: "Sync started",
          description: result.message || "Zoom data synchronization has begun.",
        });
      } else {
        throw new Error(result.error || 'Failed to start sync');
      }
    } catch (error) {
      console.error('Error starting sync:', error);
      setIsSyncing(false);
      setSyncStatus('failed');
      setCurrentOperation('');
      
      const userError = getUserFriendlyError(error);
      toast({
        title: "Sync failed to start",
        description: formatErrorForDisplay(userError),
        variant: "destructive",
      });
    }
  }, [connection?.id, isSyncing, pollSyncProgress, toast]);

  const cancelSync = useCallback(async () => {
    if (!syncId) return;

    try {
      const result = await RenderZoomService.cancelSync(syncId);
      
      if (result.success) {
        setIsSyncing(false);
        setSyncStatus('idle');
        setSyncProgress(0);
        setCurrentOperation('');
        setSyncId(null);
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
  }, [syncId, clearProgressInterval, toast]);

  const testApiConnection = useCallback(async () => {
    try {
      const result = await RenderZoomService.testConnection();
      
      if (result.success) {
        toast({
          title: "Connection test successful",
          description: result.message || "Zoom API connection is working properly.",
        });
      } else {
        throw new Error(result.message || 'Connection test failed');
      }
    } catch (error) {
      console.error('Error testing connection:', error);
      const userError = getUserFriendlyError(error);
      toast({
        title: "Connection test failed",
        description: formatErrorForDisplay(userError),
        variant: "destructive",
      });
    }
  }, [toast]);

  // Cleanup on unmount
  React.useEffect(() => {
    return () => {
      clearProgressInterval();
    };
  }, [clearProgressInterval]);

  return {
    isSyncing,
    syncProgress,
    syncStatus,
    currentOperation,
    activeSyncId: syncId,
    startSync,
    cancelSync,
    testApiConnection,
    healthCheck: { success: true }, // Add default health check
  };
};
