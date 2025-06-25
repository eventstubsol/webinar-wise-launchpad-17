
import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { RenderZoomService } from '@/services/zoom/RenderZoomService';
import { ZoomConnection, SyncType } from '@/types/zoom';

interface SyncProgress {
  progress: number;
  status: 'idle' | 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  currentOperation?: string;
  syncId?: string;
  totalItems?: number;
  processedItems?: number;
  errorMessage?: string;
}

export function useZoomSync(connection: ZoomConnection | null) {
  const { toast } = useToast();
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState(0);
  const [syncStatus, setSyncStatus] = useState<SyncProgress['status']>('idle');
  const [currentOperation, setCurrentOperation] = useState<string>('');
  const [activeSyncId, setActiveSyncId] = useState<string | null>(null);
  const [healthCheck, setHealthCheck] = useState<{ success: boolean; error?: string } | null>(null);

  // Health check on mount and periodically
  useEffect(() => {
    const checkHealth = async () => {
      try {
        const response = await RenderZoomService.healthCheck();
        setHealthCheck(response);
      } catch (error) {
        setHealthCheck({ success: false, error: 'Service unavailable' });
      }
    };

    checkHealth();
    const interval = setInterval(checkHealth, 60000); // Check every minute
    return () => clearInterval(interval);
  }, []);

  // Progress polling effect
  useEffect(() => {
    let pollInterval: NodeJS.Timeout | null = null;

    if (activeSyncId && (syncStatus === 'pending' || syncStatus === 'running')) {
      pollInterval = setInterval(async () => {
        try {
          const response = await RenderZoomService.getSyncProgress(activeSyncId);
          
          if (response.success) {
            const progress = Math.min(100, Math.max(0, response.progress || 0));
            setSyncProgress(progress);
            setSyncStatus(response.status || 'running');
            setCurrentOperation(response.currentOperation || 'Processing...');

            // Check if sync is complete
            if (response.status === 'completed') {
              setIsSyncing(false);
              setActiveSyncId(null);
              toast({
                title: 'Sync Completed',
                description: `Successfully synced ${response.processed_items || 0} items`,
              });
            } else if (response.status === 'failed') {
              setIsSyncing(false);
              setActiveSyncId(null);
              toast({
                title: 'Sync Failed',
                description: response.error_message || 'Unknown error occurred',
                variant: 'destructive',
              });
            } else if (response.status === 'cancelled') {
              setIsSyncing(false);
              setActiveSyncId(null);
              toast({
                title: 'Sync Cancelled',
                description: 'The sync operation was cancelled',
              });
            }
          } else {
            console.error('Failed to get sync progress:', response.error);
          }
        } catch (error) {
          console.error('Error polling sync progress:', error);
        }
      }, 2000); // Poll every 2 seconds
    }

    return () => {
      if (pollInterval) {
        clearInterval(pollInterval);
      }
    };
  }, [activeSyncId, syncStatus, toast]);

  const startSync = useCallback(async (syncType: SyncType = SyncType.INCREMENTAL) => {
    if (!connection?.id) {
      toast({
        title: 'No Connection',
        description: 'Please connect your Zoom account first',
        variant: 'destructive',
      });
      return;
    }

    if (isSyncing) {
      toast({
        title: 'Sync In Progress',
        description: 'A sync operation is already running',
      });
      return;
    }

    try {
      setIsSyncing(true);
      setSyncProgress(0);
      setSyncStatus('pending');
      setCurrentOperation('Starting sync...');

      const response = await RenderZoomService.startSync(connection.id, syncType);
      
      if (response.success && response.syncId) {
        setActiveSyncId(response.syncId);
        toast({
          title: 'Sync Started',
          description: 'Your webinar data sync has been started',
        });
      } else {
        throw new Error(response.error || 'Failed to start sync');
      }
    } catch (error) {
      setIsSyncing(false);
      setSyncStatus('failed');
      setCurrentOperation('');
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      toast({
        title: 'Sync Failed to Start',
        description: errorMessage,
        variant: 'destructive',
      });
    }
  }, [connection?.id, isSyncing, toast]);

  const testApiConnection = useCallback(async () => {
    if (!connection?.id) {
      toast({
        title: 'No Connection',
        description: 'Please connect your Zoom account first',
        variant: 'destructive',
      });
      return;
    }

    try {
      const response = await RenderZoomService.testConnection(connection.id);
      
      if (response.success) {
        toast({
          title: 'Connection Test Successful',
          description: 'Your Zoom API connection is working properly',
        });
      } else {
        toast({
          title: 'Connection Test Failed',
          description: response.error || 'Unknown error',
          variant: 'destructive',
        });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      toast({
        title: 'Connection Test Failed',
        description: errorMessage,
        variant: 'destructive',
      });
    }
  }, [connection?.id, toast]);

  const cancelSync = useCallback(async () => {
    if (!activeSyncId) return;

    try {
      const response = await RenderZoomService.cancelSync(activeSyncId);
      
      if (response.success) {
        setIsSyncing(false);
        setSyncStatus('cancelled');
        setActiveSyncId(null);
        setCurrentOperation('');
        
        toast({
          title: 'Sync Cancelled',
          description: 'The sync operation has been cancelled',
        });
      }
    } catch (error) {
      console.error('Failed to cancel sync:', error);
    }
  }, [activeSyncId, toast]);

  return {
    isSyncing,
    syncProgress,
    syncStatus,
    currentOperation,
    activeSyncId,
    healthCheck,
    startSync,
    testApiConnection,
    cancelSync,
  };
}
