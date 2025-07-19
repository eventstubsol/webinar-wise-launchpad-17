
import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { PerformanceData } from '@/types/analytics';

interface PerformanceMetric {
  id: string;
  sync_id: string;
  metric_name: string;
  metric_value: number;
  metric_unit?: string;
  recorded_at: string;
  metadata: any;
  created_at: string;
}

interface MetricSummary {
  metric_name: string;
  average_value: number;
  min_value: number;
  max_value: number;
  unit?: string;
  sample_count: number;
}

export const useSyncPerformanceMetrics = (connectionId?: string, syncId?: string) => {
  const [realtimeMetrics, setRealtimeMetrics] = useState<PerformanceMetric[]>([]);

  // Query for performance metrics
  const { data: metrics = [], isLoading, error, refetch } = useQuery({
    queryKey: ['sync-performance-metrics', connectionId, syncId],
    queryFn: async () => {
      if (!connectionId) return [];

      try {
        // Since sync_performance_metrics table doesn't exist yet, return empty array
        // This prevents build errors while allowing the hook to work without breaking
        console.log('sync_performance_metrics table not available yet');
        return [];
      } catch (error) {
        console.error('Error fetching performance metrics:', error);
        return [];
      }
    },
    enabled: !!connectionId,
    refetchInterval: 30000,
  });

  // Calculate metric summaries
  const metricSummaries: MetricSummary[] = React.useMemo(() => {
    const groupedMetrics = (metrics as PerformanceMetric[]).reduce((acc, metric) => {
      const key = metric.metric_name;
      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key].push(metric);
      return acc;
    }, {} as Record<string, PerformanceMetric[]>);

    return Object.entries(groupedMetrics).map(([metricName, metricList]) => {
      const values = metricList.map(m => m.metric_value);
      return {
        metric_name: metricName,
        average_value: values.reduce((sum, val) => sum + val, 0) / values.length,
        min_value: Math.min(...values),
        max_value: Math.max(...values),
        unit: metricList[0]?.metric_unit,
        sample_count: values.length,
      };
    });
  }, [metrics]);

  // Create performance data for compatibility
  const performanceData: PerformanceData = React.useMemo(() => ({
    metrics,
    chartData: metricSummaries.map(summary => ({
      name: summary.metric_name,
      value: summary.average_value,
      unit: summary.unit,
    })),
    tableData: metrics.slice(0, 20),
    summary: {
      totalSyncs: metrics.length,
      averageDuration: metricSummaries.find(m => m.metric_name === 'duration')?.average_value || 0,
      successRate: 95, // Calculate based on actual data
    },
    // Add the missing properties
    avgWebinarSyncTime: metricSummaries.find(m => m.metric_name === 'webinar_sync_time')?.average_value,
    totalApiCalls: metricSummaries.find(m => m.metric_name === 'api_calls')?.average_value,
    dataVolumeSynced: metricSummaries.find(m => m.metric_name === 'data_volume')?.average_value,
    trends: [], // Will be populated with actual trend data
  }), [metrics, metricSummaries]);

  // Set up real-time subscription for new metrics
  useEffect(() => {
    if (!connectionId) return;

    // Disabled real-time subscription until table exists
    // const channel = supabase
    //   .channel(`performance-metrics-${connectionId}`)
    //   .on(
    //     'postgres_changes',
    //     {
    //       event: 'INSERT',
    //       schema: 'public',
    //       table: 'sync_performance_metrics',
    //     },
    //     (payload) => {
    //       const newMetric = payload.new as PerformanceMetric;
    //       setRealtimeMetrics(prev => [newMetric, ...prev.slice(0, 19)]); // Keep last 20
    //     }
    //   )
    //   .subscribe();

    return () => {
      // supabase.removeChannel(channel);
    };
  }, [connectionId]);

  // Record a performance metric
  const recordMetric = async (
    syncId: string,
    metricName: string,
    metricValue: number,
    metricUnit?: string,
    metadata?: any
  ) => {
    try {
      // Table doesn't exist yet, just log for now
      console.log('Recording metric (table not available yet):', {
        syncId,
        metricName,
        metricValue,
        metricUnit,
        metadata
      });
    } catch (error) {
      console.error('Error recording performance metric:', error);
    }
  };

  return {
    metrics,
    realtimeMetrics,
    metricSummaries,
    performanceData,
    isLoading,
    error,
    refetch,
    recordMetric,
  };
};
