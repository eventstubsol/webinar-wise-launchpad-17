
import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { ZoomConnectionService } from '@/services/zoom/ZoomConnectionService';
import { PaginationTokenService } from '@/services/zoom/utils/PaginationTokenService';
import { useZoomConnection } from './useZoomConnection';

export const useZoomSyncOrchestrator = () => {
  const [isStarting, setIsStarting] = useState(false);
  const { toast } = useToast();
  const { connection } = useZoomConnection();

  const startInitialSync = async () => {
    if (!connection) {
      throw new Error('No active Zoom connection found');
    }

    setIsStarting(true);
    try {
      // Clean up expired tokens before starting sync
      await PaginationTokenService.cleanupExpiredTokens();
      
      const result = await ZoomConnectionService.startInitialSync(connection.id);
      
      toast({
        title: "Sync Started",
        description: "Enhanced pagination system is now synchronizing your webinar data.",
      });
      
      return result;
    } finally {
      setIsStarting(false);
    }
  };

  const startIncrementalSync = async () => {
    if (!connection) {
      throw new Error('No active Zoom connection found');
    }

    setIsStarting(true);
    try {
      // Clean up expired tokens before starting sync
      await PaginationTokenService.cleanupExpiredTokens();
      
      const result = await ZoomConnectionService.startIncrementalSync(connection.id);
      
      toast({
        title: "Incremental Sync Started",
        description: "Using enhanced pagination for optimal performance.",
      });
      
      return result;
    } finally {
      setIsStarting(false);
    }
  };

  return {
    startInitialSync,
    startIncrementalSync,
    isStarting,
  };
};
