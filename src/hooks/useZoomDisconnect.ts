
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { ZoomConnectionService } from '@/services/zoom/ZoomConnectionService';

export const useZoomDisconnect = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const disconnectMutation = useMutation({
    mutationFn: async (connectionId: string) => {
      const success = await ZoomConnectionService.deleteConnection(connectionId);
      if (!success) {
        throw new Error('Failed to disconnect Zoom account');
      }
      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['zoom-connection'] });
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

  return {
    disconnect: (connectionId: string) => disconnectMutation.mutate(connectionId),
    isDisconnecting: disconnectMutation.isPending,
  };
};
