
import { useState, useCallback } from 'react';
import { zoomSyncOrchestrator } from '@/services/zoom/sync/ZoomSyncOrchestrator';
import { SyncPriority } from '@/services/zoom/sync';
import { useToast } from '@/hooks/use-toast';
import { useZoomConnection } from '@/hooks/useZoomConnection';

export const useZoomSyncOrchestrator = () => {
  const { connection } = useZoomConnection();
  const { toast } = useToast();
  const [isStarting, setIsStarting] = useState(false);

  const startInitialSync = useCallback(async (options?: { batchSize?: number }) => {
    if (!connection?.id) {
      toast({
        title: "Connection Required",
        description: "Please connect your Zoom account first.",
        variant: "destructive",
      });
      return null;
    }

    setIsStarting(true);
    try {
      const operationId = await zoomSyncOrchestrator.startInitialSync(connection.id, options);
      
      toast({
        title: "Initial Sync Started",
        description: "Beginning full synchronization of your webinar data.",
      });
      
      return operationId;
    } catch (error) {
      toast({
        title: "Sync Failed to Start",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive",
      });
      return null;
    } finally {
      setIsStarting(false);
    }
  }, [connection?.id, toast]);

  const startIncrementalSync = useCallback(async () => {
    if (!connection?.id) {
      toast({
        title: "Connection Required",
        description: "Please connect your Zoom account first.",
        variant: "destructive",
      });
      return null;
    }

    setIsStarting(true);
    try {
      const operationId = await zoomSyncOrchestrator.startIncrementalSync(connection.id);
      
      toast({
        title: "Incremental Sync Started",
        description: "Syncing recent changes to your webinar data.",
      });
      
      return operationId;
    } catch (error) {
      toast({
        title: "Sync Failed to Start",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive",
      });
      return null;
    } finally {
      setIsStarting(false);
    }
  }, [connection?.id, toast]);

  const syncSingleWebinar = useCallback(async (webinarId: string) => {
    if (!connection?.id) {
      toast({
        title: "Connection Required",
        description: "Please connect your Zoom account first.",
        variant: "destructive",
      });
      return null;
    }

    setIsStarting(true);
    try {
      const operationId = await zoomSyncOrchestrator.syncSingleWebinar(webinarId, connection.id);
      
      toast({
        title: "Webinar Sync Started",
        description: "Syncing detailed data for the selected webinar.",
      });
      
      return operationId;
    } catch (error) {
      toast({
        title: "Sync Failed to Start",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive",
      });
      return null;
    } finally {
      setIsStarting(false);
    }
  }, [connection?.id, toast]);

  const cancelSync = useCallback(async (operationId: string) => {
    try {
      await zoomSyncOrchestrator.cancelSync(operationId);
      
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
  }, [toast]);

  const getSyncStatus = useCallback(async () => {
    return await zoomSyncOrchestrator.getSyncStatus();
  }, []);

  return {
    startInitialSync,
    startIncrementalSync,
    syncSingleWebinar,
    cancelSync,
    getSyncStatus,
    isStarting,
    isConnected: !!connection,
  };
};
