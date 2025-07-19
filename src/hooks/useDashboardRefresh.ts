
import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useState } from 'react';

export const useDashboardRefresh = () => {
  const queryClient = useQueryClient();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const refreshDashboardData = useCallback(async () => {
    console.log('🔄 Dashboard: Starting comprehensive data refresh...');
    setIsRefreshing(true);
    
    try {
      // Step 1: Clear all relevant caches first
      console.log('🧹 Dashboard: Clearing query caches...');
      queryClient.removeQueries({ queryKey: ['zoom-connection'] });
      queryClient.removeQueries({ queryKey: ['zoom-connections'] });
      queryClient.removeQueries({ queryKey: ['zoom-credentials'] });
      
      // Step 2: Invalidate and refetch all relevant queries in parallel
      console.log('🔄 Dashboard: Invalidating and refetching queries...');
      await Promise.allSettled([
        queryClient.invalidateQueries({ queryKey: ['webinar-metrics'] }),
        queryClient.invalidateQueries({ queryKey: ['webinars'] }),
        queryClient.invalidateQueries({ queryKey: ['sync-history'] }),
        queryClient.invalidateQueries({ queryKey: ['zoom-connections'] }),
        queryClient.invalidateQueries({ queryKey: ['zoom-connection'] }),
        queryClient.invalidateQueries({ queryKey: ['analytics'] }),
        queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] }),
        queryClient.invalidateQueries({ queryKey: ['last-sync'] }),
        queryClient.invalidateQueries({ queryKey: ['zoom-credentials'] }),
      ]);

      // Step 3: Wait for queries to settle
      await new Promise(resolve => setTimeout(resolve, 2000));

      console.log('✅ Dashboard: Data refresh completed successfully');
      
      // Step 4: Dispatch custom event for components that need to know about refresh
      window.dispatchEvent(new CustomEvent('dashboard-refreshed', {
        detail: { timestamp: Date.now() }
      }));
      
    } catch (error) {
      console.error('❌ Dashboard: Refresh failed:', error);
      throw error;
    } finally {
      setIsRefreshing(false);
    }
  }, [queryClient]);

  const triggerRefresh = useCallback(() => {
    console.log('🎯 Dashboard: Triggering refresh event...');
    // Dispatch event that Dashboard component listens to
    window.dispatchEvent(new CustomEvent('dashboard-refresh'));
  }, []);

  const forceConnectionRefresh = useCallback(async () => {
    console.log('🔄 Dashboard: Force refreshing connection data...');
    
    // Remove and invalidate connection-specific queries
    queryClient.removeQueries({ queryKey: ['zoom-connection'] });
    queryClient.removeQueries({ queryKey: ['zoom-connections'] });
    
    await queryClient.invalidateQueries({ queryKey: ['zoom-connection'] });
    await queryClient.invalidateQueries({ queryKey: ['zoom-connections'] });
    
    // Wait for fresh data
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    console.log('✅ Dashboard: Connection refresh completed');
  }, [queryClient]);

  return { 
    refreshDashboardData, 
    triggerRefresh,
    forceConnectionRefresh,
    isRefreshing 
  };
};
