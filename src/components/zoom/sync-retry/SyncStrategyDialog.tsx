
import React from 'react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Users, Info, RefreshCw } from 'lucide-react';
import { SyncStatusIcon } from './SyncStatusIcon';
import type { SyncStrategy } from './types';

interface SyncStrategyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  strategy: SyncStrategy | null;
  isSyncing: boolean;
  onExecuteSync: (strategy: SyncStrategy) => void;
}

export const SyncStrategyDialog: React.FC<SyncStrategyDialogProps> = ({
  open,
  onOpenChange,
  strategy,
  isSyncing,
  onExecuteSync
}) => {
  if (!strategy) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-blue-500" />
            Smart Sync Strategy
          </DialogTitle>
          <DialogDescription>
            {strategy.description}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              <strong>Sync Type:</strong> {strategy.syncType.replace('_', ' ')}
              <br />
              <strong>Webinars:</strong> {strategy.webinars.length}
              {strategy.webinarIds && (
                <>
                  <br />
                  <strong>Specific webinar IDs:</strong> {strategy.webinarIds.length} webinars
                </>
              )}
            </AlertDescription>
          </Alert>

          <div className="max-h-60 overflow-y-auto">
            <h4 className="font-medium mb-2">Webinars to be processed:</h4>
            <div className="space-y-2">
              {strategy.webinars.slice(0, 10).map(webinar => (
                <div key={webinar.id} className="flex items-center justify-between p-2 border rounded text-sm">
                  <div className="flex-1 truncate">
                    <div className="font-medium truncate">{webinar.topic}</div>
                    <div className="text-muted-foreground text-xs">
                      Status: {webinar.status} | Sync: {webinar.participant_sync_status || 'none'}
                    </div>
                  </div>
                  <div className="ml-2">
                    <SyncStatusIcon status={webinar.participant_sync_status || 'none'} />
                  </div>
                </div>
              ))}
              {strategy.webinars.length > 10 && (
                <div className="text-sm text-muted-foreground text-center py-2">
                  ... and {strategy.webinars.length - 10} more webinars
                </div>
              )}
            </div>
          </div>

          {strategy.syncType === 'incremental' && strategy.webinars.some(w => w.status === 'scheduled') && (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                <strong>Note:</strong> Scheduled webinars don't have participants yet. 
                This sync will refresh webinar data and check for any that have finished since last sync.
              </AlertDescription>
            </Alert>
          )}
        </div>
        
        <DialogFooter>
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)}
            disabled={isSyncing}
          >
            Cancel
          </Button>
          <Button 
            onClick={() => onExecuteSync(strategy)}
            disabled={isSyncing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isSyncing ? 'animate-spin' : ''}`} />
            {isSyncing ? 'Syncing...' : 'Execute Sync'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
