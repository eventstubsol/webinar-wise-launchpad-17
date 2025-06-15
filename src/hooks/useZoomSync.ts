
import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';

export const useZoomSync = (connectionId?: string) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState(0);
  const [currentOperation, setCurrentOperation] = useState<string>('');

  const startSync = useCallback(async (syncType: 'initial' | 'incremental' = 'incremental') => {
    if (!user || !connectionId) {
      toast({
        title: "Authentication Required",
        description: "Please connect your Zoom account first.",
        variant: "destructive",
      });
      return;
    }

    setIsSyncing(true);
    setSyncProgress(0);
    setCurrentOperation('Starting sync...');

    try {
      const { data, error } = await supabase.functions.invoke('zoom-sync-webinars', {
        body: {
          connectionId,
          syncType,
        },
      });

      if (error) {
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
      
      toast({
        title: "Sync Failed",
        description: errorMessage,
        variant: "destructive",
      });
    }
  }, [user, connectionId, toast]);

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
