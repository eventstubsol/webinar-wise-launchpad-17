
import React from 'react';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RefreshCw, Clock, CheckCircle, AlertCircle, XCircle } from 'lucide-react';
import { SyncStatus } from '@/types/zoom';

interface SyncStatusCardProps {
  status: SyncStatus | null;
  progress: number;
  currentOperation: string;
  processedItems: number;
  totalItems: number;
  estimatedTimeRemaining: number | null;
  showControls: boolean;
  onCancel: () => void;
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

export const SyncStatusCard: React.FC<SyncStatusCardProps> = ({
  status,
  progress,
  currentOperation,
  processedItems,
  totalItems,
  estimatedTimeRemaining,
  showControls,
  onCancel,
}) => {
  return (
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
            onClick={onCancel}
            className="w-full"
          >
            Cancel Sync
          </Button>
        )}
      </CardContent>
    </Card>
  );
};
