
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { 
  Activity, 
  Wifi, 
  WifiOff, 
  RefreshCw, 
  Clock, 
  AlertTriangle,
  CheckCircle,
  XCircle,
  Loader2
} from 'lucide-react';
import { useRealtimeDashboard } from '@/hooks/useRealtimeDashboard';

interface RealtimeAnalyticsIndicatorProps {
  webinarId?: string;
  compact?: boolean;
}

export const RealtimeAnalyticsIndicator: React.FC<RealtimeAnalyticsIndicatorProps> = ({
  webinarId,
  compact = false
}) => {
  const {
    dashboardData,
    liveAlerts,
    connectionHealth,
    processingTasks,
    actions
  } = useRealtimeDashboard(webinarId);

  const activeTasks = processingTasks.filter(task => 
    task.status === 'processing' || task.status === 'pending'
  );

  const visibleAlerts = liveAlerts.filter(alert => !alert.dismissed).slice(0, 3);

  if (compact) {
    return (
      <div className="flex items-center space-x-2">
        {/* Connection Status */}
        <div className="flex items-center space-x-1">
          {connectionHealth.isConnected ? (
            <Wifi className="w-4 h-4 text-green-500" />
          ) : (
            <WifiOff className="w-4 h-4 text-red-500" />
          )}
          <span className="text-xs text-gray-500">
            {connectionHealth.isConnected ? 'Live' : 'Offline'}
          </span>
        </div>

        {/* Active Processing */}
        {activeTasks.length > 0 && (
          <div className="flex items-center space-x-1">
            <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
            <span className="text-xs text-gray-500">
              {activeTasks.length} processing
            </span>
          </div>
        )}

        {/* Alert Count */}
        {visibleAlerts.length > 0 && (
          <Badge variant="outline" className="text-xs">
            {visibleAlerts.length} alerts
          </Badge>
        )}
      </div>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Activity className="w-5 h-5" />
            <span>Real-time Analytics</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="flex items-center space-x-1">
              {connectionHealth.isConnected ? (
                <Wifi className="w-4 h-4 text-green-500" />
              ) : (
                <WifiOff className="w-4 h-4 text-red-500" />
              )}
              <span className="text-sm text-gray-500">
                {connectionHealth.isConnected ? 'Connected' : 'Disconnected'}
              </span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={actions.refreshDashboard}
              disabled={activeTasks.length > 0}
            >
              <RefreshCw className="w-4 h-4 mr-1" />
              Refresh
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Connection Health */}
        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
          <div className="flex items-center space-x-2">
            <div className={`w-2 h-2 rounded-full ${
              connectionHealth.isConnected ? 'bg-green-500' : 'bg-red-500'
            }`} />
            <span className="text-sm font-medium">
              {connectionHealth.isConnected ? 'Live Connection' : 'Connection Lost'}
            </span>
          </div>
          {connectionHealth.lastHeartbeat && (
            <div className="flex items-center space-x-1 text-xs text-gray-500">
              <Clock className="w-3 h-3" />
              <span>Last: {new Date(connectionHealth.lastHeartbeat).toLocaleTimeString()}</span>
            </div>
          )}
        </div>

        {/* Processing Tasks */}
        {activeTasks.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Active Processing</h4>
            {activeTasks.map(task => (
              <div key={task.id} className="p-2 border rounded-lg">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm">{task.task_type.replace('_', ' ')}</span>
                  <Badge variant={task.status === 'processing' ? 'default' : 'secondary'}>
                    {task.status}
                  </Badge>
                </div>
                {task.progress !== undefined && (
                  <Progress value={task.progress} className="h-1" />
                )}
              </div>
            ))}
          </div>
        )}

        {/* Live Alerts */}
        {visibleAlerts.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Live Alerts</h4>
            {visibleAlerts.map(alert => (
              <Alert key={alert.id} className="p-2">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-2">
                    {alert.type === 'warning' && <AlertTriangle className="w-4 h-4 text-yellow-500 mt-0.5" />}
                    {alert.type === 'error' && <XCircle className="w-4 h-4 text-red-500 mt-0.5" />}
                    {alert.type === 'success' && <CheckCircle className="w-4 h-4 text-green-500 mt-0.5" />}
                    {alert.type === 'info' && <Activity className="w-4 h-4 text-blue-500 mt-0.5" />}
                    <div>
                      <AlertDescription className="text-sm">
                        {alert.message}
                      </AlertDescription>
                      <span className="text-xs text-gray-500">
                        {new Date(alert.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => actions.dismissAlert(alert.id)}
                    className="h-6 w-6 p-0"
                  >
                    <XCircle className="w-3 h-3" />
                  </Button>
                </div>
              </Alert>
            ))}
          </div>
        )}

        {/* Dashboard Status */}
        <div className="text-xs text-gray-500 flex items-center justify-between">
          <span>Last updated: {new Date(dashboardData.lastUpdated).toLocaleTimeString()}</span>
          {dashboardData.engagement && (
            <span>Engagement Score: {Math.round(dashboardData.engagement.avg_engagement_score || 0)}%</span>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
