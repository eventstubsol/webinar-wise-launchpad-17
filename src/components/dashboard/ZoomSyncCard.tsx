
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { 
  RefreshCw, 
  Play, 
  Square, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle,
  Clock,
  Zap
} from 'lucide-react';
import { useZoomSync } from '@/hooks/useZoomSync';
import { useZoomConnection } from '@/hooks/useZoomConnection';
import { SyncType } from '@/types/zoom';
import { SyncResetButton } from '@/components/zoom/sync/SyncResetButton';

export function ZoomSyncCard() {
  const { connection } = useZoomConnection();
  const {
    isSyncing,
    syncProgress,
    syncStatus,
    currentOperation,
    syncMode,
    startSync,
    cancelSync,
    forceCleanupStuckSyncs,
    healthCheck
  } = useZoomSync(connection);

  const getSyncStatusInfo = () => {
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
  const isRenderHealthy = healthCheck?.success ?? false;

  const handleStartSync = () => {
    startSync(SyncType.MANUAL);
  };

  const handleForceCleanup = () => {
    forceCleanupStuckSyncs();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Sync Status</span>
          <div className="flex items-center gap-2">
            {syncMode && (
              <Badge variant="outline" className="text-xs">
                {syncMode === 'render' ? 'Cloud' : 'Direct'}
              </Badge>
            )}
            <Badge variant={statusInfo.variant} className="flex items-center gap-1">
              <StatusIcon className={`w-3 h-3 ${isSyncing ? 'animate-spin' : ''}`} />
              {statusInfo.label}
            </Badge>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Service Health Indicator */}
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">Service Status</span>
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${isRenderHealthy ? 'bg-green-500' : 'bg-yellow-500'}`} />
            <span className={isRenderHealthy ? 'text-green-600' : 'text-yellow-600'}>
              {isRenderHealthy ? 'Healthy' : 'Starting'}
            </span>
          </div>
        </div>

        <Separator />

        {/* Sync Progress */}
        {isSyncing && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>Progress</span>
              <span>{syncProgress}%</span>
            </div>
            <Progress value={syncProgress} className="h-2" />
            <p className="text-sm text-gray-600">{currentOperation}</p>
          </div>
        )}

        {/* Status Description */}
        {!isSyncing && (
          <p className="text-sm text-gray-600">{statusInfo.description}</p>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2">
          {!isSyncing ? (
            <>
              <Button 
                onClick={handleStartSync} 
                disabled={!connection}
                className="flex-1"
              >
                <Play className="w-4 h-4 mr-2" />
                Start Sync
              </Button>
              
              {/* Force Cleanup Button - Always available when not syncing */}
              <Button 
                onClick={handleForceCleanup}
                variant="outline"
                size="sm"
                disabled={!connection}
                title="Clean up any stuck sync records"
              >
                <Zap className="w-4 h-4 mr-2" />
                Force Cleanup
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

              {/* Enhanced Reset Options */}
              <SyncResetButton 
                connectionId={connection?.id || ''}
                variant="force-cancel"
                size="sm"
              />
            </div>
          )}
        </div>

        {/* Enhanced Reset Controls */}
        {connection?.id && (
          <div className="pt-2 border-t">
            <div className="flex gap-2">
              <SyncResetButton 
                connectionId={connection.id}
                variant="reset-all"
                size="sm"
              />
            </div>
          </div>
        )}

        {/* Health Warning */}
        {!isRenderHealthy && (
          <div className="flex items-start gap-2 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
            <AlertTriangle className="w-4 h-4 text-yellow-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm">
              <p className="text-yellow-800 font-medium">Service Starting</p>
              <p className="text-yellow-700">
                The sync service is warming up. Syncs may take longer to start initially.
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
