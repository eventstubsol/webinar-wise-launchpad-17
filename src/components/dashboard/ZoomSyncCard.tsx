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
  RotateCcw,
  StopCircle,
  TestTube
} from 'lucide-react';
import { useZoomSync } from '@/hooks/useZoomSync';
import { useZoomConnection } from '@/hooks/useZoomConnection';
import { SyncType } from '@/types/zoom';

// Diagnostics panel removed in favor of simplified unified sync

export function ZoomSyncCard() {
  const { connection } = useZoomConnection();
  const syncData = useZoomSync(connection);
  const {
    isSyncing,
    syncProgress,
    syncStatus,
    currentOperation,
    syncMode,
    syncError,
    fallbackMode,
    startSync,
    cancelSync,
    testConnection,
    forceResetAndRestart,
    stuckSyncDetected
  } = syncData;

  const getSyncStatusInfo = () => {
    if (stuckSyncDetected) {
      return {
        icon: AlertTriangle,
        label: 'Stuck',
        variant: 'destructive' as const,
        color: 'text-red-600',
        description: 'Sync appears to be stuck - use Force Cancel or Reset'
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
            {fallbackMode && (
              <Badge variant="secondary" className="text-xs">
                Fallback Mode
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
        {/* Error Alert */}
        {syncError && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-2">
                <p className="font-medium">Sync Error:</p>
                <p className="text-sm">{syncError}</p>
                {syncError.includes('Connection test failed') && (
                  <p className="text-sm">
                    Try testing your connection or switching to direct sync mode.
                  </p>
                )}
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Stuck Sync Alert */}
        {stuckSyncDetected && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-2">
                <p className="font-medium">Sync Stuck Detected</p>
                <p className="text-sm">
                  The sync has been running for several minutes without progress. 
                  This usually indicates an issue with the Zoom API or network connectivity.
                </p>
                <div className="flex gap-2 mt-2">
                  <Button size="sm" variant="outline" onClick={testConnection}>
                    Test Connection
                  </Button>
                  <Button size="sm" variant="destructive" onClick={forceResetAndRestart}>
                    Force Reset & Restart
                  </Button>
                </div>
              </div>
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
              <>
                <Button 
                  onClick={handleStartSync} 
                  disabled={!connection}
                  className="flex-1"
                >
                  <Play className="w-4 h-4 mr-2" />
                  Start Enhanced Sync
                </Button>
                <Button 
                  onClick={testConnection}
                  variant="outline"
                  disabled={!connection}
                >
                  <TestTube className="w-4 h-4 mr-2" />
                  Test
                </Button>
              </>
            ) : (
              <div className="flex gap-2 w-full">
                <Button 
                  onClick={cancelSync} 
                  variant="outline"
                  className="flex-1"
                >
                  <Square className="w-4 h-4 mr-2" />
                  Cancel
                </Button>
                
                {stuckSyncDetected && (
                  <>
                    <Button 
                      onClick={forceResetAndRestart}
                      variant="destructive"
                      className="flex-1"
                    >
                      <RotateCcw className="w-4 h-4 mr-2" />
                      Force Reset
                    </Button>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Simplified unified sync - diagnostics integrated */}
        </div>

        {/* Diagnostic Info */}
        <div className="text-xs text-gray-500 bg-gray-50 p-2 rounded space-y-1">
          <div className="flex justify-between">
            <span>Sync Mode:</span>
            <span>{syncMode || 'Detecting...'}</span>
          </div>
          <div className="flex justify-between">
            <span>Backend:</span>
            <span>{fallbackMode ? 'Fallback Mode' : 'Unified Edge Functions'}</span>
          </div>
          <div className="flex justify-between">
            <span>Status:</span>
            <span className={stuckSyncDetected ? 'text-red-600 font-medium' : ''}>
              {stuckSyncDetected ? 'STUCK - Action Required' : 'Normal'}
            </span>
          </div>
          {syncError && (
            <div className="flex justify-between">
              <span>Last Error:</span>
              <span className="text-red-600 text-xs truncate ml-2">
                {syncError.substring(0, 50)}...
              </span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
