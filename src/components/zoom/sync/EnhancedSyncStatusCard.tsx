
import React from 'react';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { RefreshCw, Clock, CheckCircle, AlertCircle, XCircle, Zap, AlertTriangle } from 'lucide-react';
import { SyncStatus } from '@/types/zoom';

interface EnhancedSyncStatusCardProps {
  isActive: boolean;
  status: SyncStatus | null;
  progress: number;
  currentOperation: string;
  syncHealth: {
    isHealthy: boolean;
    ageMinutes: number;
    hasStuckSyncs: boolean;
    lastCleanup: Date | null;
  } | null;
  estimatedTimeRemaining: number | null;
  lastUpdated: Date | null;
  onCancel: () => void;
  onRetry: (force?: boolean) => void;
  onForceCleanup: () => void;
}

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

export const EnhancedSyncStatusCard: React.FC<EnhancedSyncStatusCardProps> = ({
  isActive,
  status,
  progress,
  currentOperation,
  syncHealth,
  estimatedTimeRemaining,
  lastUpdated,
  onCancel,
  onRetry,
  onForceCleanup,
}) => {
  const showHealthWarning = syncHealth && (!syncHealth.isHealthy || syncHealth.hasStuckSyncs);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            {getStatusIcon(status)}
            {isActive ? 'Enhanced Sync in Progress' : 'Sync Ready'}
            <Zap className="h-3 w-3 text-blue-500" />
          </CardTitle>
          {status && (
            <Badge variant={getStatusBadgeVariant(status)}>
              {status.replace('_', ' ')}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Health Warning */}
        {showHealthWarning && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              {!syncHealth.isHealthy 
                ? `Sync may be stuck (${syncHealth.ageMinutes} minutes old)` 
                : 'Stuck syncs detected'}
              <Button
                variant="outline"
                size="sm"
                onClick={onForceCleanup}
                className="ml-2"
              >
                Force Cleanup
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {/* Active Sync Display */}
        {isActive && (
          <>
            {/* Progress Bar */}
            <div className="space-y-2">
              <Progress value={progress} className="h-2" />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{progress}% complete</span>
                {syncHealth && (
                  <span className={syncHealth.isHealthy ? 'text-green-600' : 'text-amber-600'}>
                    {syncHealth.ageMinutes}m old
                  </span>
                )}
              </div>
            </div>

            {/* Current Operation */}
            {currentOperation && (
              <p className="text-sm text-muted-foreground">
                Current: {currentOperation.replace('_', ' ')}
              </p>
            )}

            {/* Time Remaining */}
            {estimatedTimeRemaining && estimatedTimeRemaining > 0 && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                {formatTimeRemaining(estimatedTimeRemaining)}
              </div>
            )}

            {/* Cancel Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={onCancel}
              className="w-full"
            >
              Cancel Sync
            </Button>
          </>
        )}

        {/* Retry Options */}
        {!isActive && (
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onRetry(false)}
              className="flex-1"
            >
              <RefreshCw className="h-3 w-3 mr-1" />
              Smart Retry
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onRetry(true)}
              className="flex-1"
            >
              <Zap className="h-3 w-3 mr-1" />
              Force Retry
            </Button>
          </div>
        )}

        {/* Last Updated */}
        {lastUpdated && (
          <div className="text-xs text-muted-foreground text-center">
            Last updated: {lastUpdated.toLocaleTimeString()}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
