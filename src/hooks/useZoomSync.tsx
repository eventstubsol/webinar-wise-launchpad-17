
import { useState, useRef, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { ZoomConnection } from '@/types/zoom';
import { RenderZoomService } from '@/services/zoom/RenderZoomService';

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
          
          toast({
            title: "Sync completed successfully",
            description: "Your Zoom data has been synchronized.",
          });
        } else if (result.status === 'failed') {
          setSyncStatus('failed');
          setIsSyncing(false);
          clearProgressInterval();
          
          toast({
            title: "Sync failed",
            description: result.error || "An error occurred during synchronization.",
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
      
      toast({
        title: "Sync monitoring failed",
        description: "Unable to monitor sync progress.",
        variant: "destructive",
      });
    }
  }, [clearProgressInterval, queryClient, toast]);

  const startSync = useCallback(async (syncType: 'initial' | 'incremental' = 'incremental') => {
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
      const result = await RenderZoomService.startSync(connection.id, syncType);
      
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
      
      toast({
        title: "Sync failed to start",
        description: error instanceof Error ? error.message : "Unable to start synchronization.",
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
      toast({
        title: "Connection test failed",
        description: error instanceof Error ? error.message : "Unable to test Zoom API connection.",
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
    startSync,
    cancelSync,
    testApiConnection,
  };
};
