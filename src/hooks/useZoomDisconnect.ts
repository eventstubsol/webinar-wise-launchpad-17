
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { ZoomConnectionService } from '@/services/zoom/ZoomConnectionService';
import { ZoomConnection } from '@/types/zoom';

export const useZoomDisconnect = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const disconnectMutation = useMutation({
    mutationFn: async (connection: ZoomConnection) => {
      const success = await ZoomConnectionService.deleteConnection(connection.id);
      if (!success) {
        throw new Error('Failed to disconnect Zoom account');
      }
      return true;
    },
    onSuccess: () => {
      // Invalidate and refetch connection data
      queryClient.invalidateQueries({ queryKey: ['zoom-connection'] });
      queryClient.invalidateQueries({ queryKey: ['zoom-credentials'] });
      
      toast({
        title: "Disconnected",
        description: "Your Zoom account has been disconnected successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Disconnect Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleDisconnect = (connection: ZoomConnection) => {
    disconnectMutation.mutate(connection);
  };

  return {
    handleDisconnect,
    isDisconnecting: disconnectMutation.isPending,
  };
};
