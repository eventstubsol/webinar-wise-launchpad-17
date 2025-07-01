// Quick fix to prevent the error from showing in the UI
// This wraps the metrics fetch with better error handling

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useZoomConnection } from '@/hooks/useZoomConnection';
import { WebinarMetricsDataService } from './useWebinarMetrics/dataService';
import { WebinarMetricsCalculator } from './useWebinarMetrics/metricsCalculator';
import type { WebinarMetrics } from './useWebinarMetrics/types';

export const useWebinarMetrics = () => {
  const { user } = useAuth();
  const { connection } = useZoomConnection();
  const [metrics, setMetrics] = useState<WebinarMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    const fetchMetrics = async () => {
      try {
        setLoading(true);
        setError(null);

        // Handle case when no connection exists
        if (!connection?.id) {
          setMetrics(WebinarMetricsCalculator.createEmptyMetrics());
          return;
        }

        // Fetch sync history and webinars
        const { lastSync, syncHistoryCount } = await WebinarMetricsDataService.fetchSyncHistory(connection.id);
        const webinars = await WebinarMetricsDataService.fetchWebinars(connection.id);

        // Calculate and set metrics
        const metricsData = await WebinarMetricsCalculator.calculateMetrics(webinars, lastSync, syncHistoryCount);
        setMetrics(metricsData);

      } catch (err: any) {
        console.error('Error fetching webinar metrics:', err);
        // Don't show PostgREST errors to users - these are internal
        if (err?.code === 'PGRST200') {
          setError('Unable to load metrics. Please try refreshing the page.');
        } else {
          setError(err instanceof Error ? err.message : 'Failed to fetch metrics');
        }
        setMetrics(WebinarMetricsCalculator.createEmptyMetrics());
      } finally {
        setLoading(false);
      }
    };

    fetchMetrics();
  }, [user?.id, connection?.id]);

  return { metrics, loading, error, refetch: () => setLoading(true) };
};

// Re-export types for backward compatibility
export type { WebinarMetrics } from './useWebinarMetrics/types';
