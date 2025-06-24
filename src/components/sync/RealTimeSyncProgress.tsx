
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  RefreshCw, 
  Play, 
  X, 
  CheckCircle, 
  XCircle, 
  Clock,
  Activity
} from 'lucide-react';
import { useZoomConnection } from '@/hooks/useZoomConnection';
import { useZoomSync } from '@/hooks/useZoomSync';
import { formatDistanceToNow } from 'date-fns';

interface RealTimeSyncProgressProps {
  connectionId: string;
}

export const RealTimeSyncProgress: React.FC<RealTimeSyncProgressProps> = ({
  connectionId,
}) => {
  const { connection } = useZoomConnection();
  const { 
    startSync, 
    cancelSync, 
    isSyncing, 
    syncProgress, 
    currentOperation,
    activeSyncId
  } = useZoomSync(connection);

  const getStatusIcon = (isActive: boolean) => {
    if (isActive) {
      return <RefreshCw className="h-4 w-4 text-blue-500 animate-spin" />;
    }
    return <Clock className="h-4 w-4 text-gray-400" />;
  };

  const getStatusBadge = (isActive: boolean) => {
    if (isActive) {
      return <Badge variant="default">In Progress</Badge>;
    }
    return <Badge variant="outline">Ready</Badge>;
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
          {getStatusBadge(isSyncing)}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Active Sync Progress */}
        {isSyncing && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Sync Progress</span>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">{syncProgress}%</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={cancelSync}
                  className="h-6 w-6 p-0 hover:bg-red-100"
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            </div>
            <Progress value={syncProgress} className="h-2" />
            
            {currentOperation && (
              <div className="text-sm text-muted-foreground">
                <span className="font-medium">Status: </span>
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
