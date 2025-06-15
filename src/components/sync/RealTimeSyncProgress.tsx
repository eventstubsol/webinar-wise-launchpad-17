
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  RefreshCw, 
  Play, 
  Pause, 
  Loader2, 
  CheckCircle, 
  XCircle, 
  Clock,
  Activity
} from 'lucide-react';
import { useZoomConnection } from '@/hooks/useZoomConnection';
import { formatDistanceToNow } from 'date-fns';

interface RealTimeSyncProgressProps {
  connectionId: string;
}

interface SyncResult {
  status: string;
  completedAt?: string;
  startedAt: string;
  processedItems?: number;
  duration?: number;
  error?: string;
}

interface ZoomSyncHook {
  isSyncing: boolean;
  syncProgress: number;
  currentOperation: string;
  startSync: (type?: 'initial' | 'incremental') => Promise<void>;
  syncStatus?: string;
  lastSyncResult?: SyncResult;
  estimatedTimeRemaining?: number;
}

// Mock hook implementation for now - this should be implemented properly
const useZoomSync = (connectionId: string): ZoomSyncHook => {
  return {
    isSyncing: false,
    syncProgress: 0,
    currentOperation: '',
    startSync: async (type?: 'initial' | 'incremental') => {
      console.log('Starting sync:', type);
    },
    syncStatus: 'idle',
    lastSyncResult: undefined,
    estimatedTimeRemaining: undefined
  };
};

export const RealTimeSyncProgress: React.FC<RealTimeSyncProgressProps> = ({
  connectionId,
}) => {
  const { connection } = useZoomConnection();
  const { 
    isSyncing, 
    syncProgress, 
    syncStatus = 'idle', 
    currentOperation, 
    startSync, 
    lastSyncResult,
    estimatedTimeRemaining 
  } = useZoomSync(connectionId);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'in_progress':
      case 'started':
        return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />;
      default:
        return <Clock className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge variant="secondary">Completed</Badge>;
      case 'failed':
        return <Badge variant="destructive">Failed</Badge>;
      case 'in_progress':
      case 'started':
        return <Badge variant="default">In Progress</Badge>;
      default:
        return <Badge variant="outline">Ready</Badge>;
    }
  };

  const formatTime = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
    return `${Math.round(seconds / 3600)}h`;
  };

  if (!connection) {
    return (
      <Alert>
        <AlertDescription>
          No Zoom connection found. Please connect your Zoom account first.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Real-time Sync Progress
          </div>
          {syncStatus && getStatusBadge(syncStatus)}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Active Sync Progress */}
        {isSyncing && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Sync Progress</span>
              <span className="text-sm text-muted-foreground">{syncProgress}%</span>
            </div>
            <Progress value={syncProgress} className="h-2" />
            
            {currentOperation && (
              <div className="text-sm text-muted-foreground">
                <span className="font-medium">Current: </span>
                {currentOperation}
              </div>
            )}
            
            {estimatedTimeRemaining && (
              <div className="text-sm text-muted-foreground">
                <span className="font-medium">Est. time remaining: </span>
                {formatTime(estimatedTimeRemaining)}
              </div>
            )}
          </div>
        )}

        {/* Last Sync Result */}
        {!isSyncing && lastSyncResult && (
          <div className="bg-muted/50 rounded-lg p-4 space-y-2">
            <div className="flex items-center gap-2">
              {getStatusIcon(lastSyncResult.status)}
              <span className="font-medium">Last Sync</span>
              <span className="text-sm text-muted-foreground">
                {formatDistanceToNow(new Date(lastSyncResult.completedAt || lastSyncResult.startedAt), { addSuffix: true })}
              </span>
            </div>
            
            {lastSyncResult.status === 'completed' && (
              <div className="text-sm space-y-1">
                <div>✓ {lastSyncResult.processedItems || 0} webinars synced successfully</div>
                {lastSyncResult.duration && (
                  <div>⏱ Completed in {formatTime(lastSyncResult.duration)}</div>
                )}
              </div>
            )}
            
            {lastSyncResult.status === 'failed' && lastSyncResult.error && (
              <div className="text-sm text-red-600">
                Error: {lastSyncResult.error}
              </div>
            )}
          </div>
        )}

        {/* Sync Controls */}
        <div className="flex gap-2">
          <Button 
            onClick={() => startSync('incremental')} 
            disabled={isSyncing}
            variant="outline"
            size="sm"
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
            Quick Sync
          </Button>
          
          <Button 
            onClick={() => startSync('initial')} 
            disabled={isSyncing}
            size="sm"
          >
            <Play className="mr-2 h-4 w-4" />
            Full Sync
          </Button>
        </div>

        {/* Connection Info */}
        <div className="pt-4 border-t text-xs text-muted-foreground space-y-1">
          <div>Connected as: {connection.zoom_email}</div>
          <div>Account: {connection.zoom_account_type || 'Unknown'}</div>
          {connection.last_sync_at && (
            <div>
              Last sync: {formatDistanceToNow(new Date(connection.last_sync_at), { addSuffix: true })}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
