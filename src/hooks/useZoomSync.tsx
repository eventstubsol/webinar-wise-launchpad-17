
import { useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import { ZoomConnection } from '@/types/zoom';
import { TokenUtils, TokenStatus } from '@/services/zoom/utils/tokenUtils';
import { zoomSyncOrchestrator } from '@/services/zoom/sync/ZoomSyncOrchestrator';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';

export const useZoomSync = (connection?: ZoomConnection | null) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState(0);
  const [currentOperation, setCurrentOperation] = useState<string>('');
  const [activeSyncId, setActiveSyncId] = useState<string | null>(null);

  /**
   * Validate UUID format
   */
  const isValidUUID = (uuid: string): boolean => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
  };

  const startSync = useCallback(async (syncType: 'initial' | 'incremental' = 'incremental') => {
    console.log('=== Starting Client-Side Sync ===');
    console.log('User:', user?.id);
    console.log('Connection:', connection?.id);
    console.log('Sync type:', syncType);

    if (!user || !connection) {
      console.error('Missing user or connection for sync');
      toast({
        title: "Not Connected",
        description: "Please connect your Zoom account first to sync data.",
        variant: "destructive",
      });
      return;
    }

    const tokenStatus = TokenUtils.getTokenStatus(connection);
    console.log('Token status:', tokenStatus);

    // Check if refresh token is expired
    if (tokenStatus === TokenStatus.REFRESH_EXPIRED || tokenStatus === TokenStatus.INVALID) {
      console.error('Refresh token expired or invalid:', tokenStatus);
      toast({
        title: "Connection Expired",
        description: "Your Zoom connection has expired. Please reconnect in Settings.",
        variant: "destructive",
        action: (
          <Button asChild variant="secondary" size="sm">
            <Link to="/settings">Go to Settings</Link>
          </Button>
        ),
      });
      return;
    }

    setIsSyncing(true);
    setSyncProgress(0);
    setCurrentOperation('Starting sync...');

    try {
      console.log('Starting sync via ZoomSyncOrchestrator...');
      
      let syncId: string;
      if (syncType === 'initial') {
        syncId = await zoomSyncOrchestrator.startInitialSync(connection.id);
      } else {
        syncId = await zoomSyncOrchestrator.startIncrementalSync(connection.id);
      }

      // Validate that we got a proper UUID
      if (!isValidUUID(syncId)) {
        console.error('Invalid sync ID format received:', syncId);
        throw new Error('Invalid sync ID format received from orchestrator');
      }

      console.log('Sync started successfully with ID:', syncId);
      setActiveSyncId(syncId);
      
      toast({
        title: "Sync Started",
        description: `${syncType === 'initial' ? 'Full' : 'Incremental'} sync has been initiated.`,
      });

      // Start monitoring sync progress
      pollSyncStatus(syncId);

    } catch (error) {
      console.error('Sync start error:', error);
      setIsSyncing(false);
      setSyncProgress(0);
      setCurrentOperation('');
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      toast({
        title: "Sync Failed to Start",
        description: errorMessage,
        variant: "destructive",
      });
    }
  }, [user, connection, toast, queryClient]);

  const pollSyncStatus = useCallback(async (syncId: string) => {
    if (!isValidUUID(syncId)) {
      console.error('Cannot poll invalid sync ID:', syncId);
      return;
    }

    console.log('Starting sync status polling for:', syncId);
    
    const pollInterval = setInterval(async () => {
      try {
        // Get sync status from orchestrator
        const syncStatus = await zoomSyncOrchestrator.getSyncStatus();
        
        // Find our specific sync operation
        const currentSync = syncStatus.operations.find(op => op.id === syncId);
        
        if (currentSync) {
          console.log('Sync operation found:', currentSync);
          
          // Update progress based on operation status
          if (currentSync.type === 'initial' || currentSync.type === 'incremental') {
            // For now, simulate progress - this will be enhanced with real progress tracking
            const currentProgress = Math.min(syncProgress + 10, 90);
            setSyncProgress(currentProgress);
            setCurrentOperation(`Processing ${currentSync.type} sync...`);
          }
        } else {
          // Operation might be completed, check database for final status
          const { data: syncLog } = await supabase
            .from('zoom_sync_logs')
            .select('*')
            .eq('id', syncId)
            .single();

          if (syncLog) {
            console.log('Sync log found:', syncLog);
            
            if (syncLog.status === 'completed') {
              console.log('Sync completed successfully');
              clearInterval(pollInterval);
              setIsSyncing(false);
              setSyncProgress(100);
              setCurrentOperation('Sync completed');
              setActiveSyncId(null);
              
              // Invalidate queries to refresh data
              queryClient.invalidateQueries({ queryKey: ['webinars'] });
              queryClient.invalidateQueries({ queryKey: ['zoom-connection'] });
              
              toast({
                title: "Sync Completed",
                description: `Successfully synced ${syncLog.processed_items || 0} webinars.`,
              });

              // Clear status after delay
              setTimeout(() => {
                setSyncProgress(0);
                setCurrentOperation('');
              }, 3000);
              
            } else if (syncLog.status === 'failed') {
              console.error('Sync failed:', syncLog.error_message);
              clearInterval(pollInterval);
              setIsSyncing(false);
              setSyncProgress(0);
              setCurrentOperation('');
              setActiveSyncId(null);
              
              toast({
                title: "Sync Failed",
                description: syncLog.error_message || "Unknown error occurred during sync",
                variant: "destructive",
              });
            }
          }
        }
      } catch (error) {
        console.error('Error polling sync status:', error);
      }
    }, 2000);

    // Stop polling after 5 minutes
    setTimeout(() => {
      clearInterval(pollInterval);
      if (isSyncing) {
        console.log('Sync polling timeout reached');
        setIsSyncing(false);
        setSyncProgress(0);
        setCurrentOperation('');
        setActiveSyncId(null);
      }
    }, 5 * 60 * 1000);
  }, [isSyncing, queryClient, toast, syncProgress]);

  const cancelSync = useCallback(async () => {
    if (activeSyncId && isValidUUID(activeSyncId)) {
      try {
        await zoomSyncOrchestrator.cancelSync(activeSyncId);
        setIsSyncing(false);
        setSyncProgress(0);
        setCurrentOperation('');
        setActiveSyncId(null);
        
        toast({
          title: "Sync Cancelled",
          description: "The sync operation has been cancelled.",
        });
      } catch (error) {
        console.error('Error cancelling sync:', error);
        toast({
          title: "Cancel Failed",
          description: "Failed to cancel the sync operation.",
          variant: "destructive",
        });
      }
    }
  }, [activeSyncId, toast]);

  return {
    startSync,
    cancelSync,
    isSyncing,
    syncProgress,
    currentOperation,
    activeSyncId,
  };
};
