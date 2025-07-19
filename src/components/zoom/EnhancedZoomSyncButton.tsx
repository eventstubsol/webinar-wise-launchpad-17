
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { RefreshCw, X } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { useZoomConnection } from "@/hooks/useZoomConnection";
import { useZoomSync } from "@/hooks/useZoomSync";
import { useQueryClient } from "@tanstack/react-query";
import { SyncConfiguration, SyncConfig } from "./SyncConfiguration";
import { SyncType } from "@/types/zoom";
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
  
  const { connection } = useZoomConnection();
  const { startSync, cancelSync, isSyncing, syncProgress, currentOperation } = useZoomSync(connection);
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

    setIsConfigOpen(false);

    try {
      // Convert config to sync type
      const syncType = config.syncMode === 'full' ? SyncType.INITIAL : SyncType.INCREMENTAL;
      await startSync(syncType);
    } catch (error: any) {
      console.error('Sync error:', error);
      toast({
        title: "Sync Failed",
        description: error.message || "Failed to start sync process",
        variant: "destructive"
      });
    }
  };

  const handleSyncComplete = () => {
    // Invalidate relevant queries
    queryClient.invalidateQueries({ queryKey: ['zoom-webinars'] });
    queryClient.invalidateQueries({ queryKey: ['zoom-sync-history'] });
    queryClient.invalidateQueries({ queryKey: ['zoom-sync-analytics'] });
    queryClient.invalidateQueries({ queryKey: ['webinar-statistics'] });
    
    if (onSyncComplete) {
      onSyncComplete();
    }
  };

  const handleCancelSync = async () => {
    try {
      await cancelSync();
    } catch (error) {
      console.error('Cancel sync error:', error);
    }
  };

  const getButtonContent = () => {
    if (isSyncing) {
      return (
        <>
          <div className="flex items-center gap-2">
            <RefreshCw className={`h-4 w-4 animate-spin`} />
            {showLabel && (
              <span className="flex items-center gap-2">
                Syncing... {syncProgress > 0 && `${syncProgress}%`}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCancelSync}
                  className="h-6 w-6 p-0 hover:bg-red-100"
                >
                  <X className="h-3 w-3" />
                </Button>
              </span>
            )}
          </div>
        </>
      );
    }

    return (
      <>
        <RefreshCw className={`h-4 w-4 ${showLabel ? 'mr-2' : ''}`} />
        {showLabel && 'Sync Webinars'}
      </>
    );
  };

  return (
    <>
      <Button
        variant={variant}
        size={size}
        onClick={() => setIsConfigOpen(true)}
        disabled={!connection}
        title={!connection ? "Please connect your Zoom account first" : "Sync webinars from Zoom"}
        className="flex items-center gap-2"
      >
        {getButtonContent()}
      </Button>

      {/* Progress display for syncing */}
      {isSyncing && currentOperation && showLabel && (
        <div className="text-xs text-muted-foreground mt-1">
          {currentOperation}
        </div>
      )}

      {/* Sync Configuration Dialog */}
      <Dialog open={isConfigOpen} onOpenChange={setIsConfigOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Sync Webinars from Zoom</DialogTitle>
            <DialogDescription>
              Choose how you want to sync your webinar data. This process fetches data directly from Zoom's API.
            </DialogDescription>
          </DialogHeader>
          <SyncConfiguration
            onStartSync={handleStartSync}
            isLoading={false}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
