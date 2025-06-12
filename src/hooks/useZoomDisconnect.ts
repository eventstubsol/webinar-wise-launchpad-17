
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { ZoomConnectionService } from '@/services/zoom/ZoomConnectionService';
import { ZoomConnection } from '@/types/zoom';

export const useZoomDisconnect = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const handleDisconnect = async (connection: ZoomConnection | null) => {
    if (!connection) return;

    try {
      const success = await ZoomConnectionService.deleteConnection(connection.id);
      if (success) {
        queryClient.invalidateQueries({ queryKey: ['zoom-connection'] });
        toast({
          title: "Disconnected",
          description: "Your Zoom account has been disconnected.",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to disconnect Zoom account.",
        variant: "destructive",
      });
    }
  };

  return { handleDisconnect };
};
