
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  RefreshCw, 
  Play, 
  Square, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle,
  Clock,
  Zap,
  RotateCcw
} from 'lucide-react';
import { useZoomSync } from '@/hooks/useZoomSync';
import { useZoomConnection } from '@/hooks/useZoomConnection';
import { SyncType } from '@/types/zoom';

export function ZoomSyncCard() {
  const { connection } = useZoomConnection();
  const syncData = useZoomSync(connection);
  const {
    isSyncing,
    syncProgress,
    syncStatus,
    currentOperation,
    syncMode,
    startSync,
    cancelSync,
    testApiConnection,
  } = syncData;

  const stuckSyncDetected = (syncData as any).stuckSyncDetected || false;
  const forceResetAndRestart = (syncData as any).forceResetAndRestart || (() => {});

  const getSyncStatusInfo = () => {
    if (stuckSyncDetected) {
      return {
        icon: AlertTriangle,
        label: 'Stuck',
        variant: 'destructive' as const,
        color: 'text-red-600',
        description: 'Sync appears to be stuck - use Force Reset'
      };
    }

    if (isSyncing) {
      return {
        icon: RefreshCw,
        label: 'Syncing',
        variant: 'default' as const,
        color: 'text-blue-600',
        description: currentOperation || 'Processing...'
      };
    }

    switch (syncStatus) {
      case 'completed':
        return {
          icon: CheckCircle2,
          label: 'Completed',
          variant: 'default' as const,
          color: 'text-green-600',
          description: 'Last sync completed successfully'
        };
      case 'failed':
        return {
          icon: XCircle,
          label: 'Failed',
          variant: 'destructive' as const,
          color: 'text-red-600',
          description: 'Last sync encountered an error'
        };
      default:
        return {
          icon: Clock,
          label: 'Ready',
          variant: 'outline' as const,
          color: 'text-gray-600',
          description: 'Ready to sync webinar data'
        };
    }
  };

  const statusInfo = getSyncStatusInfo();
  const StatusIcon = statusInfo.icon;

  const handleStartSync = () => {
    startSync(SyncType.MANUAL);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Enhanced Sync Status</span>
          <div className="flex items-center gap-2">
            {syncMode && (
              <Badge variant="outline" className="text-xs">
                {syncMode === 'render' ? 'Cloud' : 'Direct'}
              </Badge>
            )}
            <Badge variant={statusInfo.variant} className="flex items-center gap-1">
              <StatusIcon className={`w-3 h-3 ${isSyncing && !stuckSyncDetected ? 'animate-spin' : ''}`} />
              {statusInfo.label}
            </Badge>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Stuck Sync Alert */}
        {stuckSyncDetected && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Sync appears to be stuck due to communication issues. Use the Force Reset option to recover.
            </AlertDescription>
          </Alert>
        )}

        {/* Sync Progress */}
        {(isSyncing || stuckSyncDetected) && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>Progress</span>
              <span>{syncProgress}%</span>
            </div>
            <Progress 
              value={syncProgress} 
              className={`h-2 ${stuckSyncDetected ? 'opacity-50' : ''}`} 
            />
            <p className={`text-sm ${stuckSyncDetected ? 'text-red-600' : 'text-gray-600'}`}>
              {currentOperation}
            </p>
          </div>
        )}

        {/* Status Description */}
        {!isSyncing && !stuckSyncDetected && (
          <p className="text-sm text-gray-600">{statusInfo.description}</p>
        )}

        <Separator />

        {/* Action Buttons */}
        <div className="space-y-2">
          {/* Primary Actions */}
          <div className="flex gap-2">
            {!isSyncing && !stuckSyncDetected ? (
              <Button 
                onClick={handleStartSync} 
                disabled={!connection}
                className="flex-1"
              >
                <Play className="w-4 h-4 mr-2" />
                Start Enhanced Sync
              </Button>
            ) : (
              <div className="flex gap-2 w-full">
                {!stuckSyncDetected && (
                  <Button 
                    onClick={cancelSync} 
                    variant="outline"
                    className="flex-1"
                  >
                    <Square className="w-4 h-4 mr-2" />
                    Cancel
                  </Button>
                )}
                
                {stuckSyncDetected && (
                  <Button 
                    onClick={forceResetAndRestart}
                    variant="destructive"
                    className="flex-1"
                  >
                    <RotateCcw className="w-4 h-4 mr-2" />
                    Force Reset & Restart
                  </Button>
                )}
              </div>
            )}
          </div>

          {/* Diagnostic Info */}
          {(isSyncing || stuckSyncDetected) && (
            <div className="text-xs text-gray-500 bg-gray-50 p-2 rounded">
              <div className="flex justify-between">
                <span>Sync Mode:</span>
                <span>{syncMode || 'Detecting...'}</span>
              </div>
              <div className="flex justify-between">
                <span>Heartbeat:</span>
                <span>{isSyncing ? 'Active' : 'Stopped'}</span>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
