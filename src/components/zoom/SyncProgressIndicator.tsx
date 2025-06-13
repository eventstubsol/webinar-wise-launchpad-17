
import React from 'react';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { X, RefreshCw, Clock, CheckCircle, AlertCircle, XCircle } from 'lucide-react';
import { useSyncProgress } from '@/hooks/useSyncProgress';
import { SyncStatus, SyncType } from '@/types/zoom';
import { formatDistanceToNow } from 'date-fns';

interface SyncProgressIndicatorProps {
  connectionId: string;
  showHistory?: boolean;
  showControls?: boolean;
  compact?: boolean;
}

export const SyncProgressIndicator: React.FC<SyncProgressIndicatorProps> = ({
  connectionId,
  showHistory = false,
  showControls = true,
  compact = false,
}) => {
  const {
    isActive,
    progress,
    status,
    currentOperation,
    processedItems,
    totalItems,
    estimatedTimeRemaining,
    errors,
    startSync,
    cancelSync,
    dismissError,
    syncHistory,
    isConnected,
  } = useSyncProgress(connectionId);

  const getStatusIcon = (syncStatus: SyncStatus | null) => {
    switch (syncStatus) {
      case SyncStatus.IN_PROGRESS:
      case SyncStatus.STARTED:
        return <RefreshCw className="h-4 w-4 animate-spin" />;
      case SyncStatus.COMPLETED:
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case SyncStatus.FAILED:
        return <AlertCircle className="h-4 w-4 text-red-600" />;
      case SyncStatus.CANCELLED:
        return <XCircle className="h-4 w-4 text-gray-600" />;
      default:
        return null;
    }
  };

  const getStatusBadgeVariant = (syncStatus: SyncStatus | null) => {
    switch (syncStatus) {
      case SyncStatus.IN_PROGRESS:
      case SyncStatus.STARTED:
        return 'default';
      case SyncStatus.COMPLETED:
        return 'secondary';
      case SyncStatus.FAILED:
        return 'destructive';
      case SyncStatus.CANCELLED:
        return 'outline';
      default:
        return 'outline';
    }
  };

  const formatTimeRemaining = (seconds: number | null): string => {
    if (!seconds || seconds <= 0) return '';
    
    if (seconds < 60) return `${seconds}s remaining`;
    if (seconds < 3600) return `${Math.round(seconds / 60)}m remaining`;
    return `${Math.round(seconds / 3600)}h remaining`;
  };

  if (compact && !isActive) {
    return null;
  }

  return (
    <div className="space-y-4">
      {/* Connection Status */}
      {!isConnected && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Real-time sync updates are currently unavailable. Some information may be delayed.
          </AlertDescription>
        </Alert>
      )}

      {/* Active Sync Display */}
      {isActive && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm flex items-center gap-2">
                {getStatusIcon(status)}
                Sync in Progress
              </CardTitle>
              {status && (
                <Badge variant={getStatusBadgeVariant(status)}>
                  {status.replace('_', ' ')}
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Progress Bar */}
            <div className="space-y-2">
              <Progress value={progress} className="h-2" />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{progress}% complete</span>
                <span>{processedItems} / {totalItems}</span>
              </div>
            </div>

            {/* Current Operation */}
            {currentOperation && (
              <p className="text-sm text-muted-foreground">{currentOperation}</p>
            )}

            {/* Time Remaining */}
            {estimatedTimeRemaining && estimatedTimeRemaining > 0 && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                {formatTimeRemaining(estimatedTimeRemaining)}
              </div>
            )}

            {/* Cancel Button */}
            {showControls && (status === SyncStatus.IN_PROGRESS || status === SyncStatus.STARTED) && (
              <Button
                variant="outline"
                size="sm"
                onClick={cancelSync}
                className="w-full"
              >
                Cancel Sync
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Sync Controls */}
      {showControls && !isActive && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Sync Controls</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => startSync(SyncType.INCREMENTAL)}
              className="w-full"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Quick Sync
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => startSync(SyncType.INITIAL)}
              className="w-full"
            >
              Full Sync
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Error Display */}
      {errors.length > 0 && (
        <div className="space-y-2">
          {errors.map((error) => (
            <Alert key={error.id} variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="flex justify-between items-start">
                <span>{error.message}</span>
                {error.dismissible && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => dismissError(error.id)}
                    className="h-auto p-1 ml-2"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                )}
              </AlertDescription>
            </Alert>
          ))}
        </div>
      )}

      {/* Sync History */}
      {showHistory && syncHistory.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Recent Syncs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {syncHistory.slice(0, 5).map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-center justify-between text-xs p-2 rounded bg-gray-50"
                >
                  <div className="flex items-center gap-2">
                    {getStatusIcon(entry.status)}
                    <span className="capitalize">{entry.type}</span>
                  </div>
                  <div className="text-right text-muted-foreground">
                    <div>{entry.processedItems} items</div>
                    <div>{formatDistanceToNow(new Date(entry.startedAt), { addSuffix: true })}</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default SyncProgressIndicator;
