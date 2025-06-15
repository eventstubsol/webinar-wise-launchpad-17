
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
    if (!user || !connection) {
      toast({
        title: "Not Connected",
        description: "Please connect your Zoom account first to sync data.",
        variant: "destructive",
      });
      return;
    }

    const tokenStatus = TokenUtils.getTokenStatus(connection);

    if (tokenStatus !== TokenStatus.VALID) {
      if (tokenStatus === TokenStatus.ACCESS_EXPIRED) {
        toast({
          title: "Refreshing connection...",
          description: "Your connection token has expired. We are attempting to refresh it automatically.",
        });
        const refreshedConnection = await ZoomConnectionService.refreshToken(connection);
        if (!refreshedConnection) {
            toast({
              title: "Refresh Failed",
              description: "Could not refresh your Zoom connection. Please go to settings and reconnect your account.",
              variant: "destructive",
            });
            return;
        }
        // if refresh is successful, query will refetch and user can try again.
        toast({
          title: "Connection Refreshed",
          description: "Your connection is active again. Please try syncing now.",
        });
        // Invalidate connection query to get the new tokens
        queryClient.invalidateQueries({ queryKey: ['zoom-connection', user.id] });
        return;
      }
      
      let title = "Sync Failed";
      let description = "An unknown connection error occurred.";

      if(tokenStatus === TokenStatus.REFRESH_EXPIRED) {
        title = "Connection Expired";
        description = "Your Zoom connection has expired. Please reconnect in Settings.";
      } else if(tokenStatus === TokenStatus.INVALID) {
        title = "Invalid Connection";
        description = "Your Zoom connection is invalid. Please reconnect in Settings.";
      }

      toast({ title, description, variant: "destructive" });
      return;
    }

    setIsSyncing(true);
    setSyncProgress(0);
    setCurrentOperation('Starting sync...');

    try {
      const { data, error } = await supabase.functions.invoke('zoom-sync-webinars', {
        body: {
          connectionId: connection.id,
          syncType,
        },
      });

      if (error) {
        const errorBody = error.context || {};
        if (errorBody.isAuthError) {
          toast({
            title: "Authentication Failed",
            description: error.message || "Your Zoom connection has expired. Please reconnect.",
            variant: "destructive",
            action: (
              <Button asChild variant="secondary" size="sm">
                <Link to="/settings">Go to Settings</Link>
              </Button>
            ),
          });
          throw new Error(error.message); // throw to stop execution
        }
        throw new Error(error.message || 'Failed to start sync');
      }

      toast({
        title: "Sync Started",
        description: `${syncType === 'initial' ? 'Full' : 'Incremental'} sync has been initiated.`,
      });

      // Poll for sync status using the database-generated sync ID
      const syncId = data.syncId;
      pollSyncStatus(syncId);

    } catch (error) {
      setIsSyncing(false);
      setSyncProgress(0);
      setCurrentOperation('');
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';

      if (!errorMessage.includes("Your Zoom connection has expired") && !errorMessage.includes("Authentication Failed")) {
        toast({
          title: "Sync Failed to Start",
          description: errorMessage,
          variant: "destructive",
        });
      }
    }
  }, [user, connection, toast, queryClient]);

  const pollSyncStatus = useCallback(async (syncId: string) => {
    const pollInterval = setInterval(async () => {
      try {
        const { data: syncLogs, error } = await supabase
          .from('zoom_sync_logs')
          .select('*')
          .eq('id', syncId)
          .single();

        if (error) {
          console.error('Error polling sync status:', error);
          return;
        }

        if (syncLogs) {
          const progress = syncLogs.total_items > 0 
            ? Math.round((syncLogs.processed_items / syncLogs.total_items) * 100)
            : 0;
          
          setSyncProgress(progress);
          setCurrentOperation(
            syncLogs.sync_status === 'in_progress' 
              ? `Processing ${syncLogs.processed_items}/${syncLogs.total_items} webinars...`
              : syncLogs.sync_status
          );

          if (syncLogs.sync_status === 'completed') {
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
            clearInterval(pollInterval);
            setIsSyncing(false);
            setSyncProgress(0);
            setCurrentOperation('');
            
            const errorDetails = syncLogs.error_details || {};
            if (errorDetails.isAuthError) {
              toast({
                title: "Authentication Failed During Sync",
                description: syncLogs.error_message || "Your Zoom authentication expired. Please reconnect your account.",
                variant: "destructive",
                action: (
                  <Button asChild variant="secondary" size="sm">
                    <Link to="/settings">Go to Settings</Link>
                  </Button>
                ),
              });
            } else {
              toast({
                title: "Sync Failed",
                description: syncLogs.error_message || "Unknown error occurred during sync",
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
        setIsSyncing(false);
        setSyncProgress(0);
        setCurrentOperation('');
      }
    }, 5 * 60 * 1000);
  }, [isSyncing, queryClient, toast]);

  return {
    startSync,
    isSyncing,
    syncProgress,
    currentOperation,
  };
};
