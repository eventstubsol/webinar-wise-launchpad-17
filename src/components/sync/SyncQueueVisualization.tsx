
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Clock, 
  Play, 
  CheckCircle, 
  XCircle, 
  Loader2,
  Calendar,
  Users
} from 'lucide-react';
import { useSyncQueue } from '@/hooks/useSyncQueue';
import { formatDistanceToNow } from 'date-fns';

interface SyncQueueVisualizationProps {
  connectionId: string;
}

export const SyncQueueVisualization: React.FC<SyncQueueVisualizationProps> = ({
  connectionId,
}) => {
  const { 
    queueItems, 
    queueStats,
    getQueueSummary,
    getCurrentItem,
    getEstimatedTimeRemaining,
    isLoading, 
    error, 
    refetch, 
  } = useSyncQueue(connectionId);

  const currentItem = getCurrentItem();
  const estimatedTimeRemaining = getEstimatedTimeRemaining();

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-4 w-4 text-orange-500" />;
      case 'processing':
        return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'pending':
        return 'secondary';
      case 'processing':
        return 'default';
      case 'completed':
        return 'secondary';
      case 'failed':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  const formatEstimatedTime = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
    return `${Math.round(seconds / 3600)}h`;
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Sync Queue</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span className="ml-2">Loading queue...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Sync Queue</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-red-600">
            Failed to load sync queue: {error instanceof Error ? error.message : 'Unknown error'}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Queue Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Play className="h-5 w-5" />
            Sync Queue Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-500">{queueStats.pending}</div>
              <div className="text-sm text-muted-foreground">Pending</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-500">{queueStats.processing}</div>
              <div className="text-sm text-muted-foreground">Processing</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-500">{queueStats.completed}</div>
              <div className="text-sm text-muted-foreground">Completed</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-500">{queueStats.failed}</div>
              <div className="text-sm text-muted-foreground">Failed</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">{queueStats.total}</div>
              <div className="text-sm text-muted-foreground">Total</div>
            </div>
          </div>

          {estimatedTimeRemaining > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center gap-2 text-blue-800">
                <Clock className="h-4 w-4" />
                <span className="font-medium">
                  Estimated time remaining: {formatEstimatedTime(estimatedTimeRemaining)}
                </span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Current Processing Item */}
      {currentItem && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
              Currently Processing
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">
                    {currentItem.webinar_title || `Webinar ${currentItem.webinar_id}`}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Position {currentItem.queue_position} of {queueStats.total}
                  </div>
                </div>
                <Badge variant="default">Processing</Badge>
              </div>
              
              {currentItem.started_at && (
                <div className="text-sm text-muted-foreground">
                  Started {formatDistanceToNow(new Date(currentItem.started_at), { addSuffix: true })}
                </div>
              )}

              {currentItem.estimated_duration_seconds && (
                <div className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span>Estimated Duration</span>
                    <span>{formatEstimatedTime(currentItem.estimated_duration_seconds)}</span>
                  </div>
                  <Progress value={50} className="h-2" />
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Queue Items */}
      <Card>
        <CardHeader>
          <CardTitle>Queue Details</CardTitle>
        </CardHeader>
        <CardContent>
          {queueItems.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No items in sync queue
            </div>
          ) : (
            <div className="space-y-3">
              {queueItems.slice(0, 10).map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50"
                >
                  <div className="flex items-center gap-3">
                    {getStatusIcon(item.status)}
                    <div>
                      <div className="font-medium">
                        {item.webinar_title || `Webinar ${item.webinar_id}`}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Position {item.queue_position}
                        {item.estimated_duration_seconds && (
                          <span> • Est. {formatEstimatedTime(item.estimated_duration_seconds)}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Badge variant={getStatusBadgeVariant(item.status)}>
                      {item.status}
                    </Badge>
                    {item.completed_at && (
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(item.completed_at), { addSuffix: true })}
                      </span>
                    )}
                  </div>
                </div>
              ))}
              
              {queueItems.length > 10 && (
                <div className="text-center py-2 text-sm text-muted-foreground">
                  ... and {queueItems.length - 10} more items
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
