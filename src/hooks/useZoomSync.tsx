import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import { ZoomConnection } from '@/types/zoom';
import { TokenUtils, TokenStatus } from '@/services/zoom/utils/tokenUtils';
import { ZoomConnectionService } from '@/services/zoom/ZoomConnectionService';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

export const useZoomSync = (connection?: ZoomConnection | null) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState(0);
  const [currentOperation, setCurrentOperation] = useState<string>('');

  const startSync = useCallback(async (syncType: 'initial' | 'incremental' = 'incremental') => {
    console.log('=== Starting Sync ===');
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
      console.log('Invoking zoom-sync-webinars function...');
      const { data, error } = await supabase.functions.invoke('zoom-sync-webinars', {
        headers: {
          'zoom_connection_id': connection.id,
          'test_mode': syncType === 'initial' ? 'false' : 'false'
        }
      });

      console.log('Function response:', { data, error });

      if (error) {
        console.error('Function invocation error:', error);
        
        // Capture detailed error information
        if (error.response) {
          try {
            const errorData = await error.response.json();
            console.error('Edge Function Error Details:', errorData);
            window.__lastSyncError = errorData;
            localStorage.setItem('last_sync_error', JSON.stringify({
              timestamp: new Date().toISOString(),
              error: errorData
            }));
          } catch (e) {
            console.error('Could not parse error response:', e);
          }
        }
        
        throw new Error(error.message || 'Failed to start sync');
      }

      if (!data?.success) {
        throw new Error(data?.error || 'Sync failed to start');
      }

      console.log('Sync started successfully, beginning status polling...');
      toast({
        title: "Sync Started",
        description: `${syncType === 'initial' ? 'Full' : 'Incremental'} sync has been initiated.`,
      });

      // Get syncId from response
      const syncId = data?.syncId;
      if (syncId) {
        pollSyncStatus(syncId);
      } else {
        console.warn('No syncId returned from function, attempting fallback polling');
        // Fallback: try to find the most recent sync log for this connection
        const { data: recentSync } = await supabase
          .from('zoom_sync_logs')
          .select('id')
          .eq('connection_id', connection.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();
        
        if (recentSync) {
          pollSyncStatus(recentSync.id);
        } else {
          throw new Error('Unable to track sync progress');
        }
      }

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
    console.log('Starting sync status polling for:', syncId);
    
    let pollAttempts = 0;
    const maxPollAttempts = 180; // 6 minutes with 2-second intervals
    let lastKnownStatus = '';
    
    const pollInterval = setInterval(async () => {
      pollAttempts++;
      
      try {
        const { data: syncLogs, error } = await supabase
          .from('zoom_sync_logs')
          .select('*')
          .eq('id', syncId)
          .single();

        if (error) {
          console.error('Error polling sync status:', error);
          if (pollAttempts > 10) { // Stop polling after multiple errors
            clearInterval(pollInterval);
            setIsSyncing(false);
            setSyncProgress(0);
            setCurrentOperation('');
            toast({
              title: "Sync Monitoring Failed",
              description: "Unable to track sync progress. Please check manually.",
              variant: "destructive",
            });
          }
          return;
        }

        if (syncLogs) {
          const newStatus = syncLogs.sync_status;
          console.log('Sync status:', newStatus, `${syncLogs.processed_items}/${syncLogs.total_items}`);
          
          // Only update if status changed to avoid unnecessary re-renders
          if (newStatus !== lastKnownStatus) {
            lastKnownStatus = newStatus;
          }
          
          const progress = syncLogs.total_items > 0 
            ? Math.round((syncLogs.processed_items / syncLogs.total_items) * 100)
            : syncLogs.stage_progress_percentage || 0;
          
          setSyncProgress(progress);
          
          if (syncLogs.sync_stage) {
            setCurrentOperation(
              syncLogs.sync_status === 'in_progress' 
                ? `${syncLogs.sync_stage}: ${syncLogs.processed_items || 0}/${syncLogs.total_items || 0} items`
                : syncLogs.sync_stage
            );
          } else {
            setCurrentOperation(
              syncLogs.sync_status === 'in_progress' 
                ? `Processing ${syncLogs.processed_items || 0}/${syncLogs.total_items || 0} webinars...`
                : syncLogs.sync_status
            );
          }

          if (syncLogs.sync_status === 'completed') {
            console.log('Sync completed successfully');
            clearInterval(pollInterval);
            setIsSyncing(false);
            setSyncProgress(100);
            setCurrentOperation('Sync completed');
            
            // Invalidate queries to refresh data
            queryClient.invalidateQueries({ queryKey: ['webinars'] });
            queryClient.invalidateQueries({ queryKey: ['zoom-connection'] });
            
            toast({
              title: "Sync Completed",
              description: `Successfully synced ${syncLogs.processed_items} webinars.`,
            });

            // Clear status after delay
            setTimeout(() => {
              setSyncProgress(0);
              setCurrentOperation('');
            }, 3000);
            
          } else if (syncLogs.sync_status === 'failed') {
            console.error('Sync failed:', syncLogs.error_message);
            clearInterval(pollInterval);
            setIsSyncing(false);
            setSyncProgress(0);
            setCurrentOperation('');
            
            toast({
              title: "Sync Failed",
              description: syncLogs.error_message || "Unknown error occurred during sync",
              variant: "destructive",
            });
          }
        }
      } catch (error) {
        console.error('Error polling sync status:', error);
      }
      
      // Stop polling if max attempts reached
      if (pollAttempts >= maxPollAttempts) {
        console.log('Sync polling timeout reached');
        clearInterval(pollInterval);
        if (isSyncing) {
          setIsSyncing(false);
          setSyncProgress(0);
          setCurrentOperation('');
          toast({
            title: "Sync Timeout",
            description: "Sync is taking longer than expected. Please check back later.",
            variant: "destructive",
          });
        }
      }
    }, 2000);

    // Also stop polling after 6 minutes as backup
    setTimeout(() => {
      clearInterval(pollInterval);
    }, 6 * 60 * 1000);
  }, [isSyncing, queryClient, toast]);

  return {
    startSync,
    isSyncing,
    syncProgress,
    currentOperation,
  };
};
