
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Loader2, 
  Square, 
  Clock, 
  CheckCircle, 
  XCircle, 
  WifiOff,
  Wifi 
} from 'lucide-react';
import { useRealTimeSyncProgress } from '@/hooks/useRealTimeSyncProgress';

interface RealTimeSyncProgressProps {
  connectionId: string;
}

export const RealTimeSyncProgress: React.FC<RealTimeSyncProgressProps> = ({ 
  connectionId 
}) => {
  const {
    activeProgress,
    activeSyncLog,
    recentWebinars,
    progressPercentage,
    estimatedTimeRemaining,
    isConnected,
    error,
    cancelSync
  } = useRealTimeSyncProgress(connectionId);

  const isActive = activeSyncLog && (
    activeSyncLog.sync_status === 'started' || 
    activeSyncLog.sync_status === 'in_progress'
  );

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'processing':
        return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />;
      default:
        return null;
    }
  };

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'completed':
        return 'secondary';
      case 'failed':
        return 'destructive';
      case 'processing':
        return 'default';
      default:
        return 'outline';
    }
  };

  if (!isActive) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Sync Progress</span>
            <div className="flex items-center space-x-1">
              {isConnected ? (
                <Wifi className="h-4 w-4 text-green-500" />
              ) : (
                <WifiOff className="h-4 w-4 text-red-500" />
              )}
              <span className="text-sm text-gray-500">
                {isConnected ? 'Connected' : 'Disconnected'}
              </span>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-500 text-center py-4">
            No active sync in progress
          </p>
          
          {/* Recent Webinars */}
          {recentWebinars.length > 0 && (
            <div className="mt-4">
              <h4 className="text-sm font-medium mb-2">Recent Syncs</h4>
              <div className="space-y-2">
                {recentWebinars.map((webinar) => (
                  <div 
                    key={webinar.id} 
                    className="flex items-center justify-between p-2 border rounded"
                  >
                    <div className="flex items-center space-x-2">
                      {getStatusIcon(webinar.status)}
                      <span className="text-sm">{webinar.name}</span>
                    </div>
                    <Badge variant={getStatusVariant(webinar.status)}>
                      {webinar.status}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Sync in Progress</span>
          <div className="flex items-center space-x-2">
            <div className="flex items-center space-x-1">
              {isConnected ? (
                <Wifi className="h-4 w-4 text-green-500" />
              ) : (
                <WifiOff className="h-4 w-4 text-red-500" />
              )}
              <span className="text-sm text-gray-500">
                {isConnected ? 'Live' : 'Offline'}
              </span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={cancelSync}
              className="flex items-center space-x-1"
            >
              <Square className="h-3 w-3" />
              <span>Cancel</span>
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Overall Progress</span>
            <span>{progressPercentage}%</span>
          </div>
          <Progress value={progressPercentage} className="h-3" />
        </div>

        {/* Current Status */}
        {activeProgress && (
          <div className="space-y-2">
            <div className="text-sm">
              <p className="font-medium">
                Syncing webinar {activeProgress.current_webinar_index} of {activeProgress.total_webinars}
              </p>
              {activeProgress.current_webinar_name && (
                <p className="text-gray-600">{activeProgress.current_webinar_name}</p>
              )}
            </div>
            
            {activeProgress.current_stage && (
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <Loader2 className="h-3 w-3 animate-spin" />
                <span>{activeProgress.current_stage}</span>
              </div>
            )}
          </div>
        )}

        {/* Time Remaining */}
        {estimatedTimeRemaining && (
          <div className="flex items-center space-x-1 text-sm text-gray-600">
            <Clock className="h-3 w-3" />
            <span>{estimatedTimeRemaining}</span>
          </div>
        )}

        {/* Sync Stats */}
        {activeSyncLog && (
          <div className="grid grid-cols-3 gap-4 pt-2 border-t">
            <div className="text-center">
              <div className="text-lg font-semibold">
                {activeSyncLog.processed_items || 0}
              </div>
              <div className="text-xs text-gray-500">Processed</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-semibold">
                {(activeSyncLog.total_items || 0) - (activeSyncLog.processed_items || 0)}
              </div>
              <div className="text-xs text-gray-500">Remaining</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-semibold text-red-600">
                {activeSyncLog.failed_items || 0}
              </div>
              <div className="text-xs text-gray-500">Failed</div>
            </div>
          </div>
        )}

        {/* Recent Webinars */}
        {recentWebinars.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-2">Recently Completed</h4>
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {recentWebinars.slice(0, 3).map((webinar) => (
                <div 
                  key={webinar.id} 
                  className="flex items-center justify-between text-xs p-1"
                >
                  <div className="flex items-center space-x-1">
                    {getStatusIcon(webinar.status)}
                    <span className="truncate">{webinar.name}</span>
                  </div>
                  <Badge variant={getStatusVariant(webinar.status)} className="text-xs">
                    {webinar.status}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
