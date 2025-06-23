import { useState } from "react";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useZoomConnection } from "@/hooks/useZoomConnection";
import { useQueryClient } from "@tanstack/react-query";
import { SyncProgressModal } from "./SyncProgressModal";
import { SyncConfiguration, SyncConfig } from "./SyncConfiguration";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface EnhancedZoomSyncButtonProps {
  onSyncComplete?: () => void;
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm" | "lg";
  showLabel?: boolean;
}

export function EnhancedZoomSyncButton({
  onSyncComplete,
  variant = "default",
  size = "default",
  showLabel = true
}: EnhancedZoomSyncButtonProps) {
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncId, setSyncId] = useState<string | null>(null);
  const [showProgress, setShowProgress] = useState(false);
  
  const { connection } = useZoomConnection();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const handleStartSync = async (config: SyncConfig) => {
    if (!connection?.id) {
      toast({
        title: "No Connection",
        description: "Please connect your Zoom account first",
        variant: "destructive"
      });
      return;
    }

    setIsSyncing(true);
    setIsConfigOpen(false);

    try {
      // Always use the v2 edge function with improved error handling
      const response = await supabase.functions.invoke('zoom-sync-webinars-v2', {
        body: {
          connectionId: connection.id,
          syncMode: config.syncMode === 'smart' ? 'full' : config.syncMode, // Convert smart to full
          dateRange: config.dateRange
        }
      });

      if (response.error) {
        // Check if it's a function not found error
        if (response.error.message?.includes('not found')) {
          toast({
            title: "Edge Function Not Found",
            description: "Please deploy the zoom-sync-webinars-v2 edge function",
            variant: "destructive"
          });
        } else {
          throw response.error;
        }
      }

      const { syncId: newSyncId } = response.data || {};
      if (newSyncId) {
        setSyncId(newSyncId);
        setShowProgress(true);

        toast({
          title: "Sync Started",
          description: "Your webinar data is being synced from Zoom"
        });
      } else {
        throw new Error("No sync ID returned");
      }

    } catch (error: any) {
      console.error('Sync error:', error);
      toast({
        title: "Sync Failed",
        description: error.message || "Failed to start sync process",
        variant: "destructive"
      });
      setIsSyncing(false);
    }
  };

  const handleSyncComplete = () => {
    setIsSyncing(false);
    setSyncId(null);
    
    // Invalidate relevant queries
    queryClient.invalidateQueries({ queryKey: ['zoom-webinars'] });
    queryClient.invalidateQueries({ queryKey: ['zoom-sync-history'] });
    queryClient.invalidateQueries({ queryKey: ['zoom-sync-analytics'] });
    queryClient.invalidateQueries({ queryKey: ['webinar-statistics'] });
    
    toast({
      title: "Sync Completed",
      description: "Your webinar data has been successfully synced",
    });

    if (onSyncComplete) {
      onSyncComplete();
    }
  };

  const handleProgressClose = () => {
    setShowProgress(false);
    if (!isSyncing) {
      setSyncId(null);
    }
  };

  return (
    <>
      <Button
        variant={variant}
        size={size}
        onClick={() => setIsConfigOpen(true)}
        disabled={isSyncing || !connection}
        title={!connection ? "Please connect your Zoom account first" : "Sync webinars from Zoom"}
      >
        <RefreshCw className={`h-4 w-4 ${showLabel ? 'mr-2' : ''} ${isSyncing ? 'animate-spin' : ''}`} />
        {showLabel && (isSyncing ? 'Syncing...' : 'Sync Webinars')}
      </Button>

      {/* Sync Configuration Dialog */}
      <Dialog open={isConfigOpen} onOpenChange={setIsConfigOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Sync Webinars from Zoom</DialogTitle>
            <DialogDescription>
              Choose how you want to sync your webinar data. This is a manual process triggered only when you click the sync button.
            </DialogDescription>
          </DialogHeader>
          <SyncConfiguration
            onStartSync={handleStartSync}
            isLoading={isSyncing}
          />
        </DialogContent>
      </Dialog>

      {/* Progress Modal */}
      {syncId && (
        <SyncProgressModal
          syncId={syncId}
          isOpen={showProgress}
          onClose={handleProgressClose}
          onComplete={handleSyncComplete}
        />
      )}
    </>
  );
}
