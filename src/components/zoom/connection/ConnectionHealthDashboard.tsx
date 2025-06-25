import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  Activity, 
  Wifi, 
  WifiOff, 
  Clock, 
  TrendingUp, 
  TrendingDown,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Zap
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useQuery } from '@tanstack/react-query';
import { RenderConnectionService } from '@/services/zoom/RenderConnectionService';
import { useZoomConnection } from '@/hooks/useZoomConnection';

interface HealthMetric {
  timestamp: string;
  responseTime: number;
  success: boolean;
  errorMessage?: string;
}

interface ConnectionHealth {
  status: 'healthy' | 'warning' | 'critical' | 'offline';
  uptime: number;
  averageResponseTime: number;
  successRate: number;
  lastError?: string;
  metrics: HealthMetric[];
}

export const ConnectionHealthDashboard: React.FC = () => {
  const { connection } = useZoomConnection();
  const [healthHistory, setHealthHistory] = useState<HealthMetric[]>([]);
  
  // Real-time health monitoring
  const { data: healthData, isLoading } = useQuery({
    queryKey: ['connection-health', connection?.id],
    queryFn: async () => {
      if (!connection?.id) return null;
      
      const startTime = Date.now();
      try {
        const healthCheck = await RenderConnectionService.checkConnectionHealth(connection.id);
        const responseTime = Date.now() - startTime;
        
        const metric: HealthMetric = {
          timestamp: new Date().toISOString(),
          responseTime,
          success: healthCheck.isHealthy,
          errorMessage: healthCheck.isHealthy ? undefined : 'Connection check failed'
        };
        
        // Update history (keep last 50 metrics)
        setHealthHistory(prev => [...prev.slice(-49), metric]);
        
        return {
          status: healthCheck.isHealthy ? 'healthy' : 'critical',
          uptime: calculateUptime(healthHistory),
          averageResponseTime: calculateAverageResponseTime(healthHistory),
          successRate: calculateSuccessRate(healthHistory),
          lastError: healthCheck.isHealthy ? undefined : 'Connection issues detected',
          metrics: healthHistory
        } as ConnectionHealth;
        
      } catch (error) {
        const responseTime = Date.now() - startTime;
        const metric: HealthMetric = {
          timestamp: new Date().toISOString(),
          responseTime,
          success: false,
          errorMessage: error instanceof Error ? error.message : 'Unknown error'
        };
        
        setHealthHistory(prev => [...prev.slice(-49), metric]);
        
        return {
          status: 'offline',
          uptime: 0,
          averageResponseTime: responseTime,
          successRate: 0,
          lastError: error instanceof Error ? error.message : 'Connection failed',
          metrics: healthHistory
        } as ConnectionHealth;
      }
    },
    enabled: !!connection?.id,
    refetchInterval: 15000, // Check every 15 seconds
    retry: false
  });

  const calculateUptime = (metrics: HealthMetric[]): number => {
    if (metrics.length === 0) return 0;
    const successCount = metrics.filter(m => m.success).length;
    return (successCount / metrics.length) * 100;
  };

  const calculateAverageResponseTime = (metrics: HealthMetric[]): number => {
    if (metrics.length === 0) return 0;
    const total = metrics.reduce((sum, m) => sum + m.responseTime, 0);
    return total / metrics.length;
  };

  const calculateSuccessRate = (metrics: HealthMetric[]): number => {
    if (metrics.length === 0) return 0;
    const last24Hours = metrics.slice(-96); // Assuming 15s intervals, 96 = 24 hours
    const successCount = last24Hours.filter(m => m.success).length;
    return (successCount / last24Hours.length) * 100;
  };

  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'healthy':
        return { icon: CheckCircle, label: 'Healthy', color: 'text-green-500', bgColor: 'bg-green-50' };
      case 'warning':
        return { icon: AlertCircle, label: 'Warning', color: 'text-yellow-500', bgColor: 'bg-yellow-50' };
      case 'critical':
        return { icon: AlertCircle, label: 'Critical', color: 'text-red-500', bgColor: 'bg-red-50' };
      case 'offline':
        return { icon: WifiOff, label: 'Offline', color: 'text-gray-500', bgColor: 'bg-gray-50' };
      default:
        return { icon: Activity, label: 'Unknown', color: 'text-gray-500', bgColor: 'bg-gray-50' };
    }
  };

  if (!connection) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <WifiOff className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">No Zoom connection to monitor</p>
        </CardContent>
      </Card>
    );
  }

  if (isLoading && !healthData) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">Checking connection health...</p>
        </CardContent>
      </Card>
    );
  }

  const statusInfo = getStatusInfo(healthData?.status || 'offline');
  const StatusIcon = statusInfo.icon;

  return (
    <div className="space-y-6">
      {/* Overall Health Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Connection Health Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className={`p-4 rounded-lg ${statusInfo.bgColor} mb-4`}>
            <div className="flex items-center gap-2 mb-2">
              <StatusIcon className={`h-5 w-5 ${statusInfo.color}`} />
              <span className={`font-medium ${statusInfo.color}`}>{statusInfo.label}</span>
            </div>
            {healthData?.lastError && (
              <p className="text-sm text-red-600">{healthData.lastError}</p>
            )}
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {healthData?.uptime.toFixed(1) || 0}%
              </div>
              <div className="text-sm text-muted-foreground">Uptime</div>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {healthData?.averageResponseTime.toFixed(0) || 0}ms
              </div>
              <div className="text-sm text-muted-foreground">Avg Response</div>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {healthData?.successRate.toFixed(1) || 0}%
              </div>
              <div className="text-sm text-muted-foreground">Success Rate</div>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">
                {healthHistory.length}
              </div>
              <div className="text-sm text-muted-foreground">Health Checks</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Response Time Chart */}
      {healthHistory.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Response Time Trends
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={healthHistory.slice(-20)}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="timestamp" 
                    tick={{ fontSize: 12 }}
                    tickFormatter={(timestamp) => new Date(timestamp).toLocaleTimeString()}
                  />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip 
                    labelFormatter={(timestamp) => new Date(timestamp).toLocaleString()}
                    formatter={(value, name) => [`${value}ms`, 'Response Time']}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="responseTime" 
                    stroke="#3B82F6" 
                    strokeWidth={2}
                    dot={{ fill: '#3B82F6', r: 3 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Health Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Health Management</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Button variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              Manual Health Check
            </Button>
            <Button variant="outline" size="sm">
              <Zap className="h-4 w-4 mr-2" />
              Auto-Recovery
            </Button>
            <Button variant="outline" size="sm">
              <Activity className="h-4 w-4 mr-2" />
              View Full History
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
