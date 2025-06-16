
import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { ZoomConnectionService } from '@/services/zoom/ZoomConnectionService';
import { ZoomConnection } from '@/types/zoom';

export const useZoomDisconnect = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDisconnecting, setIsDisconnecting] = useState(false);

  const handleDisconnect = async (connection: ZoomConnection) => {
    if (!window.confirm('Are you sure you want to disconnect your Zoom account? This will stop all data syncing.')) {
      return false;
    }

    setIsDisconnecting(true);
    
    try {
      const success = await ZoomConnectionService.deleteConnection(connection.id);
      
      if (success) {
        // Invalidate all related queries
        queryClient.invalidateQueries({ queryKey: ['zoom-connection'] });
        queryClient.invalidateQueries({ queryKey: ['zoom-credentials'] });
        
        toast({
          title: "Disconnected",
          description: "Your Zoom account has been disconnected successfully.",
        });
        
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Error disconnecting:', error);
      toast({
        title: "Error",
        description: "Failed to disconnect Zoom account. Please try again.",
        variant: "destructive",
      });
      return false;
    } finally {
      setIsDisconnecting(false);
    }
  };

  return {
    handleDisconnect,
    isDisconnecting,
  };
};
