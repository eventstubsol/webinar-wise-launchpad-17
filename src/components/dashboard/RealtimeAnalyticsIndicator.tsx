
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Activity, Loader2, CheckCircle, XCircle, Clock } from 'lucide-react';
import { useRealtimeAnalytics } from '@/hooks/useRealtimeAnalytics';

interface RealtimeAnalyticsIndicatorProps {
  connectionId?: string;
}

export const RealtimeAnalyticsIndicator: React.FC<RealtimeAnalyticsIndicatorProps> = ({
  connectionId,
}) => {
  const {
    activeTasks,
    completedTasks,
    performance,
    isLoading,
    error,
  } = useRealtimeAnalytics(connectionId);

  const getTaskIcon = (status: string) => {
    switch (status) {
      case 'processing':
        return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-orange-500" />;
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
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

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Real-time Analytics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span className="ml-2">Loading analytics...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Real-time Analytics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4 text-red-600">
            Failed to load analytics data
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Performance Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Performance Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {Math.round(performance.averageProcessingTime)}s
              </div>
              <div className="text-sm text-muted-foreground">Avg Processing Time</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {Math.round(performance.successRate)}%
              </div>
              <div className="text-sm text-muted-foreground">Success Rate</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">
                {performance.totalProcessed}
              </div>
              <div className="text-sm text-muted-foreground">Total Processed</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Active Tasks */}
      {activeTasks.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Active Tasks ({activeTasks.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {activeTasks.slice(0, 5).map((task) => (
                <div key={task.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    {getTaskIcon(task.status)}
                    <div>
                      <div className="font-medium">{task.task_type}</div>
                      <div className="text-sm text-muted-foreground">
                        Priority: {task.priority}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={getStatusBadgeVariant(task.status)}>
                      {task.status}
                    </Badge>
                    {task.status === 'processing' && task.progress !== undefined && (
                      <div className="w-24">
                        <Progress value={task.progress} className="h-2" />
                      </div>
                    )}
                  </div>
                </div>
              ))}
              
              {activeTasks.length > 5 && (
                <div className="text-center py-2 text-sm text-muted-foreground">
                  ... and {activeTasks.length - 5} more active tasks
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Completed Tasks */}
      {completedTasks.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Completed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {completedTasks.slice(0, 3).map((task) => (
                <div key={task.id} className="flex items-center justify-between p-2 border rounded">
                  <div className="flex items-center gap-2">
                    {getTaskIcon(task.status)}
                    <span className="text-sm">{task.task_type}</span>
                  </div>
                  <Badge variant={getStatusBadgeVariant(task.status)} size="sm">
                    {task.status}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* No Active Tasks State */}
      {activeTasks.length === 0 && completedTasks.length === 0 && (
        <Card>
          <CardContent className="text-center py-8">
            <Activity className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <div className="text-muted-foreground">
              No active tasks at the moment
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
