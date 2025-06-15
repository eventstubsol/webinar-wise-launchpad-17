
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Clock, 
  Database, 
  AlertTriangle, 
  CheckCircle, 
  XCircle,
  Activity,
  Zap,
  Users
} from 'lucide-react';
import { format, formatDuration, intervalToDuration } from 'date-fns';

interface SyncHistoryEntry {
  id: string;
  sync_type: string;
  sync_status: string;
  started_at: string;
  completed_at: string | null;
  total_items: number | null;
  processed_items: number | null;
  failed_items: number | null;
  api_calls_made: number | null;
  rate_limit_hits: number | null;
  error_message: string | null;
  error_details: any;
  duration_seconds: number | null;
}

interface SyncHistoryDetailViewProps {
  syncEntry: SyncHistoryEntry;
  performanceMetrics?: {
    avgWebinarSyncTime: number;
    totalApiCalls: number;
    dataVolumeSynced: number;
  };
}

export const SyncHistoryDetailView: React.FC<SyncHistoryDetailViewProps> = ({
  syncEntry,
  performanceMetrics,
}) => {
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'failed':
        return <XCircle className="h-5 w-5 text-red-500" />;
      case 'cancelled':
        return <XCircle className="h-5 w-5 text-gray-500" />;
      default:
        return <Activity className="h-5 w-5 text-blue-500" />;
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'completed':
        return 'secondary';
      case 'failed':
        return 'destructive';
      case 'cancelled':
        return 'outline';
      default:
        return 'default';
    }
  };

  const formatSyncDuration = () => {
    if (!syncEntry.started_at || !syncEntry.completed_at) return 'N/A';
    
    try {
      const duration = intervalToDuration({
        start: new Date(syncEntry.started_at),
        end: new Date(syncEntry.completed_at),
      });
      return formatDuration(duration, { format: ['hours', 'minutes', 'seconds'] }) || '< 1 second';
    } catch {
      return 'N/A';
    }
  };

  const getSuccessRate = () => {
    if (!syncEntry.total_items || syncEntry.total_items === 0) return 0;
    const successful = (syncEntry.processed_items || 0) - (syncEntry.failed_items || 0);
    return Math.round((successful / syncEntry.total_items) * 100);
  };

  const getProgressPercentage = () => {
    if (!syncEntry.total_items || syncEntry.total_items === 0) return 0;
    return Math.round(((syncEntry.processed_items || 0) / syncEntry.total_items) * 100);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              {getStatusIcon(syncEntry.sync_status)}
              {syncEntry.sync_type.replace('_', ' ').toUpperCase()} Sync
            </CardTitle>
            <div className="flex items-center gap-2">
              <Badge variant={getStatusBadgeVariant(syncEntry.sync_status)}>
                {syncEntry.sync_status}
              </Badge>
              <span className="text-sm text-muted-foreground">
                {format(new Date(syncEntry.started_at), 'MMM d, yyyy, p')}
              </span>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold">{syncEntry.total_items || 0}</div>
              <div className="text-sm text-muted-foreground">Total Items</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {(syncEntry.processed_items || 0) - (syncEntry.failed_items || 0)}
              </div>
              <div className="text-sm text-muted-foreground">Successful</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{syncEntry.failed_items || 0}</div>
              <div className="text-sm text-muted-foreground">Failed</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">{formatSyncDuration()}</div>
              <div className="text-sm text-muted-foreground">Duration</div>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mt-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span>Progress</span>
              <span>{getProgressPercentage()}%</span>
            </div>
            <Progress value={getProgressPercentage()} className="h-2" />
          </div>
        </CardContent>
      </Card>

      {/* Performance Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Zap className="h-4 w-4" />
              API Performance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>API Calls Made:</span>
                <span className="font-medium">{syncEntry.api_calls_made || 0}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Rate Limit Hits:</span>
                <span className="font-medium text-orange-600">
                  {syncEntry.rate_limit_hits || 0}
                </span>
              </div>
              {performanceMetrics && (
                <div className="flex justify-between text-sm">
                  <span>Avg Time/Item:</span>
                  <span className="font-medium">
                    {performanceMetrics.avgWebinarSyncTime.toFixed(1)}s
                  </span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Database className="h-4 w-4" />
              Data Volume
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Success Rate:</span>
                <span className="font-medium text-green-600">{getSuccessRate()}%</span>
              </div>
              {performanceMetrics && (
                <>
                  <div className="flex justify-between text-sm">
                    <span>Data Synced:</span>
                    <span className="font-medium">
                      {(performanceMetrics.dataVolumeSynced / 1024 / 1024).toFixed(1)} MB
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Total API Calls:</span>
                    <span className="font-medium">{performanceMetrics.totalApiCalls}</span>
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Users className="h-4 w-4" />
              Processing Stats
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Items/Min:</span>
                <span className="font-medium">
                  {syncEntry.duration_seconds 
                    ? Math.round(((syncEntry.processed_items || 0) / syncEntry.duration_seconds) * 60)
                    : 0}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Error Rate:</span>
                <span className="font-medium text-red-600">
                  {syncEntry.total_items 
                    ? Math.round(((syncEntry.failed_items || 0) / syncEntry.total_items) * 100)
                    : 0}%
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Error Details */}
      {syncEntry.error_message && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-4 w-4" />
              Error Details
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div>
                <div className="text-sm font-medium mb-1">Error Message:</div>
                <div className="text-sm bg-red-50 p-3 rounded-md border border-red-200">
                  {syncEntry.error_message}
                </div>
              </div>
              
              {syncEntry.error_details && (
                <div>
                  <div className="text-sm font-medium mb-1">Additional Details:</div>
                  <div className="text-xs bg-gray-50 p-3 rounded-md border overflow-auto max-h-40">
                    <pre>{JSON.stringify(syncEntry.error_details, null, 2)}</pre>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
