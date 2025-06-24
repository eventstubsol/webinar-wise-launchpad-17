
import { useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import { ZoomConnection } from '@/types/zoom';
import { TokenUtils, TokenStatus } from '@/services/zoom/utils/tokenUtils';
import { zoomSyncOrchestrator } from '@/services/zoom/sync/ZoomSyncOrchestrator';
import { ZoomWebinarDataService } from '@/services/zoom/api/ZoomWebinarDataService';
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
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'completed' | 'failed' | 'no_data'>('idle');

  /**
   * Validate UUID format
   */
  const isValidUUID = (uuid: string): boolean => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
  };

  /**
   * Test API connection before sync
   */
  const testApiConnection = useCallback(async (): Promise<boolean> => {
    if (!connection) return false;

    try {
      console.log('🔍 Testing API connection before sync...');
      const testResult = await ZoomWebinarDataService.testApiConnection();
      
      if (testResult.errorCategory === 'AUTH') {
        toast({
          title: "Authentication Error",
          description: testResult.userMessage,
          variant: "destructive",
          action: (
            <Button asChild variant="secondary" size="sm">
              <Link to="/settings">Reconnect Zoom</Link>
            </Button>
          ),
        });
        return false;
      } else if (testResult.errorCategory === 'PERMISSIONS') {
        toast({
          title: "Permission Error",
          description: testResult.userMessage,
          variant: "destructive",
          action: (
            <Button asChild variant="secondary" size="sm">
              <Link to="/settings">Check Settings</Link>
            </Button>
          ),
        });
        return false;
      } else if (testResult.errorCategory === 'RATE_LIMIT') {
        toast({
          title: "Rate Limited",
          description: testResult.userMessage,
          variant: "destructive",
        });
        return false;
      } else if (testResult.errorCategory === 'API_ERROR') {
        toast({
          title: "API Connection Error",
          description: testResult.userMessage,
          variant: "destructive",
        });
        return false;
      }

      console.log('✅ API connection test passed');
      return true;
    } catch (error) {
      console.error('❌ API connection test failed:', error);
      toast({
        title: "Connection Test Failed",
        description: "Unable to connect to Zoom API. Please check your connection.",
        variant: "destructive",
      });
      return false;
    }
  }, [connection, toast]);

  /**
   * Validate sync ID exists in database before polling
   */
  const validateSyncIdExists = async (syncId: string): Promise<boolean> => {
    if (!isValidUUID(syncId)) {
      console.error('Invalid sync ID format for validation:', syncId);
      return false;
    }

    try {
      const { data, error } = await supabase
        .from('zoom_sync_logs')
        .select('id')
        .eq('id', syncId)
        .maybeSingle();

      if (error) {
        console.error('Error validating sync ID:', error);
        return false;
      }

      return !!data;
    } catch (error) {
      console.error('Exception validating sync ID:', error);
      return false;
    }
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

    // Validate user ID format
    if (!isValidUUID(user.id)) {
      console.error('Invalid user ID format:', user.id);
      toast({
        title: "Authentication Error",
        description: "Invalid user authentication. Please log in again.",
        variant: "destructive",
      });
      return;
    }

    // Validate connection ID format
    if (!isValidUUID(connection.id)) {
      console.error('Invalid connection ID format:', connection.id);
      toast({
        title: "Connection Error",
        description: "Invalid connection format. Please reconnect your Zoom account.",
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

    // Test API connection before proceeding
    const canConnect = await testApiConnection();
    if (!canConnect) {
      return;
    }

    setIsSyncing(true);
    setSyncProgress(0);
    setSyncStatus('syncing');
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

      // Wait a moment for sync log to be created, then validate and start polling
      setTimeout(async () => {
        const exists = await validateSyncIdExists(syncId);
        if (exists) {
          console.log('Sync log validated, starting polling for:', syncId);
          pollSyncStatus(syncId);
        } else {
          console.error('Sync log not found after creation delay:', syncId);
          handleSyncError('Sync setup failed - could not initialize sync tracking');
        }
      }, 2000);

    } catch (error) {
      console.error('Sync start error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      handleSyncError(errorMessage);
    }
  }, [user, connection, toast, queryClient, testApiConnection]);

  const handleSyncError = (errorMessage: string) => {
    setIsSyncing(false);
    setSyncProgress(0);
    setSyncStatus('failed');
    setCurrentOperation('');
    setActiveSyncId(null);
    
    toast({
      title: "Sync Failed",
      description: errorMessage,
      variant: "destructive",
    });
  };

  const handleSyncComplete = (webinarCount: number = 0) => {
    setIsSyncing(false);
    setSyncProgress(100);
    setActiveSyncId(null);
    
    if (webinarCount === 0) {
      setSyncStatus('no_data');
      setCurrentOperation('No webinars found');
      
      toast({
        title: "Sync Completed",
        description: "No webinars found in your Zoom account for the specified date range.",
      });
    } else {
      setSyncStatus('completed');
      setCurrentOperation('Sync completed');
      
      toast({
        title: "Sync Completed",
        description: `Successfully synced ${webinarCount} webinars.`,
      });
    }

    // Invalidate queries to refresh data
    queryClient.invalidateQueries({ queryKey: ['webinars'] });
    queryClient.invalidateQueries({ queryKey: ['zoom-connection'] });

    // Clear status after delay
    setTimeout(() => {
      setSyncProgress(0);
      setCurrentOperation('');
      setSyncStatus('idle');
    }, 5000);
  };

  const pollSyncStatus = useCallback(async (syncId: string) => {
    if (!isValidUUID(syncId)) {
      console.error('Cannot poll invalid sync ID:', syncId);
      return;
    }

    console.log('Starting sync status polling for:', syncId);
    
    let pollAttempts = 0;
    const maxPollAttempts = 150; // 5 minutes at 2-second intervals
    let consecutiveErrors = 0;
    const maxConsecutiveErrors = 5;
    
    const pollInterval = setInterval(async () => {
      pollAttempts++;
      
      // Timeout safeguard
      if (pollAttempts > maxPollAttempts) {
        console.log('Polling timeout reached for sync:', syncId);
        clearInterval(pollInterval);
        handleSyncError('Sync operation timed out. It may still be running in the background.');
        return;
      }

      try {
        // Get sync status from database
        const { data: syncLog, error } = await supabase
          .from('zoom_sync_logs')
          .select('*')
          .eq('id', syncId)
          .maybeSingle();

        if (error) {
          consecutiveErrors++;
          console.error(`Database error during polling (${consecutiveErrors}/${maxConsecutiveErrors}):`, error);
          
          if (consecutiveErrors >= maxConsecutiveErrors) {
            console.error('Too many consecutive database errors, stopping poll');
            clearInterval(pollInterval);
            handleSyncError('Lost connection to sync database. Please try refreshing the page.');
            return;
          }
          return;
        }

        if (syncLog) {
          console.log('Sync log found:', syncLog);
          consecutiveErrors = 0; // Reset error counter
          
          if (syncLog.status === 'completed' || syncLog.sync_status === 'completed') {
            console.log('Sync completed successfully');
            clearInterval(pollInterval);
            handleSyncComplete(syncLog.processed_items || 0);
            
          } else if (syncLog.status === 'failed' || syncLog.sync_status === 'failed') {
            console.error('Sync failed:', syncLog.error_message);
            clearInterval(pollInterval);
            handleSyncError(syncLog.error_message || "Unknown error occurred during sync");
          } else {
            // Sync still in progress
            const progress = syncLog.stage_progress_percentage || 0;
            setSyncProgress(Math.max(progress, 10)); // Minimum 10% to show activity
            setCurrentOperation(syncLog.sync_stage || 'Processing...');
          }
        } else {
          // Record not found, but don't error immediately
          console.log('Sync log not found yet, continuing to poll...');
        }
      } catch (error) {
        consecutiveErrors++;
        console.error('Error polling sync status:', error);
        
        if (consecutiveErrors >= maxConsecutiveErrors) {
          console.error('Too many consecutive polling errors, stopping poll');
          clearInterval(pollInterval);
          handleSyncError('Failed to track sync progress. Please check sync status manually.');
        }
      }
    }, 2000);

  }, [queryClient, toast]);

  const cancelSync = useCallback(async () => {
    if (activeSyncId && isValidUUID(activeSyncId)) {
      try {
        await zoomSyncOrchestrator.cancelSync(activeSyncId);
        setIsSyncing(false);
        setSyncProgress(0);
        setSyncStatus('idle');
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
    testApiConnection,
    isSyncing,
    syncProgress,
    syncStatus,
    currentOperation,
    activeSyncId,
  };
};
