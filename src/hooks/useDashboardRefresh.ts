
import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useState } from 'react';

export const useDashboardRefresh = () => {
  const queryClient = useQueryClient();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const refreshDashboardData = useCallback(async () => {
    console.log('🔄 Refreshing all dashboard data...');
    setIsRefreshing(true);
    
    try {
      // Invalidate all relevant queries in parallel
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['webinar-metrics'] }),
        queryClient.invalidateQueries({ queryKey: ['webinars'] }),
        queryClient.invalidateQueries({ queryKey: ['sync-history'] }),
        queryClient.invalidateQueries({ queryKey: ['zoom-connections'] }),
        queryClient.invalidateQueries({ queryKey: ['zoom-connection'] }),
        queryClient.invalidateQueries({ queryKey: ['analytics'] }),
        queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] }),
        queryClient.invalidateQueries({ queryKey: ['last-sync'] }),
      ]);

      console.log('✅ Dashboard data refresh completed');
      
      // Dispatch custom event for components that need to know about refresh
      window.dispatchEvent(new CustomEvent('dashboard-refreshed'));
      
    } catch (error) {
      console.error('❌ Dashboard refresh failed:', error);
      throw error;
    } finally {
      setIsRefreshing(false);
    }
  }, [queryClient]);

  const triggerRefresh = useCallback(() => {
    // Dispatch event that Dashboard component listens to
    window.dispatchEvent(new CustomEvent('dashboard-refresh'));
  }, []);

  return { 
    refreshDashboardData, 
    triggerRefresh,
    isRefreshing 
  };
};
