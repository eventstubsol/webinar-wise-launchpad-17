
import { useRealtimeAnalytics } from '@/hooks/useRealtimeAnalytics';

export const useRealtimeDashboard = (connectionId: string) => {
  const realtimeData = useRealtimeAnalytics(connectionId);

  return {
    ...realtimeData,
    // Add missing properties expected by the dashboard
    isConnected: true,
    processingTasks: realtimeData.activeTasks,
    analyticsEvents: [],
    enqueueAnalysisTask: async () => {},
    getCachedData: () => null,
    setCachedData: () => {},
    invalidateCache: () => {},
  };
};
