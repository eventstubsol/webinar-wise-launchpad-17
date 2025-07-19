
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { 
  RefreshCw, 
  Play, 
  Square, 
  CheckCircle, 
  XCircle, 
  Clock,
  Activity 
} from 'lucide-react';
import { useZoomConnection } from '@/hooks/useZoomConnection';
import { useZoomSync } from '@/hooks/useZoomSync';
import { SyncType } from '@/types/zoom';

interface RealTimeSyncProgressProps {
  onSyncComplete?: () => void;
}

export const RealTimeSyncProgress: React.FC<RealTimeSyncProgressProps> = ({
  onSyncComplete,
}) => {
  const { connection } = useZoomConnection();
  const { 
    startSync, 
    cancelSync,
    isSyncing, 
    syncProgress, 
    syncStatus, 
    currentOperation,
    activeSyncId,
    healthCheck 
  } = useZoomSync(connection);

  const getStatusIcon = () => {
    switch (syncStatus) {
      case 'syncing':
        return <RefreshCw className="h-5 w-5 animate-spin text-blue-600" />;
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'failed':
        return <XCircle className="h-5 w-5 text-red-600" />;
      case 'idle':
        return <Clock className="h-5 w-5 text-orange-600" />;
      default:
        return <Activity className="h-5 w-5 text-gray-400" />;
    }
  };

  const getStatusBadge = () => {
    switch (syncStatus) {
      case 'syncing':
        return <Badge variant="default">Syncing</Badge>;
      case 'completed':
        return <Badge variant="secondary" className="bg-green-100 text-green-800">Completed</Badge>;
      case 'failed':
        return <Badge variant="destructive">Failed</Badge>;
      case 'idle':
        return <Badge variant="secondary" className="bg-orange-100 text-orange-800">Pending</Badge>;
      default:
        return <Badge variant="outline">Idle</Badge>;
    }
  };

  const handleStartSync = async (syncType: SyncType) => {
    try {
      await startSync(syncType);
    } catch (error) {
      console.error('Failed to start sync:', error);
    }
  };

  const handleCancelSync = async () => {
    try {
      await cancelSync();
    } catch (error) {
      console.error('Failed to cancel sync:', error);
    }
  };

  const isServiceAvailable = healthCheck?.success;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {getStatusIcon()}
            Real-time Sync Progress
          </div>
          {getStatusBadge()}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Service Status */}
          {!isServiceAvailable && (
            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-center gap-2 text-yellow-800">
                <Clock className="h-4 w-4" />
                <span className="text-sm">
                  Sync service is currently unavailable. Please try again later.
                </span>
              </div>
            </div>
          )}

          {/* Connection Status */}
          {!connection && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="text-blue-800 text-sm">
                Please connect your Zoom account to start syncing webinar data.
              </div>
            </div>
          )}

          {/* Progress Section */}
          {isSyncing && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Progress</span>
                <span className="text-sm text-muted-foreground">{syncProgress}%</span>
              </div>
              <Progress value={syncProgress} className="w-full" />
              
              {currentOperation && (
                <div className="text-sm text-muted-foreground">
                  {currentOperation}
                </div>
              )}

              {activeSyncId && (
                <div className="text-xs text-muted-foreground">
                  Sync ID: {activeSyncId}
                </div>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            {!isSyncing ? (
              <>
                <Button 
                  onClick={() => handleStartSync(SyncType.INCREMENTAL)}
                  disabled={!connection || !isServiceAvailable}
                  size="sm"
                >
                  <Play className="h-4 w-4 mr-2" />
                  Quick Sync
                </Button>
                
                <Button 
                  onClick={() => handleStartSync(SyncType.INITIAL)}
                  disabled={!connection || !isServiceAvailable}
                  variant="outline"
                  size="sm"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Full Sync
                </Button>
              </>
            ) : (
              <Button 
                onClick={handleCancelSync}
                variant="destructive"
                size="sm"
              >
                <Square className="h-4 w-4 mr-2" />
                Cancel Sync
              </Button>
            )}
          </div>

          {/* Status Messages */}
          {syncStatus === 'completed' && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
              <div className="text-green-800 text-sm">
                Sync completed successfully! Your webinar data is up to date.
              </div>
            </div>
          )}

          {syncStatus === 'failed' && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <div className="text-red-800 text-sm">
                Sync failed. Please check your connection and try again.
              </div>
            </div>
          )}

          {syncStatus === 'idle' && !isSyncing && (
            <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
              <div className="text-gray-800 text-sm">
                Ready to sync. Click a sync button to start.
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
