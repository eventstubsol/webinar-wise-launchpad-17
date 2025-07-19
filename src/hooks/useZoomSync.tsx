import { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from 'sonner';
import { ZoomConnection, SyncType } from '@/types/zoom';
import { RenderZoomService } from '@/services/zoom/RenderZoomService';
import { SyncLoggingService } from '@/services/zoom/sync/SyncLoggingService';
import { SyncManagementService } from '@/services/zoom/sync/SyncManagementService';
import { SyncRecoveryService } from '@/services/zoom/sync/SyncRecoveryService';
import { supabase } from '@/integrations/supabase/client';
import { ZoomConnectionTestService } from '@/services/zoom/ZoomConnectionTestService';
import { ZoomSyncMigrationService } from '@/services/zoom/ZoomSyncMigrationService';

interface SyncData {
  isSyncing: boolean;
  syncProgress: number;
  syncStatus: 'idle' | 'syncing' | 'completed' | 'failed';
  currentOperation: string;
  activeSyncId: string;
  syncMode: 'render' | 'direct' | null;
  syncError: string | null;
  fallbackMode: 'render' | 'direct';
  testConnection: () => Promise<any>;
  forceResetAndRestart: () => Promise<void>;
  forceCancelSync: () => Promise<void>;
  stuckSyncDetected: boolean;
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

const getCurrentSyncStatus = async (syncId: string) => {
  try {
    const { data, error } = await supabase
      .from('zoom_sync_logs')
      .select('*')
      .eq('id', syncId)
      .single();

    if (error) {
      console.error('Error fetching sync status from database:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error getting current sync status:', error);
    return null;
  }
};

export const useZoomSync = (connection: ZoomConnection | null): SyncData => {
  const [isSyncing, setIsSyncing] = useState(getInitialState().isSyncing || false);
  const [syncProgress, setSyncProgress] = useState(getInitialState().syncProgress || 0);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'completed' | 'failed'>(getInitialState().syncStatus || 'idle');
  const [currentOperation, setCurrentOperation] = useState('Ready to sync');
  const [syncMode, setSyncMode] = useState<'render' | 'direct' | null>(null);
  const [activeSyncId, setActiveSyncId] = useState(getInitialState().activeSyncId || '');
  const [stuckSyncDetected, setStuckSyncDetected] = useState(false);
  const monitoringIntervalRef = useRef<any>(null);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [fallbackMode, setFallbackMode] = useState<'render' | 'direct'>('render');
  const [lastConnectionTest, setLastConnectionTest] = useState<Date | null>(null);

  const startSync = useCallback(async (syncType: SyncType, options?: { webinarId?: string }) => {
    if (!connection?.id) {
      toast.error('No connection available');
      return;
    }

    if (isSyncing) {
      toast.error('Sync already in progress');
      return;
    }

    console.log(`🚀 [useZoomSync] Starting enhanced sync:`, { syncType, connectionId: connection.id, fallbackMode });
    SyncLoggingService.logUserAction('Start Sync', undefined, { syncType });

    try {
      setIsSyncing(true);
      setSyncProgress(5);
      setSyncStatus('syncing');
      setCurrentOperation('Starting enhanced sync...');
      setSyncError(null);
      
      // Save initial state
      saveToLocalStorage({ isSyncing: true, syncProgress: 5, syncStatus: 'syncing' });

      // Test connection first if not tested recently
      const shouldTestConnection = !lastConnectionTest || 
        (Date.now() - lastConnectionTest.getTime()) > 300000; // 5 minutes

      if (shouldTestConnection) {
        setCurrentOperation('Testing Zoom connection...');
        const testResult = await ZoomConnectionTestService.testConnection(connection.id);
        setLastConnectionTest(new Date());
        
        if (!testResult.success) {
          throw new Error(`Connection test failed: ${testResult.message}`);
        }
        console.log('✅ [useZoomSync] Connection test passed');
      }

      let syncResult;
      
      if (fallbackMode === 'render') {
        // Try Render service first
        setCurrentOperation('Starting Render service sync...');
        setSyncProgress(10);
        
        try {
          syncResult = await SyncManagementService.startReliableSync(connection.id, syncType);
          
          if (!syncResult.success) {
            console.log('⚠️ [useZoomSync] Render sync failed, switching to direct mode...');
            setFallbackMode('direct');
            throw new Error('Render sync failed, trying direct mode');
          }
          
          setSyncMode('render');
          
        } catch (renderError) {
          console.error('❌ [useZoomSync] Render sync error:', renderError);
          
          // Fallback to direct sync
          console.log('🔄 [useZoomSync] Falling back to direct sync...');
          setFallbackMode('direct');
          setCurrentOperation('Falling back to direct sync...');
          
          syncResult = await ZoomSyncMigrationService.enhancedSync(connection.id, {
            syncType: syncType === SyncType.MANUAL ? 'manual' : 'incremental',
            webinarId: options?.webinarId,
            priority: 'high',
            debug: true
          });
          
          setSyncMode('direct');
        }
      } else {
        // Use direct sync mode
        setCurrentOperation('Starting direct sync...');
        setSyncProgress(10);
        
        syncResult = await ZoomSyncMigrationService.enhancedSync(connection.id, {
          syncType: syncType === SyncType.MANUAL ? 'manual' : 'incremental',
          webinarId: options?.webinarId,
          priority: 'high',
          debug: true
        });
        
        setSyncMode('direct');
      }

      if (syncResult.success && syncResult.syncId) {
        setActiveSyncId(syncResult.syncId);
        setCurrentOperation('Sync started successfully...');
        setSyncProgress(15);
        
        // Start monitoring the sync
        startSyncMonitoring(syncResult.syncId);
        
        toast.success(`Sync started successfully (${syncMode} mode)`);
        SyncLoggingService.logSyncStart(syncResult.syncId, connection.id, syncType);
        
      } else {
        throw new Error(syncResult.message || 'Failed to start sync');
      }

    } catch (error) {
      console.error('❌ [useZoomSync] Sync start error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      setSyncError(errorMessage);
      setIsSyncing(false);
      setSyncStatus('failed');
      setSyncProgress(0);
      setCurrentOperation('Sync failed to start');
      
      // Clear localStorage
      clearLocalStorage();
      
      // Show user-friendly error
      if (errorMessage.includes('Connection test failed')) {
        toast.error('Zoom connection issue detected', {
          description: 'Please check your Zoom credentials and try again.'
        });
      } else if (errorMessage.includes('timeout')) {
        toast.error('Sync timeout', {
          description: 'The sync service is taking too long to respond. Please try again.'
        });
      } else {
        toast.error('Failed to start sync', {
          description: errorMessage
        });
      }

      SyncLoggingService.logSyncCommunicationFailure('unknown', error, 1);
    }
  }, [connection, isSyncing, fallbackMode, lastConnectionTest, syncMode]);

  const startSyncMonitoring = useCallback((syncId: string) => {
    if (monitoringIntervalRef.current) {
      clearInterval(monitoringIntervalRef.current);
    }

    let lastProgressUpdate = Date.now();
    let lastProgress = 0;
    let consecutiveStuckChecks = 0;
    
    console.log(`💓 Started heartbeat monitoring for sync: ${syncId}`);
    
    monitoringIntervalRef.current = setInterval(async () => {
      try {
        SyncLoggingService.logRenderServiceCall('/sync-progress', syncId);
        
        // Check both Render and database sources
        const [renderProgress, dbProgress] = await Promise.allSettled([
          RenderZoomService.getSyncProgress(syncId),
          getCurrentSyncStatus(syncId)
        ]);

        // Use the most recent/accurate progress
        let progressData;
        if (renderProgress.status === 'fulfilled' && renderProgress.value.success) {
          progressData = renderProgress.value;
          SyncLoggingService.logRenderServiceResponse('/sync-progress', progressData, syncId);
        } else if (dbProgress.status === 'fulfilled' && dbProgress.value) {
          progressData = {
            success: true,
            status: dbProgress.value.sync_status,
            progress: dbProgress.value.stage_progress_percentage || 0,
            currentOperation: dbProgress.value.sync_stage || 'Processing...',
            processed_items: dbProgress.value.processed_items,
            total_items: dbProgress.value.total_items
          };
          SyncLoggingService.logDatabaseUpdate('zoom_sync_logs', 'getCurrentSyncStatus', progressData, syncId);
        } else {
          throw new Error('Unable to get sync progress from any source');
        }

        console.log(`📊 Sync Progress Check ${syncId}:`, {
          render: renderProgress.status === 'fulfilled' ? renderProgress.value : 'failed',
          database: dbProgress.status === 'fulfilled' ? dbProgress.value : 'failed'
        });

        if (progressData) {
          const currentProgress = progressData.progress || 0;
          const operation = progressData.currentOperation || 'Processing...';
          
          SyncLoggingService.logProgressUpdate(syncId, currentProgress, operation, 
            renderProgress.status === 'fulfilled' ? 'render' : 'database');

          // Check for stuck sync
          if (currentProgress === lastProgress && currentProgress > 0 && currentProgress < 100) {
            consecutiveStuckChecks++;
            const minutesStuck = (consecutiveStuckChecks * 2) / 60; // 2 second intervals
            
            if (consecutiveStuckChecks >= 60) { // 2 minutes stuck
              console.warn(`⚠️ [useZoomSync] Sync appears stuck at ${currentProgress}% for ${minutesStuck.toFixed(1)} minutes`);
              SyncLoggingService.logSyncStuck(syncId, `No progress for ${minutesStuck.toFixed(1)} minutes`, minutesStuck);
              
              setStuckSyncDetected(true);
              
              if (consecutiveStuckChecks >= 180) { // 6 minutes - auto cancel
                console.error(`🛑 [useZoomSync] Auto-canceling stuck sync after 6 minutes`);
                await cancelSync();
                return;
              }
            }
          } else {
            consecutiveStuckChecks = 0;
            setStuckSyncDetected(false);
            lastProgressUpdate = Date.now();
          }

          lastProgress = currentProgress;
          
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
            console.log(`🎉 [useZoomSync] Sync completed successfully`);
            completeSyncMonitoring(true);
          } else if (progressData.status === 'failed') {
            console.error(`❌ [useZoomSync] Sync failed:`, progressData.error_message);
            setSyncError(progressData.error_message || 'Sync failed');
            completeSyncMonitoring(false);
          }
        }

      } catch (error) {
        console.error(`💥 [useZoomSync] Monitoring error for sync ${syncId}:`, error);
        SyncLoggingService.logSyncCommunicationFailure(syncId, error, 1);
        
        // Try to recover by checking database directly
        try {
          const dbStatus = await getCurrentSyncStatus(syncId);
          if (dbStatus && dbStatus.sync_status === 'failed') {
            setSyncError(dbStatus.error_message || 'Sync failed');
            completeSyncMonitoring(false);
          }
        } catch (recoveryError) {
          console.error(`💥 [useZoomSync] Recovery check failed:`, recoveryError);
        }
      }
    }, 2000); // Check every 2 seconds

  }, []);

  const completeSyncMonitoring = useCallback((success: boolean) => {
    console.log(`💔 Stopping heartbeat monitoring`);
    
    if (monitoringIntervalRef.current) {
      clearInterval(monitoringIntervalRef.current);
      monitoringIntervalRef.current = null;
    }

    setIsSyncing(false);
    setSyncStatus(success ? 'completed' : 'failed');
    setCurrentOperation(success ? 'Sync completed' : 'Sync failed');
    setSyncProgress(success ? 100 : 0);
    setActiveSyncId('');
    setStuckSyncDetected(false);

    // Clear localStorage
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
      console.log(`🛑 Attempting to cancel sync: ${activeSyncId}`);
      SyncLoggingService.logUserAction('Cancel Sync', activeSyncId);
      
      const result = await RenderZoomService.cancelSync(activeSyncId);
      
      if (result.success) {
        console.log('✅ Sync cancellation requested successfully');
        toast.success('Sync cancellation requested');
      } else {
        console.error('❌ Failed to cancel sync:', result.error);
        toast.error(`Failed to cancel sync: ${result.error || 'Unknown error'}`);
      }

      completeSyncMonitoring(false);

    } catch (error) {
      console.error('💥 Error cancelling sync:', error);
      toast.error(`Error cancelling sync: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsSyncing(false);
      setSyncStatus('idle');
      setCurrentOperation('Ready to sync');
      setSyncProgress(0);
      setActiveSyncId('');
      setStuckSyncDetected(false);
      clearLocalStorage();
    }
  }, [activeSyncId, completeSyncMonitoring]);

  const testConnection = useCallback(async () => {
    if (!connection?.id) return;
    
    try {
      const result = await ZoomConnectionTestService.testConnection(connection.id);
      ZoomConnectionTestService.showTestResults(result);
      setLastConnectionTest(new Date());
      return result;
    } catch (error) {
      console.error('Connection test error:', error);
      toast.error('Connection test failed');
    }
  }, [connection]);

  const forceResetAndRestart = useCallback(async () => {
    if (!connection?.id) return;
    
    try {
      // Force cleanup
      await SyncRecoveryService.forceCleanupStuckSyncs(connection.id);
      
      // Reset state
      setIsSyncing(false);
      setSyncProgress(0);
      setSyncStatus('idle');
      setCurrentOperation('Ready to sync');
      setStuckSyncDetected(false);
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

  useEffect(() => {
    // Load state from localStorage on mount
    const initialState = getInitialState();
    setIsSyncing(initialState.isSyncing || false);
    setSyncProgress(initialState.syncProgress || 0);
    setSyncStatus(initialState.syncStatus || 'idle');
    setActiveSyncId(initialState.activeSyncId || '');

    // If there's an active sync, start monitoring it
    if (initialState.isSyncing && initialState.activeSyncId) {
      console.log(`⚙️ Resuming sync monitoring from localStorage: ${initialState.activeSyncId}`);
      startSyncMonitoring(initialState.activeSyncId);
    }

    return () => {
      // Clear the interval when the component unmounts
      if (monitoringIntervalRef.current) {
        clearInterval(monitoringIntervalRef.current);
      }
    };
  }, [startSyncMonitoring]);

  const forceCancelSync = useCallback(async () => {
    await cancelSync();
    await forceResetAndRestart();
  }, [cancelSync, forceResetAndRestart]);

  const healthCheck = {
    success: true,
    message: 'Service is healthy'
  };

  return {
    isSyncing,
    syncProgress,
    syncStatus,
    currentOperation,
    activeSyncId,
    syncMode,
    startSync,
    cancelSync,
    forceCancelSync,
    syncError,
    fallbackMode,
    testConnection,
    forceResetAndRestart,
    stuckSyncDetected,
    healthCheck
  };
};
