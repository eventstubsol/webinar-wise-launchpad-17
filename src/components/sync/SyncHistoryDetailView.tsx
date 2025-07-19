
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Clock, 
  CheckCircle, 
  XCircle, 
  Loader2, 
  AlertTriangle,
  Info,
  Database,
  Zap
} from 'lucide-react';
import { format, formatDuration, intervalToDuration } from 'date-fns';

interface SyncHistoryDetailViewProps {
  syncEntry: any;
}

export const SyncHistoryDetailView: React.FC<SyncHistoryDetailViewProps> = ({
  syncEntry,
}) => {
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'in_progress':
      case 'started':
        return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />;
      case 'cancelled':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-400" />;
    }
  };

  const formatSyncDuration = (start: string, end: string | null): string => {
    if (!start || !end) return '-';
    try {
      const duration = intervalToDuration({ start: new Date(start), end: new Date(end) });
      return formatDuration(duration, { format: ['minutes', 'seconds'], zero: false }) || '< 1 second';
    } catch (e) {
      return '-';
    }
  };

  const getProgressPercentage = () => {
    if (!syncEntry.total_items || syncEntry.total_items === 0) return 0;
    return Math.round((syncEntry.processed_items / syncEntry.total_items) * 100);
  };

  const formatCurrentStage = (stage: string | null, webinarId: string | null): string => {
    if (!stage) return 'Not started';
    
    const stageLabels: { [key: string]: string } = {
      'initializing': 'Initializing sync operation',
      'fetching_webinar_list': 'Fetching webinar list from Zoom',
      'fetching_recent_webinars': 'Fetching recent webinars',
      'starting_webinar': 'Starting webinar sync',
      'webinar_details': 'Fetching webinar details',
      'registrants': 'Fetching registrants',
      'participants': 'Fetching participants',
      'polls': 'Fetching polls and responses',
      'qa': 'Fetching Q&A data',
      'recordings': 'Fetching recordings',
      'webinar_completed': 'Webinar sync completed',
      'webinar_failed': 'Webinar sync failed',
      'completed': 'Sync completed successfully',
      'failed': 'Sync failed'
    };

    const label = stageLabels[stage] || stage;
    return webinarId ? `${label} (Webinar: ${webinarId})` : label;
  };

  return (
    <div className="space-y-4">
      {/* Status Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="flex items-center gap-2">
          {getStatusIcon(syncEntry.sync_status)}
          <div>
            <div className="text-sm font-medium">Status</div>
            <div className="text-xs text-muted-foreground capitalize">
              {syncEntry.sync_status.replace('_', ' ')}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Database className="h-4 w-4 text-blue-500" />
          <div>
            <div className="text-sm font-medium">Items</div>
            <div className="text-xs text-muted-foreground">
              {syncEntry.processed_items || 0} / {syncEntry.total_items || 0}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-purple-500" />
          <div>
            <div className="text-sm font-medium">Duration</div>
            <div className="text-xs text-muted-foreground">
              {formatSyncDuration(syncEntry.started_at, syncEntry.completed_at)}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Zap className="h-4 w-4 text-green-500" />
          <div>
            <div className="text-sm font-medium">API Calls</div>
            <div className="text-xs text-muted-foreground">
              {syncEntry.api_calls_made || 0}
            </div>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      {syncEntry.total_items > 0 && (
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Progress</span>
            <span>{getProgressPercentage()}%</span>
          </div>
          <Progress value={getProgressPercentage()} className="h-2" />
        </div>
      )}

      {/* Current Stage */}
      {syncEntry.sync_stage && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <div className="flex items-center gap-2 text-blue-800">
            <Info className="h-4 w-4" />
            <span className="font-medium">Current Stage:</span>
          </div>
          <p className="text-sm text-blue-700 mt-1">
            {formatCurrentStage(syncEntry.sync_stage, syncEntry.current_webinar_id)}
          </p>
          {syncEntry.stage_progress_percentage !== null && (
            <div className="mt-2">
              <Progress value={syncEntry.stage_progress_percentage} className="h-1" />
            </div>
          )}
        </div>
      )}

      {/* Timing Details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <h4 className="font-medium text-sm">Timing</h4>
          <div className="text-xs space-y-1">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Started:</span>
              <span>{format(new Date(syncEntry.started_at), 'MMM d, HH:mm:ss')}</span>
            </div>
            {syncEntry.completed_at && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Completed:</span>
                <span>{format(new Date(syncEntry.completed_at), 'MMM d, HH:mm:ss')}</span>
              </div>
            )}
            {syncEntry.duration_seconds && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Duration:</span>
                <span>{syncEntry.duration_seconds}s</span>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <h4 className="font-medium text-sm">Performance</h4>
          <div className="text-xs space-y-1">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Success Rate:</span>
              <span>
                {syncEntry.total_items > 0 
                  ? `${Math.round(((syncEntry.processed_items || 0) / syncEntry.total_items) * 100)}%`
                  : '-'
                }
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Failed Items:</span>
              <span>{syncEntry.failed_items || 0}</span>
            </div>
            {syncEntry.rate_limit_hits > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Rate Limits:</span>
                <span className="text-yellow-600">{syncEntry.rate_limit_hits}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Error Details */}
      {syncEntry.error_message && (
        <Alert variant="destructive">
          <XCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>Error:</strong> {syncEntry.error_message}
          </AlertDescription>
        </Alert>
      )}

      {/* Additional Error Details */}
      {syncEntry.error_details && syncEntry.error_details.errors && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <h4 className="font-medium text-sm text-red-800 mb-2">Detailed Errors:</h4>
          <div className="space-y-1">
            {syncEntry.error_details.errors.slice(0, 5).map((error: string, index: number) => (
              <div key={index} className="text-xs text-red-700">
                • {error}
              </div>
            ))}
            {syncEntry.error_details.errors.length > 5 && (
              <div className="text-xs text-red-600">
                ... and {syncEntry.error_details.errors.length - 5} more errors
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
