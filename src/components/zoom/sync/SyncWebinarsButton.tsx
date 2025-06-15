
import React from 'react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { RefreshCw, Download } from 'lucide-react';
import { useZoomSync } from '@/hooks/useZoomSync';

interface SyncWebinarsButtonProps {
  connectionId?: string;
  variant?: 'default' | 'outline' | 'secondary';
  size?: 'default' | 'sm' | 'lg';
  showProgress?: boolean;
}

export const SyncWebinarsButton: React.FC<SyncWebinarsButtonProps> = ({
  connectionId,
  variant = 'default',
  size = 'default',
  showProgress = true,
}) => {
  const { startSync, isSyncing, syncProgress, currentOperation } = useZoomSync(connectionId);

  const handleSync = () => {
    startSync('incremental');
  };

  const handleFullSync = () => {
    startSync('initial');
  };

  if (isSyncing && showProgress) {
    return (
      <div className="space-y-2 min-w-48">
        <div className="flex items-center gap-2">
          <RefreshCw className="h-4 w-4 animate-spin" />
          <span className="text-sm font-medium">Syncing...</span>
          <span className="text-sm text-muted-foreground">{syncProgress}%</span>
        </div>
        <Progress value={syncProgress} className="h-2" />
        {currentOperation && (
          <p className="text-xs text-muted-foreground truncate">{currentOperation}</p>
        )}
      </div>
    );
  }

  return (
    <div className="flex gap-2">
      <Button
        variant={variant}
        size={size}
        onClick={handleSync}
        disabled={isSyncing || !connectionId}
        className="flex items-center gap-2"
      >
        <RefreshCw className={`h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
        Sync Webinars
      </Button>
      <Button
        variant="outline"
        size={size}
        onClick={handleFullSync}
        disabled={isSyncing || !connectionId}
        className="flex items-center gap-2"
      >
        <Download className="h-4 w-4" />
        Full Sync
      </Button>
    </div>
  );
};
