
import { useState, useEffect, useCallback } from 'react';
import { ZoomSyncLog, SyncStatus, SyncType } from '@/types/zoom';
import { SyncError, SyncHistoryEntry, UseSyncProgressReturn } from './sync/types';
import { useSyncCalculations } from './sync/useSyncCalculations';
import { useSyncOperations } from './sync/useSyncOperations';
import { useSyncSubscription } from './sync/useSyncSubscription';

export const useSyncProgress = (connectionId: string): UseSyncProgressReturn => {
  const [currentSync, setCurrentSync] = useState<ZoomSyncLog | null>(null);
  const [errors, setErrors] = useState<SyncError[]>([]);
  const [syncHistory, setSyncHistory] = useState<SyncHistoryEntry[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isStarting, setIsStarting] = useState(false);

  const {
    calculateProgress,
    getCurrentOperation,
    calculateTimeRemaining,
    updateProgressHistory,
  } = useSyncCalculations();

  const {
    startSync: startSyncOperation,
    cancelSync: cancelSyncOperation,
    transformToHistoryEntry,
  } = useSyncOperations(connectionId);

  // Calculate derived values
  const progress = calculateProgress(currentSync);
  const isActive = currentSync?.sync_status === SyncStatus.STARTED || 
                   currentSync?.sync_status === SyncStatus.IN_PROGRESS ||
                   isStarting;

  // Handle sync updates
  const handleSyncUpdate = useCallback((syncLog: ZoomSyncLog) => {
    setCurrentSync(syncLog);
  }, []);

  // Handle history updates
  const handleHistoryUpdate = useCallback((entry: SyncHistoryEntry) => {
    setSyncHistory(prev => {
      const updated = [entry, ...prev.filter(h => h.id !== entry.id)];
      return updated.slice(0, 10); // Keep last 10 entries
    });

    // Clear current sync after delay for completed/failed/cancelled syncs
    setTimeout(() => {
      setCurrentSync(null);
    }, 3000);
  }, []);

  // Handle errors
  const handleError = useCallback((error: SyncError) => {
    setErrors(prev => [...prev, error]);
  }, []);

  // Handle connection changes
  const handleConnectionChange = useCallback((connected: boolean) => {
    setIsConnected(connected);
  }, []);

  // Set up subscription
  const { loadSyncHistory } = useSyncSubscription({
    connectionId,
    onSyncUpdate: handleSyncUpdate,
    onHistoryUpdate: handleHistoryUpdate,
    onError: handleError,
    onConnectionChange: handleConnectionChange,
    updateProgressHistory,
    transformToHistoryEntry,
  });

  // Wrapped start sync with loading state
  const startSync = useCallback(async (type: SyncType, options?: { webinarId?: string }) => {
    if (isActive) {
      handleError({
        id: `error-${Date.now()}`,
        message: 'Please wait for the current sync to complete.',
        timestamp: new Date().toISOString(),
        dismissible: true,
      });
      return;
    }

    setIsStarting(true);
    try {
      await startSyncOperation(type, options);
    } catch (error) {
      handleError({
        id: `error-${Date.now()}`,
        message: `Failed to start sync: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date().toISOString(),
        dismissible: true,
      });
    } finally {
      setIsStarting(false);
    }
  }, [isActive, startSyncOperation, handleError]);

  // Wrapped cancel sync
  const cancelSync = useCallback(async () => {
    await cancelSyncOperation(currentSync);
  }, [cancelSyncOperation, currentSync]);

  // Dismiss error
  const dismissError = useCallback((errorId: string) => {
    setErrors(prev => prev.filter(error => error.id !== errorId));
  }, []);

  // Load initial history
  useEffect(() => {
    const loadHistory = async () => {
      const history = await loadSyncHistory();
      setSyncHistory(history);
    };

    loadHistory();
  }, [loadSyncHistory]);

  return {
    isActive,
    progress,
    status: currentSync?.sync_status || null,
    currentOperation: getCurrentOperation(currentSync),
    processedItems: currentSync?.processed_items || 0,
    totalItems: currentSync?.total_items || 0,
    estimatedTimeRemaining: calculateTimeRemaining(currentSync),
    errors,
    startSync,
    cancelSync,
    dismissError,
    syncHistory,
    isConnected,
  };
};

export type { SyncError, SyncHistoryEntry, UseSyncProgressReturn } from './sync/types';
