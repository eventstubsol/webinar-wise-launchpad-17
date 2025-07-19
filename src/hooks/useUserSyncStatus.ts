
import { useWebinarMetrics } from '@/hooks/useWebinarMetrics';
import { useZoomConnection } from '@/hooks/useZoomConnection';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { TokenStatus } from '@/services/zoom/utils/tokenUtils';

export const useUserSyncStatus = () => {
  const { metrics, loading: metricsLoading } = useWebinarMetrics();
  const { connection, tokenStatus, isLoading: connectionLoading } = useZoomConnection();

  // Check if user has any completed sync logs
  const { data: syncHistory, isLoading: syncHistoryLoading } = useQuery({
    queryKey: ['sync-history', connection?.id],
    queryFn: async () => {
      if (!connection?.id) return [];

      const { data, error } = await supabase
        .from('zoom_sync_logs')
        .select('*')
        .eq('connection_id', connection.id)
        .eq('sync_status', 'completed')
        .order('completed_at', { ascending: false })
        .limit(1);

      if (error) {
        console.error('Error fetching sync history:', error);
        return [];
      }

      return data || [];
    },
    enabled: !!connection?.id,
  });

  const isLoading = metricsLoading || connectionLoading || syncHistoryLoading;
  const isZoomConnected = tokenStatus === TokenStatus.VALID;
  const hasCompletedSync = syncHistory && syncHistory.length > 0;
  const hasWebinarData = metrics && !metrics.isEmpty;

  // Determine user status
  let userStatus: 'loading' | 'no_connection' | 'first_time' | 'returning' = 'loading';

  if (!isLoading) {
    if (!isZoomConnected) {
      userStatus = 'no_connection';
    } else if (!hasCompletedSync && !hasWebinarData) {
      userStatus = 'first_time';
    } else {
      userStatus = 'returning';
    }
  }

  return {
    userStatus,
    isLoading,
    isZoomConnected,
    hasCompletedSync,
    hasWebinarData,
    metrics,
    connection,
  };
};
