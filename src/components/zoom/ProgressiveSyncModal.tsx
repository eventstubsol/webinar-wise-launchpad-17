import React, { useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle2, AlertCircle, Loader2, Play } from 'lucide-react';
import { useProgressiveZoomSync } from '@/hooks/useProgressiveZoomSync';
import { useZoomConnection } from '@/hooks/useZoomConnection';

interface ProgressiveSyncModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function ProgressiveSyncModal({ 
  open, 
  onOpenChange,
  onSuccess 
}: ProgressiveSyncModalProps) {
  const { connection } = useZoomConnection();
  const { 
    isSyncing, 
    syncProgress, 
    startSync, 
    subscribeSyncProgress,
    resetProgress 
  } = useProgressiveZoomSync(connection?.id);

  useEffect(() => {
    if (open && connection?.id) {
      const unsubscribe = subscribeSyncProgress();
      return () => {
        unsubscribe.then(unsub => unsub?.());
      };
    }
  }, [open, connection?.id, subscribeSyncProgress]);

  useEffect(() => {
    if (!open) {
      // Reset progress when modal closes
      setTimeout(resetProgress, 300);
    }
  }, [open, resetProgress]);

  const handleStartSync = async () => {
    await startSync();
    
    if (syncProgress?.status === 'completed') {
      onSuccess?.();
      setTimeout(() => {
        onOpenChange(false);
      }, 2000);
    }
  };

  const getProgressPercentage = () => {
    if (!syncProgress || syncProgress.total_webinars === 0) return 0;
    return Math.round((syncProgress.synced_webinars / syncProgress.total_webinars) * 100);
  };

  const getStatusIcon = () => {
    if (!syncProgress) return <Play className="w-5 h-5" />;
    
    switch (syncProgress.status) {
      case 'running':
        return <Loader2 className="w-5 h-5 animate-spin" />;
      case 'completed':
        return <CheckCircle2 className="w-5 h-5 text-green-600" />;
      case 'failed':
        return <AlertCircle className="w-5 h-5 text-red-600" />;
      default:
        return <Play className="w-5 h-5" />;
    }
  };

  const getStatusColor = () => {
    if (!syncProgress) return 'blue';
    
    switch (syncProgress.status) {
      case 'running':
        return 'blue';
      case 'completed':
        return 'green';
      case 'failed':
        return 'red';
      default:
        return 'blue';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Sync Zoom Webinars</DialogTitle>
          <DialogDescription>
            Fetch all your past and upcoming webinars from Zoom
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Sync Status */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {getStatusIcon()}
              <span className="font-medium">
                {syncProgress?.status === 'running' && 'Syncing...'}
                {syncProgress?.status === 'completed' && 'Sync Completed'}
                {syncProgress?.status === 'failed' && 'Sync Failed'}
                {!syncProgress && 'Ready to Sync'}
              </span>
            </div>
            
            {syncProgress && (
              <span className="text-sm text-gray-500">
                {syncProgress.synced_webinars} / {syncProgress.total_webinars} webinars
              </span>
            )}
          </div>

          {/* Progress Bar */}
          {syncProgress && syncProgress.status === 'running' && (
            <div className="space-y-2">
              <Progress value={getProgressPercentage()} className="h-2" />
              <p className="text-sm text-gray-600 text-center">
                {getProgressPercentage()}% Complete
              </p>
            </div>
          )}

          {/* Status Message */}
          {syncProgress && (
            <Alert className={`border-${getStatusColor()}-200 bg-${getStatusColor()}-50`}>
              <AlertDescription className="text-sm">
                {syncProgress.message}
              </AlertDescription>
            </Alert>
          )}

          {/* Detailed Progress Info */}
          {syncProgress && syncProgress.status === 'running' && (
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="space-y-1">
                <p className="text-gray-500">Total Pages</p>
                <p className="font-medium">{syncProgress.total_pages}</p>
              </div>
              <div className="space-y-1">
                <p className="text-gray-500">Current Page</p>
                <p className="font-medium">{syncProgress.current_page}</p>
              </div>
              <div className="space-y-1">
                <p className="text-gray-500">Total Webinars</p>
                <p className="font-medium">{syncProgress.total_webinars}</p>
              </div>
              <div className="space-y-1">
                <p className="text-gray-500">Synced Webinars</p>
                <p className="font-medium">{syncProgress.synced_webinars}</p>
              </div>
            </div>
          )}

          {/* Success Message */}
          {syncProgress?.status === 'completed' && (
            <div className="text-center py-4">
              <CheckCircle2 className="w-12 h-12 text-green-600 mx-auto mb-2" />
              <p className="text-lg font-medium text-green-600">
                Successfully synced {syncProgress.synced_webinars} webinars!
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end gap-2 pt-4">
            {(!syncProgress || syncProgress.status === 'failed') && (
              <>
                <Button
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  disabled={isSyncing}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleStartSync}
                  disabled={isSyncing}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {isSyncing ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Starting...
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4 mr-2" />
                      Start Sync
                    </>
                  )}
                </Button>
              </>
            )}
            
            {syncProgress?.status === 'completed' && (
              <Button
                onClick={() => onOpenChange(false)}
                className="bg-green-600 hover:bg-green-700"
              >
                Done
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}