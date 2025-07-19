
import React from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle, 
  AlertDialogTrigger 
} from '@/components/ui/alert-dialog';
import { ZoomConnection } from '@/types/zoom';
import { ZoomConnectionService } from '@/services/zoom/ZoomConnectionService';
import { useToast } from '@/hooks/use-toast';
import { Unlink } from 'lucide-react';

interface DisconnectSectionProps {
  connection: ZoomConnection;
}

export const DisconnectSection: React.FC<DisconnectSectionProps> = ({ connection }) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Disconnect mutation
  const disconnectMutation = useMutation({
    mutationFn: async () => {
      const success = await ZoomConnectionService.deleteConnection(connection.id);
      if (!success) {
        throw new Error('Failed to disconnect');
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

  return (
    <div className="pt-4 border-t">
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button variant="destructive" size="sm">
            <Unlink className="h-4 w-4 mr-2" />
            Disconnect Account
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Disconnect Zoom Account?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the connection to your Zoom account. You'll need to reconnect 
              to continue syncing webinar data. Your existing data will be preserved.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => disconnectMutation.mutate()}
              disabled={disconnectMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {disconnectMutation.isPending ? 'Disconnecting...' : 'Disconnect'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
