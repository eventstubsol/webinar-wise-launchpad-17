
import { useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';

export const useDashboardRefresh = () => {
  const queryClient = useQueryClient();

  const refreshDashboardData = useCallback(async () => {
    console.log('🔄 Refreshing all dashboard data...');
    
    // Invalidate all relevant queries
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['webinar-metrics'] }),
      queryClient.invalidateQueries({ queryKey: ['webinars'] }),
      queryClient.invalidateQueries({ queryKey: ['sync-history'] }),
      queryClient.invalidateQueries({ queryKey: ['zoom-connections'] }),
      queryClient.invalidateQueries({ queryKey: ['analytics'] }),
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] }),
    ]);

    console.log('✅ Dashboard data refresh completed');
  }, [queryClient]);

  return { refreshDashboardData };
};
