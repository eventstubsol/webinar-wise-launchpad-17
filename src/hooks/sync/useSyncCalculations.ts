import { useCallback, useRef } from 'react';
import { ZoomSyncLog, SyncType, SyncStatus } from '@/types/zoom';

export const useSyncCalculations = () => {
  // Performance tracking for time estimation
  const progressHistoryRef = useRef<Array<{ timestamp: number; processed: number }>>([]);

  // Calculate progress percentage
  const calculateProgress = useCallback((currentSync: ZoomSyncLog | null): number => {
    return currentSync?.total_items && currentSync.total_items > 0
      ? Math.min(100, Math.round((currentSync.processed_items / currentSync.total_items) * 100))
      : 0;
  }, []);

  // Generate current operation message
  const getCurrentOperation = useCallback((syncLog: ZoomSyncLog | null): string => {
    if (!syncLog) return '';
    
    const { sync_status, sync_type, processed_items, total_items, resource_type } = syncLog;
    
    switch (sync_status) {
      case SyncStatus.STARTED:
        return `Starting ${sync_type} sync...`;
      
      case SyncStatus.IN_PROGRESS:
        const resourceName = resource_type === 'webinar' ? 'webinar' : 'webinars';
        if (total_items && total_items > 0) {
          return `Processing ${resourceName}: ${processed_items} of ${total_items}`;
        }
        return `Processing ${resourceName}...`;
      
      case SyncStatus.COMPLETED:
        return `Sync completed successfully! Processed ${processed_items} items.`;
      
      case SyncStatus.FAILED:
        return `Sync failed: ${syncLog.error_message || 'Unknown error'}`;
      
      case SyncStatus.CANCELLED:
        return 'Sync was cancelled.';
      
      default:
        return '';
    }
  }, []);

  // Get average processing time per item based on sync type
  const getSyncTypeAvgTime = useCallback((syncType: SyncType): number => {
    switch (syncType) {
      case SyncType.MANUAL:
        return 2; // 2 seconds per item for single webinar
      case SyncType.INCREMENTAL:
        return 1.5; // 1.5 seconds per item for recent data
      case SyncType.INITIAL:
        return 3; // 3 seconds per item for complete historical data
      default:
        return 2;
    }
  }, []);

  // Update progress history for time estimation
  const updateProgressHistory = useCallback((processed: number) => {
    const now = Date.now();
    progressHistoryRef.current.push({ timestamp: now, processed });
    
    // Keep only recent history (last 2 minutes)
    progressHistoryRef.current = progressHistoryRef.current.filter(
      entry => now - entry.timestamp < 120000
    );
  }, []);

  // Calculate estimated time remaining
  const calculateTimeRemaining = useCallback((syncLog: ZoomSyncLog | null): number | null => {
    if (!syncLog || !syncLog.total_items || syncLog.total_items === 0) return null;
    
    const { processed_items, total_items } = syncLog;
    const remaining = total_items - processed_items;
    
    if (remaining <= 0) return 0;
    
    // Use recent progress history for more accurate estimation
    const now = Date.now();
    const recentHistory = progressHistoryRef.current.filter(
      entry => now - entry.timestamp < 30000 // Last 30 seconds
    );
    
    if (recentHistory.length < 2) {
      // Fallback: estimate based on sync type
      const avgTimePerItem = getSyncTypeAvgTime(syncLog.sync_type);
      return remaining * avgTimePerItem;
    }
    
    // Calculate processing rate from recent history
    const oldestEntry = recentHistory[0];
    const newestEntry = recentHistory[recentHistory.length - 1];
    const timeSpan = newestEntry.timestamp - oldestEntry.timestamp;
    const itemsProcessed = newestEntry.processed - oldestEntry.processed;
    
    if (timeSpan <= 0 || itemsProcessed <= 0) return null;
    
    const itemsPerMs = itemsProcessed / timeSpan;
    const estimatedMs = remaining / itemsPerMs;
    
    return Math.round(estimatedMs / 1000); // Return seconds
  }, [getSyncTypeAvgTime]);

  return {
    calculateProgress,
    getCurrentOperation,
    calculateTimeRemaining,
    updateProgressHistory,
  };
};
