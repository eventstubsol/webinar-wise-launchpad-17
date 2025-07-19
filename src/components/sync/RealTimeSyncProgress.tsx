
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { AlertCircle, CheckCircle, Clock, XCircle, Play, Square } from 'lucide-react';
import { useZoomSync } from '@/hooks/useZoomSync';
import { ZoomConnection, SyncType } from '@/types/zoom';

interface RealTimeSyncProgressProps {
  connection: ZoomConnection | null;
  onStartSync?: () => void;
  showControls?: boolean;
}

export const RealTimeSyncProgress: React.FC<RealTimeSyncProgressProps> = ({
  connection,
  onStartSync,
  showControls = true,
}) => {
  const {
    isSyncing,
    syncProgress,
    syncStatus,
    currentOperation,
    syncError,
    startSync,
    cancelSync,
    testConnection,
  } = useZoomSync(connection);

  const getStatusIcon = () => {
    switch (syncStatus) {
      case 'syncing':
        return <Clock className="w-5 h-5 text-blue-500 animate-pulse" />;
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'failed':
        return <XCircle className="w-5 h-5 text-red-500" />;
      default:
        return <AlertCircle className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStatusColor = () => {
    switch (syncStatus) {
      case 'syncing':
        return 'text-blue-600';
      case 'completed':
        return 'text-green-600';
      case 'failed':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  const handleStartSync = async () => {
    if (onStartSync) {
      onStartSync();
    } else {
      await startSync(SyncType.INCREMENTAL);
    }
  };

  if (!connection) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-gray-500">
            No Zoom connection available. Please connect your Zoom account first.
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {getStatusIcon()}
          <span>Sync Status</span>
          <span className={`text-sm font-normal ${getStatusColor()}`}>
            {syncStatus.charAt(0).toUpperCase() + syncStatus.slice(1)}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Progress Bar */}
        {isSyncing && (
          <div className="space-y-2">
            <Progress value={syncProgress} className="h-2" />
            <div className="text-sm text-gray-600">
              {syncProgress}% - {currentOperation}
            </div>
          </div>
        )}

        {/* Error Display */}
        {syncError && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-md">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-red-700">{syncError}</div>
            </div>
          </div>
        )}

        {/* Controls */}
        {showControls && (
          <div className="flex gap-2">
            {!isSyncing ? (
              <>
                <Button
                  onClick={handleStartSync}
                  disabled={!connection}
                  className="flex items-center gap-2"
                >
                  <Play className="w-4 h-4" />
                  Start Sync
                </Button>
                <Button
                  onClick={testConnection}
                  variant="outline"
                  disabled={!connection}
                >
                  Test Connection
                </Button>
              </>
            ) : (
              <Button
                onClick={cancelSync}
                variant="destructive"
                className="flex items-center gap-2"
              >
                <Square className="w-4 h-4" />
                Cancel Sync
              </Button>
            )}
          </div>
        )}

        {/* Status Info */}
        {!isSyncing && syncStatus === 'idle' && (
          <div className="text-sm text-gray-600">
            Ready to sync your Zoom webinars. Click "Start Sync" to begin.
          </div>
        )}

        {syncStatus === 'completed' && (
          <div className="text-sm text-green-600">
            Last sync completed successfully. Your webinar data is up to date.
          </div>
        )}
      </CardContent>
    </Card>
  );
};
