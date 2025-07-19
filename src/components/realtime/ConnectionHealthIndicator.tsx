
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Wifi, WifiOff, AlertTriangle, CheckCircle, Clock, TrendingUp } from 'lucide-react';
import { connectionManager, ConnectionHealth, ConnectionMetrics } from '@/services/realtime/EnhancedConnectionManager';
import { useToast } from '@/hooks/use-toast';

export function ConnectionHealthIndicator() {
  const [health, setHealth] = useState<ConnectionHealth>(connectionManager.getConnectionHealth());
  const [metrics, setMetrics] = useState<ConnectionMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    // Start monitoring
    connectionManager.startHealthMonitoring();
    
    // Subscribe to health changes
    const unsubscribe = connectionManager.onHealthChange(setHealth);
    
    // Load metrics
    loadMetrics();
    
    return () => {
      unsubscribe();
      connectionManager.stopHealthMonitoring();
    };
  }, []);

  const loadMetrics = async () => {
    setIsLoading(true);
    try {
      const metricsData = await connectionManager.getConnectionMetrics();
      setMetrics(metricsData);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load connection metrics",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusIcon = () => {
    switch (health.status) {
      case 'healthy': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'degraded': return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'unhealthy': return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case 'disconnected': return <WifiOff className="h-4 w-4 text-gray-500" />;
      default: return <Wifi className="h-4 w-4" />;
    }
  };

  const getStatusColor = () => {
    switch (health.status) {
      case 'healthy': return 'bg-green-500';
      case 'degraded': return 'bg-yellow-500';
      case 'unhealthy': return 'bg-red-500';
      case 'disconnected': return 'bg-gray-500';
      default: return 'bg-gray-500';
    }
  };

  const getQualityColor = () => {
    switch (health.quality) {
      case 'excellent': return 'text-green-600';
      case 'good': return 'text-blue-600';
      case 'fair': return 'text-yellow-600';
      case 'poor': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const formatUptime = (uptime: number) => {
    const hours = Math.floor(uptime / (1000 * 60 * 60));
    const minutes = Math.floor((uptime % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wifi className="h-5 w-5" />
          Connection Health
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="status" className="space-y-4">
          <TabsList>
            <TabsTrigger value="status">Current Status</TabsTrigger>
            <TabsTrigger value="metrics">Metrics</TabsTrigger>
          </TabsList>

          <TabsContent value="status" className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {getStatusIcon()}
                <div>
                  <div className="font-medium capitalize">{health.status}</div>
                  <div className="text-sm text-gray-500">
                    Last check: {new Date(health.lastCheck).toLocaleTimeString()}
                  </div>
                </div>
              </div>
              <div className={`w-3 h-3 rounded-full ${getStatusColor()}`} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="text-sm font-medium">Connection Quality</div>
                <Badge variant="outline" className={getQualityColor()}>
                  {health.quality.toUpperCase()}
                </Badge>
              </div>
              
              {health.pingTime && (
                <div className="space-y-2">
                  <div className="text-sm font-medium">Response Time</div>
                  <div className="text-lg font-mono">{health.pingTime}ms</div>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="text-sm font-medium">Uptime</div>
                <div className="text-sm">{formatUptime(health.uptime)}</div>
              </div>
              
              <div className="space-y-2">
                <div className="text-sm font-medium">Failures</div>
                <div className="text-sm">{health.consecutiveFailures} consecutive</div>
              </div>
            </div>

            {health.status !== 'healthy' && (
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-yellow-600" />
                  <div className="text-sm font-medium text-yellow-800">
                    Connection Issues Detected
                  </div>
                </div>
                <div className="text-sm text-yellow-700 mt-1">
                  {health.status === 'degraded' && 'Connection is slower than usual. Some features may be delayed.'}
                  {health.status === 'unhealthy' && 'Connection is experiencing significant issues. Please check your internet connection.'}
                  {health.status === 'disconnected' && 'Connection lost. Attempting to reconnect...'}
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="metrics" className="space-y-4">
            {isLoading ? (
              <div className="text-center py-4">Loading metrics...</div>
            ) : metrics ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="text-sm font-medium">Uptime (7 days)</div>
                    <div className="text-2xl font-bold text-green-600">
                      {metrics.uptimePercentage}%
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="text-sm font-medium">Avg Response</div>
                    <div className="text-2xl font-bold">
                      {metrics.averagePingTime}ms
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="text-sm font-medium">Total Checks</div>
                    <div className="text-lg">{metrics.totalConnections}</div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="text-sm font-medium">Failed Checks</div>
                    <div className="text-lg text-red-600">{metrics.failedConnections}</div>
                  </div>
                </div>

                {metrics.lastFailure && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                    <div className="text-sm font-medium text-red-800">Last Failure</div>
                    <div className="text-sm text-red-700">
                      {new Date(metrics.lastFailure).toLocaleString()}
                    </div>
                  </div>
                )}

                <Button 
                  onClick={loadMetrics} 
                  variant="outline" 
                  className="w-full"
                  disabled={isLoading}
                >
                  <TrendingUp className="h-4 w-4 mr-2" />
                  Refresh Metrics
                </Button>
              </div>
            ) : (
              <div className="text-center py-4 text-gray-500">
                No metrics available
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
