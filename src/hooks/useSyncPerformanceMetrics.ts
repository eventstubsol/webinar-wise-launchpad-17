
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface PerformanceMetric {
  id: string;
  sync_id: string;
  metric_name: string;
  metric_value: number;
  metric_unit: string | null;
  recorded_at: string;
  metadata: any;
}

interface SyncPerformanceData {
  avgWebinarSyncTime: number;
  totalApiCalls: number;
  successRate: number;
  dataVolumeSynced: number;
  trends: Array<{
    date: string;
    avgDuration: number;
    apiCalls: number;
    successRate: number;
  }>;
}

export const useSyncPerformanceMetrics = (connectionId: string) => {
  const [performanceData, setPerformanceData] = useState<SyncPerformanceData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadPerformanceMetrics = async () => {
    if (!connectionId) return;

    try {
      setIsLoading(true);
      setError(null);

      // Get recent sync performance metrics
      const { data: metrics, error: metricsError } = await supabase
        .from('sync_performance_metrics')
        .select(`
          *,
          zoom_sync_logs!inner(
            connection_id,
            created_at,
            sync_status
          )
        `)
        .eq('zoom_sync_logs.connection_id', connectionId)
        .gte('recorded_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
        .order('recorded_at', { ascending: false });

      if (metricsError) throw metricsError;

      // Calculate performance data
      const performanceMetrics = metrics as (PerformanceMetric & {
        zoom_sync_logs: { connection_id: string; created_at: string; sync_status: string };
      })[];

      // Calculate averages and trends
      const avgSyncTimes = performanceMetrics
        .filter(m => m.metric_name === 'sync_duration' && m.metric_unit === 'seconds')
        .map(m => m.metric_value);

      const totalApiCalls = performanceMetrics
        .filter(m => m.metric_name === 'api_calls_made')
        .reduce((sum, m) => sum + m.metric_value, 0);

      const successfulSyncs = performanceMetrics
        .filter(m => m.zoom_sync_logs.sync_status === 'completed')
        .length;

      const totalSyncs = new Set(performanceMetrics.map(m => m.sync_id)).size;

      const dataVolume = performanceMetrics
        .filter(m => m.metric_name === 'data_volume_bytes')
        .reduce((sum, m) => sum + m.metric_value, 0);

      // Group by date for trends
      const trendData = performanceMetrics.reduce((acc, metric) => {
        const date = new Date(metric.recorded_at).toISOString().split('T')[0];
        if (!acc[date]) {
          acc[date] = {
            date,
            durations: [],
            apiCalls: 0,
            totalSyncs: new Set(),
            successfulSyncs: new Set(),
          };
        }

        if (metric.metric_name === 'sync_duration') {
          acc[date].durations.push(metric.metric_value);
        }
        if (metric.metric_name === 'api_calls_made') {
          acc[date].apiCalls += metric.metric_value;
        }

        acc[date].totalSyncs.add(metric.sync_id);
        if (metric.zoom_sync_logs.sync_status === 'completed') {
          acc[date].successfulSyncs.add(metric.sync_id);
        }

        return acc;
      }, {} as any);

      const trends = Object.values(trendData).map((day: any) => ({
        date: day.date,
        avgDuration: day.durations.length > 0 
          ? day.durations.reduce((a: number, b: number) => a + b, 0) / day.durations.length 
          : 0,
        apiCalls: day.apiCalls,
        successRate: day.totalSyncs.size > 0 
          ? (day.successfulSyncs.size / day.totalSyncs.size) * 100 
          : 0,
      }));

      setPerformanceData({
        avgWebinarSyncTime: avgSyncTimes.length > 0 
          ? avgSyncTimes.reduce((a, b) => a + b, 0) / avgSyncTimes.length 
          : 0,
        totalApiCalls,
        successRate: totalSyncs > 0 ? (successfulSyncs / totalSyncs) * 100 : 0,
        dataVolumeSynced: dataVolume,
        trends: trends.sort((a, b) => a.date.localeCompare(b.date)),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load performance metrics');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadPerformanceMetrics();
  }, [connectionId]);

  return {
    performanceData,
    isLoading,
    error,
    refreshMetrics: loadPerformanceMetrics,
  };
};
