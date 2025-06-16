
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { SyncType, SyncStatus, ZoomSyncLog } from '@/types/zoom';
import { EnhancedSyncRecoveryService } from '@/services/zoom/sync/EnhancedSyncRecoveryService';

interface EnhancedSyncProgress {
  // Current sync state
  isActive: boolean;
  currentSync: ZoomSyncLog | null;
  progress: number;
  status: SyncStatus | null;
  currentOperation: string;
  estimatedTimeRemaining: number | null;
  
  // Sync health
  syncHealth: {
    isHealthy: boolean;
    ageMinutes: number;
    hasStuckSyncs: boolean;
    lastCleanup: Date | null;
  } | null;
  
  // Operations
  startSync: (type: SyncType) => Promise<void>;
  cancelSync: () => Promise<void>;
  retrySync: (force?: boolean) => Promise<void>;
  forceCleanup: () => Promise<void>;
  
  // History and status
  syncHistory: Array<{
    id: string;
    type: SyncType;
    status: SyncStatus;
    startedAt: string;
    completedAt?: string;
    duration?: number;
    itemsProcessed: number;
    totalItems: number;
  }>;
  
  // Real-time updates
  lastUpdated: Date | null;
}

export const useEnhancedSyncProgress = (connectionId: string): EnhancedSyncProgress => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [isActive, setIsActive] = useState(false);
  const [currentSync, setCurrentSync] = useState<ZoomSyncLog | null>(null);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<SyncStatus | null>(null);
  const [currentOperation, setCurrentOperation] = useState('');
  const [estimatedTimeRemaining, setEstimatedTimeRemaining] = useState<number | null>(null);
  const [syncHealth, setSyncHealth] = useState<any>(null);
  const [syncHistory, setSyncHistory] = useState<any[]>([]);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Real-time subscription to sync updates
  useEffect(() => {
    if (!connectionId) return;

    console.log('Setting up real-time sync monitoring for connection:', connectionId);

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
          console.log('Real-time sync update:', payload);
          fetchSyncStatus();
        }
      )
      .subscribe();

    // Initial load
    fetchSyncStatus();
    
    // Detect interrupted syncs on load
    EnhancedSyncRecoveryService.detectAndResumeInterruptedSyncs(connectionId);

    return () => {
      supabase.removeChannel(channel);
    };
  }, [connectionId]);

  const fetchSyncStatus = useCallback(async () => {
    if (!connectionId) return;

    try {
      const status = await EnhancedSyncRecoveryService.getComprehensiveSyncStatus(connectionId);
      
      if (status) {
        const { activeSync, activeSyncHealth, recentSyncs } = status;
        
        setIsActive(!!activeSync);
        // Fix type casting for currentSync
        setCurrentSync(activeSync ? {
          ...activeSync,
          sync_type: activeSync.sync_type as SyncType,
          sync_status: activeSync.sync_status as SyncStatus
        } as ZoomSyncLog : null);
        // Fix type casting for status
        setStatus(activeSync?.sync_status ? activeSync.sync_status as SyncStatus : null);
        setProgress(activeSync?.stage_progress_percentage || 0);
        setCurrentOperation(activeSync?.sync_stage || '');
        setSyncHealth(activeSyncHealth);
        
        // Transform recent syncs to history format with correct property names
        const history = recentSyncs.map((sync: any) => ({
          id: sync.id,
          type: sync.sync_type as SyncType,
          status: sync.sync_status as SyncStatus,
          startedAt: sync.started_at,
          completedAt: sync.completed_at || undefined,
          duration: sync.duration_seconds || undefined,
          itemsProcessed: sync.processed_items || 0,
          totalItems: sync.total_items || 0
        }));
        
        setSyncHistory(history);
        setLastUpdated(new Date());
      }
    } catch (error) {
      console.error('Failed to fetch sync status:', error);
    }
  }, [connectionId]);

  const startSync = useCallback(async (type: SyncType) => {
    if (!user || !connectionId) {
      toast({
        title: "Authentication Required",
        description: "Please sign in to start sync operations.",
        variant: "destructive",
      });
      return;
    }

    try {
      const result = await EnhancedSyncRecoveryService.smartRetrySync(
        connectionId, 
        type === SyncType.INITIAL ? 'initial' : 'incremental'
      );

      if (result.success) {
        toast({
          title: "Sync Started",
          description: result.message,
        });
        fetchSyncStatus();
      } else {
        toast({
          title: "Sync Failed to Start",
          description: result.message,
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Sync Error",
        description: error instanceof Error ? error.message : 'Unknown error occurred',
        variant: "destructive",
      });
    }
  }, [user, connectionId, toast, fetchSyncStatus]);

  const retrySync = useCallback(async (force: boolean = false) => {
    if (!connectionId) return;

    try {
      const result = await EnhancedSyncRecoveryService.smartRetrySync(
        connectionId,
        'incremental',
        force
      );

      if (result.success) {
        toast({
          title: "Sync Retry Started",
          description: result.message,
        });
        fetchSyncStatus();
      } else {
        toast({
          title: "Retry Failed",
          description: result.message,
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Retry Error",
        description: error instanceof Error ? error.message : 'Unknown error occurred',
        variant: "destructive",
      });
    }
  }, [connectionId, toast, fetchSyncStatus]);

  const forceCleanup = useCallback(async () => {
    if (!connectionId) return;

    try {
      const result = await EnhancedSyncRecoveryService.enhancedCleanupStuckSyncs(connectionId);
      
      toast({
        title: "Cleanup Completed",
        description: `Cleaned ${result.cleaned} stuck syncs. ${result.errors.length > 0 ? `${result.errors.length} errors occurred.` : ''}`,
        variant: result.errors.length > 0 ? "destructive" : "default",
      });
      
      fetchSyncStatus();
    } catch (error) {
      toast({
        title: "Cleanup Failed",
        description: error instanceof Error ? error.message : 'Unknown error occurred',
        variant: "destructive",
      });
    }
  }, [connectionId, toast, fetchSyncStatus]);

  const cancelSync = useCallback(async () => {
    if (!currentSync) return;

    try {
      const { error } = await supabase
        .from('zoom_sync_logs')
        .update({
          sync_status: SyncStatus.CANCELLED,
          completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', currentSync.id);

      if (error) {
        throw error;
      }

      toast({
        title: "Sync Cancelled",
        description: "The sync operation has been cancelled.",
      });
      
      fetchSyncStatus();
    } catch (error) {
      toast({
        title: "Failed to Cancel",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive",
      });
    }
  }, [currentSync, toast, fetchSyncStatus]);

  return {
    isActive,
    currentSync,
    progress,
    status,
    currentOperation,
    estimatedTimeRemaining,
    syncHealth,
    startSync,
    cancelSync,
    retrySync,
    forceCleanup,
    syncHistory,
    lastUpdated,
  };
};
