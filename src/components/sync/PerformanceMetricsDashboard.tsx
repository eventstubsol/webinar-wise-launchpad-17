
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { 
  Activity, 
  Zap, 
  Clock, 
  TrendingUp, 
  AlertTriangle,
  Shield
} from 'lucide-react';
import { useSyncPerformanceMetrics } from '@/hooks/useSyncPerformanceMetrics';
import { useRateLimitMonitor } from '@/hooks/useRateLimitMonitor';

interface PerformanceMetricsDashboardProps {
  connectionId: string;
  userId: string;
}

export const PerformanceMetricsDashboard: React.FC<PerformanceMetricsDashboardProps> = ({
  connectionId,
  userId,
}) => {
  const { performanceData, isLoading: perfLoading } = useSyncPerformanceMetrics(connectionId);
  const { 
    rateLimitData, 
    getUsagePercentage, 
    getRemainingCalls, 
    getTimeUntilReset, 
    canSync,
    isLoading: rateLimitLoading 
  } = useRateLimitMonitor(connectionId, userId);

  const formatBytes = (bytes: number) => {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  const formatTimeUntilReset = () => {
    const timeMs = getTimeUntilReset();
    if (!timeMs) return 'Unknown';
    
    const hours = Math.floor(timeMs / (1000 * 60 * 60));
    const minutes = Math.floor((timeMs % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  const getUsageColor = () => {
    const percentage = getUsagePercentage();
    if (percentage >= 90) return 'text-red-600';
    if (percentage >= 75) return 'text-orange-600';
    return 'text-green-600';
  };

  if (perfLoading || rateLimitLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Performance Metrics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-pulse text-muted-foreground">Loading metrics...</div>
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
            <Shield className="h-5 w-5" />
            API Rate Limit Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            <div className="text-center">
              <div className={`text-2xl font-bold ${getUsageColor()}`}>
                {getRemainingCalls()}
              </div>
              <div className="text-sm text-muted-foreground">Calls Remaining</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">
                {rateLimitData ? rateLimitData.api_calls_limit : 100}
              </div>
              <div className="text-sm text-muted-foreground">Daily Limit</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">{getUsagePercentage().toFixed(0)}%</div>
              <div className="text-sm text-muted-foreground">Usage</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">{formatTimeUntilReset()}</div>
              <div className="text-sm text-muted-foreground">Until Reset</div>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>API Usage</span>
              <span>{getUsagePercentage().toFixed(1)}%</span>
            </div>
            <Progress 
              value={getUsagePercentage()} 
              className={`h-3 ${getUsagePercentage() >= 90 ? 'bg-red-100' : ''}`}
            />
          </div>

          {!canSync() && (
            <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-3">
              <div className="flex items-center gap-2 text-red-800">
                <AlertTriangle className="h-4 w-4" />
                <span className="font-medium">Rate limit warning</span>
              </div>
              <div className="text-sm text-red-700 mt-1">
                API usage is high. Sync operations may be throttled. 
                Limit resets in {formatTimeUntilReset()}.
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Performance Overview */}
      {performanceData && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Sync Performance
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div>
                    <div className="text-2xl font-bold">
                      {performanceData.avgWebinarSyncTime.toFixed(1)}s
                    </div>
                    <div className="text-sm text-muted-foreground">Avg Time per Webinar</div>
                  </div>
                  <div>
                    <div className="text-lg font-semibold text-green-600">
                      {performanceData.successRate.toFixed(1)}%
                    </div>
                    <div className="text-sm text-muted-foreground">Success Rate</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Zap className="h-4 w-4" />
                  API Efficiency
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div>
                    <div className="text-2xl font-bold">{performanceData.totalApiCalls}</div>
                    <div className="text-sm text-muted-foreground">Total API Calls</div>
                  </div>
                  <div>
                    <div className="text-lg font-semibold">
                      {performanceData.totalApiCalls > 0 
                        ? (performanceData.totalApiCalls / Math.max(1, performanceData.avgWebinarSyncTime)).toFixed(1)
                        : '0'
                      }
                    </div>
                    <div className="text-sm text-muted-foreground">Calls per Second</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Activity className="h-4 w-4" />
                  Data Volume
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div>
                    <div className="text-2xl font-bold">
                      {formatBytes(performanceData.dataVolumeSynced)}
                    </div>
                    <div className="text-sm text-muted-foreground">Total Synced</div>
                  </div>
                  <div>
                    <div className="text-lg font-semibold">
                      {performanceData.avgWebinarSyncTime > 0 
                        ? formatBytes(performanceData.dataVolumeSynced / performanceData.avgWebinarSyncTime)
                        : '0 Bytes'
                      }/s
                    </div>
                    <div className="text-sm text-muted-foreground">Avg Transfer Rate</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Performance Trends */}
          {performanceData.trends.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Performance Trends (Last 30 Days)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={performanceData.trends}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="date" 
                        tick={{ fontSize: 12 }}
                        tickFormatter={(value) => new Date(value).toLocaleDateString()}
                      />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip 
                        labelFormatter={(value) => new Date(value).toLocaleDateString()}
                        formatter={(value: number, name: string) => [
                          name === 'avgDuration' ? `${value.toFixed(1)}s` : 
                          name === 'successRate' ? `${value.toFixed(1)}%` : 
                          value.toString(),
                          name === 'avgDuration' ? 'Avg Duration' :
                          name === 'successRate' ? 'Success Rate' :
                          name === 'apiCalls' ? 'API Calls' : name
                        ]}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="avgDuration" 
                        stroke="#3b82f6" 
                        strokeWidth={2}
                        name="avgDuration"
                      />
                      <Line 
                        type="monotone" 
                        dataKey="successRate" 
                        stroke="#10b981" 
                        strokeWidth={2}
                        name="successRate"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
};
