
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Activity, 
  Clock, 
  AlertTriangle, 
  CheckCircle, 
  RefreshCw,
  TrendingUp,
  Users
} from 'lucide-react';
import { rateLimitManager } from '@/services/zoom/utils/RateLimitManager';
import { RateLimitInfo, ApiUsageStats } from '@/services/zoom/utils/types/rateLimitTypes';
import { useZoomConnection } from '@/hooks/useZoomConnection';

export const RateLimitMonitor: React.FC = () => {
  const [rateLimitInfo, setRateLimitInfo] = useState<RateLimitInfo | null>(null);
  const [usageStats, setUsageStats] = useState<ApiUsageStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { connection } = useZoomConnection();

  useEffect(() => {
    loadRateLimitData();
    
    // Refresh data every 5 seconds
    const interval = setInterval(loadRateLimitData, 5000);
    return () => clearInterval(interval);
  }, [connection]);

  const loadRateLimitData = async () => {
    if (!connection) {
      setIsLoading(false);
      return;
    }

    try {
      const [limitInfo, stats] = await Promise.all([
        rateLimitManager.getRateLimitStatus(connection.id),
        rateLimitManager.getUsageStats(connection.id)
      ]);

      setRateLimitInfo(limitInfo);
      setUsageStats(stats);
    } catch (error) {
      console.error('Failed to load rate limit data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetRateLimit = async () => {
    if (!connection) return;
    
    try {
      await rateLimitManager.resetRateLimit(connection.id, true);
      await loadRateLimitData();
    } catch (error) {
      console.error('Failed to reset rate limit:', error);
    }
  };

  const getStatusColor = (info: RateLimitInfo) => {
    if (info.isRateLimited) return 'destructive';
    if (info.currentTokens < info.maxTokens * 0.3) return 'warning';
    return 'default';
  };

  const getQueueStatus = (queueLength: number) => {
    if (queueLength === 0) return { color: 'success', text: 'Clear' };
    if (queueLength < 5) return { color: 'warning', text: 'Light' };
    return { color: 'destructive', text: 'Heavy' };
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center space-x-2">
            <RefreshCw className="h-4 w-4 animate-spin" />
            <span>Loading rate limit data...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!connection) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            API Rate Limits
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Connect your Zoom account to monitor API rate limits.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              API Rate Limits
            </div>
            <Button
              onClick={handleResetRateLimit}
              variant="outline"
              size="sm"
            >
              <RefreshCw className="h-4 w-4 mr-1" />
              Reset
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {rateLimitInfo && (
            <>
              {/* Token Status */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Available Tokens</span>
                  <Badge variant={getStatusColor(rateLimitInfo)}>
                    {Math.floor(rateLimitInfo.currentTokens)} / {rateLimitInfo.maxTokens}
                  </Badge>
                </div>
                <Progress 
                  value={(rateLimitInfo.currentTokens / rateLimitInfo.maxTokens) * 100}
                  className="h-2"
                />
                <div className="text-xs text-muted-foreground">
                  Refill rate: {rateLimitInfo.refillRate} tokens/second
                </div>
              </div>

              {/* Queue Status */}
              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  <span className="text-sm font-medium">Request Queue</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={getQueueStatus(rateLimitInfo.queueLength).color as any}>
                    {getQueueStatus(rateLimitInfo.queueLength).text}
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    {rateLimitInfo.queueLength} requests
                  </span>
                </div>
              </div>

              {/* Wait Time */}
              {rateLimitInfo.estimatedWaitTime > 0 && (
                <Alert>
                  <Clock className="h-4 w-4" />
                  <AlertDescription>
                    Estimated wait time: {Math.ceil(rateLimitInfo.estimatedWaitTime / 1000)} seconds
                  </AlertDescription>
                </Alert>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Usage Statistics */}
      {usageStats && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              API Usage Statistics
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <div className="text-2xl font-bold text-green-600">
                  {usageStats.successfulRequests}
                </div>
                <div className="text-xs text-muted-foreground">Successful</div>
              </div>
              <div className="space-y-1">
                <div className="text-2xl font-bold text-red-600">
                  {usageStats.failedRequests}
                </div>
                <div className="text-xs text-muted-foreground">Failed</div>
              </div>
              <div className="space-y-1">
                <div className="text-2xl font-bold text-yellow-600">
                  {usageStats.rateLimitedRequests}
                </div>
                <div className="text-xs text-muted-foreground">Rate Limited</div>
              </div>
              <div className="space-y-1">
                <div className="text-2xl font-bold">
                  {Math.round(usageStats.averageResponseTime)}ms
                </div>
                <div className="text-xs text-muted-foreground">Avg Response</div>
              </div>
            </div>

            <div className="pt-2 border-t">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Total Requests</span>
                <span className="font-medium">{usageStats.totalRequests}</span>
              </div>
              <div className="flex items-center justify-between text-sm mt-1">
                <span className="text-muted-foreground">Success Rate</span>
                <span className="font-medium">
                  {usageStats.totalRequests > 0 
                    ? Math.round((usageStats.successfulRequests / usageStats.totalRequests) * 100)
                    : 0}%
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
