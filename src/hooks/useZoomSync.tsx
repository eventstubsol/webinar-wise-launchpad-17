
import React, { useState, useRef, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { ZoomConnection, SyncType } from '@/types/zoom';
import { RenderZoomService } from '@/services/zoom/RenderZoomService';
import { SyncManagementService } from '@/services/zoom/sync/SyncManagementService';
import { SyncDiagnosticService } from '@/services/zoom/sync/SyncDiagnosticService';
import { SyncHeartbeatService } from '@/services/zoom/sync/SyncHeartbeatService';
import { SyncRecoveryService } from '@/services/zoom/sync/SyncRecoveryService';

export const useZoomSync = (connection?: ZoomConnection | null) => {
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState(0);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'completed' | 'failed' | 'no_data'>('idle');
  const [currentOperation, setCurrentOperation] = useState('');
  const [syncId, setSyncId] = useState<string | null>(null);
  const [syncMode, setSyncMode] = useState<'render' | 'direct' | null>(null);
  const [stuckSyncDetected, setStuckSyncDetected] = useState(false);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const stuckSyncCheckRef = useRef<NodeJS.Timeout | null>(null);

  const clearProgressInterval = useCallback(() => {
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
  }, []);

  const clearStuckSyncCheck = useCallback(() => {
    if (stuckSyncCheckRef.current) {
      clearInterval(stuckSyncCheckRef.current);
      stuckSyncCheckRef.current = null;
    }
  }, []);

  const pollSyncProgress = useCallback(async (syncId: string) => {
    try {
      // Get progress from both Render and database
      const [renderResult, dbResult] = await Promise.allSettled([
        RenderZoomService.getSyncProgress(syncId),
        connection?.id ? SyncRecoveryService.getCurrentSyncStatus(connection.id) : null
      ]);

      const renderProgress = renderResult.status === 'fulfilled' ? renderResult.value : null;
      const dbProgress = dbResult.status === 'fulfilled' ? dbResult.value : null;

      // Enhanced logging for debugging
      console.log(`📊 Sync Progress Check ${syncId}:`, {
        render: renderProgress?.success ? {
          progress: renderProgress.progress,
          status: renderProgress.status,
          operation: renderProgress.currentOperation
        } : 'Failed',
        database: dbProgress ? {
          progress: dbProgress.stage_progress_percentage,
          status: dbProgress.sync_status,
          stage: dbProgress.sync_stage
        } : 'Not found'
      });

      // Check for phantom sync
      if (renderProgress?.success && dbProgress) {
        const isPhantom = await SyncDiagnosticService.detectPhantomSync(syncId, renderProgress, dbProgress);
        if (isPhantom) {
          setStuckSyncDetected(true);
          setCurrentOperation('Sync communication issue detected...');
          return;
        }
      }

      // Use database progress as primary source, fall back to Render
      let progressData = null;
      if (dbProgress && dbProgress.stage_progress_percentage > 0) {
        progressData = {
          progress: dbProgress.stage_progress_percentage,
          status: dbProgress.sync_status,
          currentOperation: dbProgress.sync_stage || 'Processing...'
        };
      } else if (renderProgress?.success) {
        progressData = renderProgress;
      }

      if (progressData) {
        setSyncProgress(Math.max(syncProgress, progressData.progress || 0));
        setCurrentOperation(progressData.currentOperation || currentOperation);
        
        if (progressData.status === 'completed') {
          setSyncStatus('completed');
          setIsSyncing(false);
          clearProgressInterval();
          SyncHeartbeatService.stopHeartbeat(syncId);
          
          queryClient.invalidateQueries({ queryKey: ['zoom-webinars'] });
          queryClient.invalidateQueries({ queryKey: ['zoom-connection'] });
          queryClient.invalidateQueries({ queryKey: ['zoom-sync-stats'] });
          
          toast({
            title: "Sync completed successfully",
            description: "Your Zoom data has been synchronized.",
          });
        } else if (progressData.status === 'failed') {
          setSyncStatus('failed');
          setIsSyncing(false);
          clearProgressInterval();
          SyncHeartbeatService.stopHeartbeat(syncId);
          
          toast({
            title: "Sync failed",
            description: progressData.error || "An error occurred during synchronization.",
            variant: "destructive",
          });
        } else if (progressData.status === 'no_data') {
          setSyncStatus('no_data');
          setIsSyncing(false);
          clearProgressInterval();
          SyncHeartbeatService.stopHeartbeat(syncId);
          
          toast({
            title: "No data to sync",
            description: "No webinars found to synchronize.",
          });
        } else {
          // Continue polling
          setTimeout(() => pollSyncProgress(syncId), 2000);
        }
      } else {
        // No progress data available - continue polling but with longer interval
        console.warn(`📊 No progress data available for sync ${syncId}, continuing...`);
        setTimeout(() => pollSyncProgress(syncId), 5000);
      }
    } catch (error) {
      console.error('Error polling sync progress:', error);
      setTimeout(() => pollSyncProgress(syncId), 5000);
    }
  }, [clearProgressInterval, queryClient, toast, syncProgress, currentOperation, connection?.id]);

  const startStuckSyncMonitoring = useCallback((syncId: string) => {
    // Clear existing check
    clearStuckSyncCheck();
    
    // Start monitoring for stuck sync after 2 minutes
    stuckSyncCheckRef.current = setTimeout(async () => {
      if (!connection?.id) return;
      
      const stalledCheck = await SyncDiagnosticService.detectStalledProgress(connection.id);
      if (stalledCheck.isStalled) {
        setStuckSyncDetected(true);
        setCurrentOperation(`Sync appears stuck: ${stalledCheck.reason}`);
        
        toast({
          title: "Sync appears stuck",
          description: "The sync has been running without progress. Use the Force Reset option.",
          variant: "destructive",
        });
      }
    }, 2 * 60 * 1000); // 2 minutes
  }, [connection?.id, clearStuckSyncCheck, toast]);

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
    setSyncProgress(5);
    setSyncStatus('syncing');
    setCurrentOperation('Starting enhanced sync...');
    setSyncMode(null);
    setStuckSyncDetected(false);

    try {
      console.log(`🔄 Starting enhanced ${syncType} sync for connection:`, connection.id);
      
      const result = await SyncManagementService.startReliableSync(connection.id, syncType);
      
      if (result.success && result.syncId) {
        setSyncId(result.syncId);
        setSyncMode(result.mode);
        setSyncProgress(10);
        setCurrentOperation('Sync started successfully...');
        
        // Start heartbeat monitoring
        SyncHeartbeatService.startHeartbeat(result.syncId, connection.id);
        
        // Start stuck sync monitoring
        startStuckSyncMonitoring(result.syncId);
        
        toast({
          title: "Sync started",
          description: `${result.message} (${result.mode} mode)`,
        });

        // Start polling for progress
        setTimeout(() => pollSyncProgress(result.syncId!), 2000);

      } else {
        throw new Error(result.message || 'Failed to start sync');
      }
    } catch (error) {
      console.error('Enhanced sync error:', error);
      setIsSyncing(false);
      setSyncStatus('failed');
      setCurrentOperation('');
      setSyncMode(null);
      
      toast({
        title: "Sync failed to start",
        description: error instanceof Error ? error.message : "Unable to start synchronization.",
        variant: "destructive",
      });
    }
  }, [connection?.id, isSyncing, pollSyncProgress, startStuckSyncMonitoring, toast]);

  const forceResetAndRestart = useCallback(async () => {
    if (!connection?.id) return;

    try {
      console.log('🔧 Force reset and restart requested');
      
      // Stop all monitoring
      clearProgressInterval();
      clearStuckSyncCheck();
      if (syncId) {
        SyncHeartbeatService.stopHeartbeat(syncId);
      }
      
      // Force cleanup stuck syncs
      await SyncRecoveryService.forceCleanupStuckSyncs(connection.id);
      
      // Reset state
      setIsSyncing(false);
      setSyncStatus('idle');
      setSyncProgress(0);
      setCurrentOperation('');
      setSyncId(null);
      setSyncMode(null);
      setStuckSyncDetected(false);
      
      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ['zoom-sync-stats'] });
      
      toast({
        title: "Sync reset complete",
        description: "You can now start a new sync operation.",
      });
      
      // Auto-restart sync after a brief delay
      setTimeout(() => {
        startSync(SyncType.INCREMENTAL);
      }, 1000);
      
    } catch (error) {
      console.error('Force reset error:', error);
      toast({
        title: "Reset failed",
        description: error instanceof Error ? error.message : 'Failed to reset sync',
        variant: "destructive",
      });
    }
  }, [connection?.id, syncId, clearProgressInterval, clearStuckSyncCheck, queryClient, toast, startSync]);

  const cancelSync = useCallback(async () => {
    if (!syncId) return;

    try {
      // Stop monitoring
      clearProgressInterval();
      clearStuckSyncCheck();
      SyncHeartbeatService.stopHeartbeat(syncId);
      
      const result = await RenderZoomService.cancelSync(syncId);
      
      if (result.success) {
        setIsSyncing(false);
        setSyncStatus('idle');
        setSyncProgress(0);
        setCurrentOperation('');
        setSyncId(null);
        setSyncMode(null);
        setStuckSyncDetected(false);
        
        toast({
          title: "Sync cancelled",
          description: "The synchronization has been cancelled.",
        });
      } else {
        throw new Error(result.error || 'Failed to cancel sync');
      }
    } catch (error) {
      console.error('Cancel sync error:', error);
      toast({
        title: "Cancel failed",
        description: "Unable to cancel the sync operation.",
        variant: "destructive",
      });
    }
  }, [syncId, clearProgressInterval, clearStuckSyncCheck, toast]);

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
      clearStuckSyncCheck();
      SyncHeartbeatService.stopAllHeartbeats();
    };
  }, [clearProgressInterval, clearStuckSyncCheck]);

  return {
    isSyncing,
    syncProgress,
    syncStatus,
    currentOperation,
    activeSyncId: syncId,
    syncMode,
    stuckSyncDetected,
    startSync,
    cancelSync,
    forceResetAndRestart,
    testApiConnection,
    healthCheck: { success: true },
  };
};
