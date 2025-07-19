
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Activity, 
  Clock, 
  Zap, 
  TrendingUp, 
  AlertTriangle,
  CheckCircle,
  Database,
  Wifi
} from 'lucide-react';
import { useSyncPerformanceMetrics } from '@/hooks/useSyncPerformanceMetrics';
import { useRateLimitMonitor } from '@/hooks/useRateLimitMonitor';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface PerformanceMetricsDashboardProps {
  connectionId: string;
  userId: string;
}

export const PerformanceMetricsDashboard: React.FC<PerformanceMetricsDashboardProps> = ({
  connectionId,
  userId,
}) => {
  const { performanceData, isLoading: metricsLoading } = useSyncPerformanceMetrics(connectionId);
  const { 
    rateLimitData, 
    getUsagePercentage, 
    getRemainingCalls, 
    getTimeUntilReset,
    canSync 
  } = useRateLimitMonitor(connectionId, userId);

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
    return `${Math.round(seconds / 3600)}h`;
  };

  const getStatusColor = (percentage: number) => {
    if (percentage >= 90) return 'text-red-500';
    if (percentage >= 70) return 'text-yellow-500';
    return 'text-green-500';
  };

  // Helper function to get success rate from performance data
  const getSuccessRate = () => {
    if (performanceData?.successRate !== undefined) return performanceData.successRate;
    if (performanceData?.summary?.successRate !== undefined) return performanceData.summary.successRate;
    return 0;
  };

  if (metricsLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Performance Metrics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-pulse text-muted-foreground">Loading performance data...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Rate Limit Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            API Usage & Rate Limits
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">API Calls Used</span>
                <span className={`text-sm font-mono ${getStatusColor(getUsagePercentage())}`}>
                  {rateLimitData?.api_calls_made || 0} / {rateLimitData?.api_calls_limit || 100}
                </span>
              </div>
              <Progress value={getUsagePercentage()} className="h-2" />
              <div className="text-xs text-muted-foreground">
                {getRemainingCalls()} calls remaining
              </div>
            </div>
            
            <div className="flex items-center justify-center">
              {canSync() ? (
                <div className="flex items-center gap-2 text-green-600">
                  <CheckCircle className="h-4 w-4" />
                  <span className="text-sm font-medium">Sync Available</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-red-600">
                  <AlertTriangle className="h-4 w-4" />
                  <span className="text-sm font-medium">Rate Limited</span>
                </div>
              )}
            </div>

            <div className="text-center">
              <div className="text-sm text-muted-foreground">Reset Time</div>
              <div className="text-sm font-mono">
                {rateLimitData ? new Date(rateLimitData.reset_time).toLocaleTimeString() : 'Unknown'}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Performance Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-blue-500" />
              <div>
                <div className="text-sm text-muted-foreground">Avg Sync Time</div>
                <div className="text-lg font-semibold">
                  {performanceData?.avgWebinarSyncTime ? formatDuration(performanceData.avgWebinarSyncTime) : 
                   performanceData ? formatDuration(performanceData.summary.averageDuration) : '-'}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-green-500" />
              <div>
                <div className="text-sm text-muted-foreground">Total API Calls</div>
                <div className="text-lg font-semibold">
                  {performanceData?.totalApiCalls || rateLimitData?.api_calls_made || 0}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-purple-500" />
              <div>
                <div className="text-sm text-muted-foreground">Success Rate</div>
                <div className="text-lg font-semibold">
                  {getSuccessRate().toFixed(1)}%
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Database className="h-4 w-4 text-orange-500" />
              <div>
                <div className="text-sm text-muted-foreground">Data Synced</div>
                <div className="text-lg font-semibold">
                  {performanceData?.dataVolumeSynced ? formatBytes(performanceData.dataVolumeSynced) : 
                   `${performanceData?.summary.totalSyncs || 0} items`}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Performance Trends */}
      {performanceData?.trends && performanceData.trends.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Performance Trends (Last 30 Days)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={performanceData.trends}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="date" 
                    tick={{ fontSize: 12 }}
                    tickFormatter={(date) => new Date(date).toLocaleDateString()}
                  />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip 
                    labelFormatter={(date) => new Date(date).toLocaleDateString()}
                    formatter={(value, name) => [
                      name === 'avgDuration' ? formatDuration(value as number) : value,
                      name === 'avgDuration' ? 'Avg Duration' : 
                      name === 'apiCalls' ? 'API Calls' : 'Success Rate'
                    ]}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="avgDuration" 
                    stroke="#3B82F6" 
                    name="avgDuration"
                    strokeWidth={2}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="successRate" 
                    stroke="#10B981" 
                    name="successRate"
                    strokeWidth={2}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Connection Health */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wifi className="h-5 w-5" />
            Connection Health
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm">Zoom API Connection</span>
              <Badge variant={canSync() ? "secondary" : "destructive"}>
                {canSync() ? "Healthy" : "Limited"}
              </Badge>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm">Token Status</span>
              <Badge variant="secondary">Valid</Badge>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm">Last Successful Sync</span>
              <span className="text-sm text-muted-foreground">
                {performanceData?.trends && performanceData.trends.length > 0 ? 
                  new Date(performanceData.trends[performanceData.trends.length - 1].date).toLocaleString() : 
                  'Never'
                }
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
