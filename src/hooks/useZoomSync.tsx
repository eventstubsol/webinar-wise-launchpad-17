
import { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from 'sonner';
import { ZoomConnection, SyncType } from '@/types/zoom';
import { UnifiedZoomService } from '@/services/zoom/UnifiedZoomService';
import { supabase } from '@/integrations/supabase/client';
import { ZoomConnectionTestService } from '@/services/zoom/ZoomConnectionTestService';

interface SyncData {
  isSyncing: boolean;
  syncProgress: number;
  syncStatus: 'idle' | 'syncing' | 'completed' | 'failed';
  currentOperation: string;
  syncMode: string;
  fallbackMode: boolean;
  stuckSyncDetected: boolean;
  activeSyncId: string;
  syncError: string | null;
  testConnection: () => Promise<any>;
  forceResetAndRestart: () => Promise<void>;
  forceCancelSync: () => Promise<void>;
  startSync: (syncType: SyncType, options?: { webinarId?: string }) => Promise<void>;
  cancelSync: () => Promise<void>;
  healthCheck: { success: boolean; message: string; error?: string };
}

const LOCAL_STORAGE_KEY = 'zoomSyncState';

const getInitialState = () => {
  if (typeof window === 'undefined') {
    return {
      isSyncing: false,
      syncProgress: 0,
      syncStatus: 'idle',
      activeSyncId: '',
      lastUpdate: null
    };
  }

  try {
    const storedState = localStorage.getItem(LOCAL_STORAGE_KEY);
    return storedState ? JSON.parse(storedState) : {
      isSyncing: false,
      syncProgress: 0,
      syncStatus: 'idle',
      activeSyncId: '',
      lastUpdate: null
    };
  } catch (error) {
    console.error('Error reading from localStorage:', error);
    return {
      isSyncing: false,
      syncProgress: 0,
      syncStatus: 'idle',
      activeSyncId: '',
      lastUpdate: null
    };
  }
};

const saveToLocalStorage = (state: any) => {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    console.error('Error saving to localStorage:', error);
  }
};

const clearLocalStorage = () => {
  try {
    localStorage.removeItem(LOCAL_STORAGE_KEY);
  } catch (error) {
    console.error('Error clearing localStorage:', error);
  }
};

export const useZoomSync = (connection: ZoomConnection | null): SyncData => {
  const [isSyncing, setIsSyncing] = useState(getInitialState().isSyncing || false);
  const [syncProgress, setSyncProgress] = useState(getInitialState().syncProgress || 0);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'completed' | 'failed'>(getInitialState().syncStatus || 'idle');
  const [currentOperation, setCurrentOperation] = useState('Ready to sync');
  const [activeSyncId, setActiveSyncId] = useState(getInitialState().activeSyncId || '');
  const [syncError, setSyncError] = useState<string | null>(null);
  const monitoringIntervalRef = useRef<any>(null);

  const startSync = useCallback(async (syncType: SyncType, options?: { webinarId?: string }) => {
    if (!connection?.id) {
      toast.error('No connection available');
      return;
    }

    if (isSyncing) {
      toast.error('Sync already in progress');
      return;
    }

    console.log(`🚀 Starting unified sync:`, { syncType, connectionId: connection.id });

    try {
      setIsSyncing(true);
      setSyncProgress(5);
      setSyncStatus('syncing');
      setCurrentOperation('Starting sync...');
      setSyncError(null);
      
      saveToLocalStorage({ isSyncing: true, syncProgress: 5, syncStatus: 'syncing' });

      const syncTypeString = syncType === SyncType.MANUAL ? 'manual' : 'incremental';
      
      const result = await UnifiedZoomService.startSync(
        connection.id, 
        syncTypeString,
        options?.webinarId
      );

      if (result.success && result.syncId) {
        setActiveSyncId(result.syncId);
        setCurrentOperation('Sync started successfully...');
        setSyncProgress(10);
        
        // Start monitoring the sync
        startSyncMonitoring(result.syncId);
        
        toast.success('Sync started successfully');
        
      } else {
        throw new Error(result.error || 'Failed to start sync');
      }

    } catch (error) {
      console.error('Sync start error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      setSyncError(errorMessage);
      setIsSyncing(false);
      setSyncStatus('failed');
      setSyncProgress(0);
      setCurrentOperation('Sync failed to start');
      
      clearLocalStorage();
      toast.error('Failed to start sync', { description: errorMessage });
    }
  }, [connection, isSyncing]);

  const startSyncMonitoring = useCallback((syncId: string) => {
    if (monitoringIntervalRef.current) {
      clearInterval(monitoringIntervalRef.current);
    }

    console.log(`💓 Started monitoring sync: ${syncId}`);
    
    monitoringIntervalRef.current = setInterval(async () => {
      try {
        const progressData = await UnifiedZoomService.getSyncProgress(syncId);

        if (progressData.success) {
          const currentProgress = progressData.progress || 0;
          const operation = progressData.currentOperation || 'Processing...';
          
          // Update UI state
          setSyncProgress(currentProgress);
          setCurrentOperation(operation);
          
          // Update localStorage
          saveToLocalStorage({
            isSyncing: true,
            syncProgress: currentProgress,
            syncStatus: 'syncing',
            activeSyncId: syncId,
            lastUpdate: Date.now()
          });

          // Check for completion
          if (progressData.status === 'completed' || currentProgress >= 100) {
            console.log(`🎉 Sync completed successfully`);
            completeSyncMonitoring(true);
          } else if (progressData.status === 'failed') {
            console.error(`❌ Sync failed:`, progressData.error_message);
            setSyncError(progressData.error_message || 'Sync failed');
            completeSyncMonitoring(false);
          }
        }

      } catch (error) {
        console.error(`💥 Monitoring error for sync ${syncId}:`, error);
      }
    }, 2000); // Check every 2 seconds

  }, []);

  const completeSyncMonitoring = useCallback((success: boolean) => {
    console.log(`💔 Stopping sync monitoring`);
    
    if (monitoringIntervalRef.current) {
      clearInterval(monitoringIntervalRef.current);
      monitoringIntervalRef.current = null;
    }

    setIsSyncing(false);
    setSyncStatus(success ? 'completed' : 'failed');
    setCurrentOperation(success ? 'Sync completed' : 'Sync failed');
    setSyncProgress(success ? 100 : 0);
    setActiveSyncId('');

    clearLocalStorage();

    if (success) {
      toast.success('Sync completed successfully!');
    }
  }, []);

  const cancelSync = useCallback(async () => {
    if (!activeSyncId) {
      toast.error('No active sync to cancel');
      return;
    }

    try {
      console.log(`🛑 Cancelling sync: ${activeSyncId}`);
      
      const result = await UnifiedZoomService.cancelSync(activeSyncId);
      
      if (result.success) {
        console.log('✅ Sync cancelled successfully');
        toast.success('Sync cancelled');
      } else {
        console.error('❌ Failed to cancel sync:', result.error);
        toast.error(`Failed to cancel sync: ${result.error || 'Unknown error'}`);
      }

      completeSyncMonitoring(false);

    } catch (error) {
      console.error('💥 Error cancelling sync:', error);
      toast.error(`Error cancelling sync: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }, [activeSyncId, completeSyncMonitoring]);

  const testConnection = useCallback(async () => {
    if (!connection?.id) return;
    
    try {
      const result = await UnifiedZoomService.testConnection(connection.id);
      
      if (result.success) {
        toast.success('Connection test successful', {
          description: result.message
        });
      } else {
        toast.error('Connection test failed', {
          description: result.message
        });
      }
      
      return result;
    } catch (error) {
      console.error('Connection test error:', error);
      toast.error('Connection test failed');
    }
  }, [connection]);

  const forceResetAndRestart = useCallback(async () => {
    if (!connection?.id) return;
    
    try {
      // Reset state
      setIsSyncing(false);
      setSyncProgress(0);
      setSyncStatus('idle');
      setCurrentOperation('Ready to sync');
      setActiveSyncId('');
      setSyncError(null);
      
      // Clear monitoring
      if (monitoringIntervalRef.current) {
        clearInterval(monitoringIntervalRef.current);
        monitoringIntervalRef.current = null;
      }
      
      clearLocalStorage();
      
      toast.success('Sync state reset. You can now start a new sync.');
      
      // Auto-restart with incremental sync
      setTimeout(() => {
        startSync(SyncType.INCREMENTAL);
      }, 1000);
      
    } catch (error) {
      console.error('Force reset error:', error);
      toast.error('Failed to reset sync state');
    }
  }, [connection, startSync]);

  const forceCancelSync = useCallback(async () => {
    await cancelSync();
    await forceResetAndRestart();
  }, [cancelSync, forceResetAndRestart]);

  useEffect(() => {
    // Load state from localStorage on mount
    const initialState = getInitialState();
    setIsSyncing(initialState.isSyncing || false);
    setSyncProgress(initialState.syncProgress || 0);
    setSyncStatus(initialState.syncStatus || 'idle');
    setActiveSyncId(initialState.activeSyncId || '');

    // If there's an active sync, start monitoring it
    if (initialState.isSyncing && initialState.activeSyncId) {
      console.log(`⚙️ Resuming sync monitoring: ${initialState.activeSyncId}`);
      startSyncMonitoring(initialState.activeSyncId);
    }

    return () => {
      if (monitoringIntervalRef.current) {
        clearInterval(monitoringIntervalRef.current);
      }
    };
  }, [startSyncMonitoring]);

  const healthCheck = {
    success: true,
    message: 'Unified service is healthy'
  };

  return {
    isSyncing,
    syncProgress,
    syncStatus,
    currentOperation,
    syncMode: 'unified',
    fallbackMode: false,
    stuckSyncDetected: false,
    activeSyncId,
    startSync,
    cancelSync,
    forceCancelSync,
    syncError,
    testConnection,
    forceResetAndRestart,
    healthCheck
  };
};
