
import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { ZoomConnectionService } from '@/services/zoom/ZoomConnectionService';
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
      const result = await ZoomConnectionService.startInitialSync(connection.id);
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
      const result = await ZoomConnectionService.startIncrementalSync(connection.id);
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
