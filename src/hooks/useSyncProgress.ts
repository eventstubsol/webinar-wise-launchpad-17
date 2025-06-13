import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { ZoomSyncLog, SyncStatus, SyncType } from '@/types/zoom';
import { useToast } from '@/hooks/use-toast';

export interface SyncError {
  id: string;
  message: string;
  code?: string;
  timestamp: string;
  dismissible: boolean;
}

export interface SyncHistoryEntry {
  id: string;
  type: SyncType;
  status: SyncStatus;
  startedAt: string;
  completedAt?: string;
  totalItems: number;
  processedItems: number;
  duration?: number;
}

export interface UseSyncProgressReturn {
  isActive: boolean;
  progress: number; // 0-100
  status: SyncStatus | null;
  currentOperation: string;
  processedItems: number;
  totalItems: number;
  estimatedTimeRemaining: number | null;
  errors: SyncError[];
  startSync: (type: SyncType, options?: { webinarId?: string }) => Promise<void>;
  cancelSync: () => Promise<void>;
  dismissError: (errorId: string) => void;
  syncHistory: SyncHistoryEntry[];
  isConnected: boolean;
}

export const useSyncProgress = (connectionId: string): UseSyncProgressReturn => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [currentSync, setCurrentSync] = useState<ZoomSyncLog | null>(null);
  const [errors, setErrors] = useState<SyncError[]>([]);
  const [syncHistory, setSyncHistory] = useState<SyncHistoryEntry[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  
  // Performance tracking for time estimation
  const progressHistoryRef = useRef<Array<{ timestamp: number; processed: number }>>([]);
  const lastUpdateTimeRef = useRef<number>(Date.now());

  // Calculate progress percentage
  const progress = currentSync?.total_items && currentSync.total_items > 0
    ? Math.min(100, Math.round((currentSync.processed_items / currentSync.total_items) * 100))
    : 0;

  // Determine if sync is active
  const isActive = currentSync?.sync_status === SyncStatus.STARTED || 
                   currentSync?.sync_status === SyncStatus.IN_PROGRESS ||
                   isStarting;

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
  }, []);

  // Get average processing time per item based on sync type
  const getSyncTypeAvgTime = (syncType: SyncType): number => {
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
  };

  // Update progress history for time estimation
  const updateProgressHistory = useCallback((processed: number) => {
    const now = Date.now();
    progressHistoryRef.current.push({ timestamp: now, processed });
    
    // Keep only recent history (last 2 minutes)
    progressHistoryRef.current = progressHistoryRef.current.filter(
      entry => now - entry.timestamp < 120000
    );
  }, []);

  // Transform sync log to history entry
  const transformToHistoryEntry = useCallback((syncLog: ZoomSyncLog): SyncHistoryEntry => {
    const duration = syncLog.completed_at && syncLog.started_at
      ? Math.round((new Date(syncLog.completed_at).getTime() - new Date(syncLog.started_at).getTime()) / 1000)
      : undefined;

    return {
      id: syncLog.id,
      type: syncLog.sync_type,
      status: syncLog.sync_status,
      startedAt: syncLog.started_at,
      completedAt: syncLog.completed_at || undefined,
      totalItems: syncLog.total_items || 0,
      processedItems: syncLog.processed_items || 0,
      duration,
    };
  }, []);

  // Start sync operation
  const startSync = useCallback(async (type: SyncType, options?: { webinarId?: string }) => {
    if (!user || !connectionId) {
      toast({
        title: "Authentication Required",
        description: "Please sign in to start sync operations.",
        variant: "destructive",
      });
      return;
    }

    if (isActive) {
      toast({
        title: "Sync Already Active",
        description: "Please wait for the current sync to complete.",
        variant: "destructive",
      });
      return;
    }

    setIsStarting(true);
    try {
      const response = await supabase.functions.invoke('zoom-sync-webinars', {
        body: {
          connectionId,
          syncType: type,
          webinarId: options?.webinarId,
        },
      });

      if (response.error) {
        throw new Error(response.error.message || 'Failed to start sync');
      }

      toast({
        title: "Sync Started",
        description: `${type} sync has been initiated successfully.`,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      
      setErrors(prev => [...prev, {
        id: `error-${Date.now()}`,
        message: `Failed to start sync: ${errorMessage}`,
        timestamp: new Date().toISOString(),
        dismissible: true,
      }]);

      toast({
        title: "Sync Failed to Start",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsStarting(false);
    }
  }, [user, connectionId, isActive, toast]);

  // Cancel sync operation
  const cancelSync = useCallback(async () => {
    if (!currentSync) return;

    try {
      // Update sync status to cancelled
      const { error } = await supabase
        .from('zoom_sync_logs')
        .update({
          sync_status: SyncStatus.CANCELLED,
          completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', currentSync.id);

      if (error) throw error;

      toast({
        title: "Sync Cancelled",
        description: "The sync operation has been cancelled.",
      });
    } catch (error) {
      toast({
        title: "Failed to Cancel",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive",
      });
    }
  }, [currentSync, toast]);

  // Dismiss error
  const dismissError = useCallback((errorId: string) => {
    setErrors(prev => prev.filter(error => error.id !== errorId));
  }, []);

  // Set up real-time subscription
  useEffect(() => {
    if (!connectionId) return;

    const channel = supabase
      .channel(`sync-progress-${connectionId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'zoom_sync_logs',
          filter: `connection_id=eq.${connectionId}`,
        },
        (payload) => {
          const syncLog = payload.new as ZoomSyncLog;
          
          if (payload.eventType === 'DELETE') {
            setCurrentSync(null);
            return;
          }

          if (syncLog) {
            // Update progress history for time estimation
            if (syncLog.processed_items !== undefined) {
              updateProgressHistory(syncLog.processed_items);
            }

            // Handle active syncs
            if (syncLog.sync_status === SyncStatus.STARTED || 
                syncLog.sync_status === SyncStatus.IN_PROGRESS) {
              setCurrentSync(syncLog);
            }
            
            // Handle completed/failed syncs
            else if (syncLog.sync_status === SyncStatus.COMPLETED ||
                     syncLog.sync_status === SyncStatus.FAILED ||
                     syncLog.sync_status === SyncStatus.CANCELLED) {
              
              // Add to history
              setSyncHistory(prev => {
                const historyEntry = transformToHistoryEntry(syncLog);
                const updated = [historyEntry, ...prev.filter(h => h.id !== historyEntry.id)];
                return updated.slice(0, 10); // Keep last 10 entries
              });

              // Handle errors
              if (syncLog.sync_status === SyncStatus.FAILED && syncLog.error_message) {
                setErrors(prev => [...prev, {
                  id: `sync-error-${syncLog.id}`,
                  message: syncLog.error_message!,
                  code: syncLog.error_details?.error_code,
                  timestamp: new Date().toISOString(),
                  dismissible: true,
                }]);
              }

              // Clear current sync after delay
              setTimeout(() => {
                setCurrentSync(null);
              }, 3000);
            }
          }
        }
      )
      .subscribe((status) => {
        setIsConnected(status === 'SUBSCRIBED');
        
        if (status === 'CHANNEL_ERROR') {
          setErrors(prev => [...prev, {
            id: `connection-error-${Date.now()}`,
            message: 'Lost real-time connection. Some updates may be delayed.',
            timestamp: new Date().toISOString(),
            dismissible: true,
          }]);
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [connectionId, updateProgressHistory, transformToHistoryEntry]);

  // Load initial sync history
  useEffect(() => {
    const loadSyncHistory = async () => {
      if (!connectionId) return;

      const { data, error } = await supabase
        .from('zoom_sync_logs')
        .select('*')
        .eq('connection_id', connectionId)
        .in('sync_status', [SyncStatus.COMPLETED, SyncStatus.FAILED, SyncStatus.CANCELLED])
        .order('started_at', { ascending: false })
        .limit(10);

      if (error) {
        console.error('Failed to load sync history:', error);
        return;
      }

      if (data) {
        setSyncHistory(data.map(transformToHistoryEntry));
      }
    };

    loadSyncHistory();
  }, [connectionId, transformToHistoryEntry]);

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
