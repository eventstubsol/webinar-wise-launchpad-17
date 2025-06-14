
import { useState, useEffect, useCallback } from 'react';
import { useRealtimeAnalytics } from './useRealtimeAnalytics';
import { webSocketService } from '@/services/realtime/WebSocketService';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface RealtimeDashboardData {
  participants: any[];
  polls: any[];
  qna: any[];
  engagement: any;
  insights: any[];
  lastUpdated: string;
}

interface LiveAlert {
  id: string;
  type: 'warning' | 'info' | 'success' | 'error';
  message: string;
  timestamp: string;
  webinarId?: string;
  dismissed?: boolean;
}

export const useRealtimeDashboard = (webinarId?: string) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [dashboardData, setDashboardData] = useState<RealtimeDashboardData>({
    participants: [],
    polls: [],
    qna: [],
    engagement: null,
    insights: [],
    lastUpdated: new Date().toISOString(),
  });
  const [liveAlerts, setLiveAlerts] = useState<LiveAlert[]>([]);
  const [connectionHealth, setConnectionHealth] = useState({
    isConnected: false,
    lastHeartbeat: null as string | null,
    reconnectAttempts: 0,
  });

  const {
    isConnected,
    processingTasks,
    analyticsEvents,
    enqueueAnalysisTask,
    getCachedData,
    setCachedData,
    invalidateCache,
  } = useRealtimeAnalytics({
    webinarId,
    enableProcessingUpdates: true,
    enableCacheUpdates: true,
  });

  // Setup WebSocket subscriptions for live dashboard updates
  useEffect(() => {
    if (!user?.id) return;

    const subscriptions: string[] = [];

    // Subscribe to analytics updates
    const analyticsSubId = webSocketService.subscribe(
      `analytics-dashboard-${user.id}`,
      (message) => {
        switch (message.type) {
          case 'cache_update':
            handleCacheUpdate(message.data);
            break;
          case 'realtime_event':
            handleRealtimeEvent(message.data);
            break;
        }
      }
    );
    subscriptions.push(analyticsSubId);

    // Subscribe to webinar-specific updates if webinarId is provided
    if (webinarId) {
      const webinarSubId = webSocketService.subscribe(
        `webinar-live-${webinarId}`,
        (message) => {
          if (message.type === 'webinar_data_update') {
            handleWebinarDataUpdate(message.data);
          }
        }
      );
      subscriptions.push(webinarSubId);
    }

    // Monitor connection health
    const healthInterval = setInterval(() => {
      setConnectionHealth(prev => ({
        ...prev,
        isConnected: webSocketService.getConnectionStatus(),
        lastHeartbeat: new Date().toISOString(),
      }));
    }, 10000); // Check every 10 seconds

    return () => {
      subscriptions.forEach(id => webSocketService.unsubscribe(id));
      clearInterval(healthInterval);
    };
  }, [user?.id, webinarId]);

  const handleCacheUpdate = useCallback((cacheData: any) => {
    if (cacheData.eventType === 'DELETE') return;

    const { cache_key, cache_data } = cacheData.new || cacheData;
    
    // Update dashboard data based on cache key
    if (cache_key.startsWith('engagement_analysis:')) {
      setDashboardData(prev => ({
        ...prev,
        engagement: cache_data,
        lastUpdated: new Date().toISOString(),
      }));
    } else if (cache_key.startsWith('poll_analysis:')) {
      setDashboardData(prev => ({
        ...prev,
        polls: cache_data.polls || prev.polls,
        lastUpdated: new Date().toISOString(),
      }));
    } else if (cache_key.startsWith('qna_analysis:')) {
      setDashboardData(prev => ({
        ...prev,
        qna: cache_data.qna || prev.qna,
        lastUpdated: new Date().toISOString(),
      }));
    }
  }, []);

  const handleRealtimeEvent = useCallback((eventData: any) => {
    const { event_type, event_data } = eventData;

    switch (event_type) {
      case 'engagement_alert':
        addLiveAlert({
          type: event_data.severity || 'info',
          message: event_data.message,
          webinarId: event_data.webinar_id,
        });
        break;
      case 'processing_complete':
        toast({
          title: "Analysis Complete",
          description: `${event_data.task_type} finished processing`,
        });
        break;
      case 'threshold_breach':
        addLiveAlert({
          type: 'warning',
          message: `${event_data.metric} exceeded threshold: ${event_data.value}`,
          webinarId: event_data.webinar_id,
        });
        break;
    }
  }, [toast]);

  const handleWebinarDataUpdate = useCallback((updateData: any) => {
    const { table, eventType, new: newData } = updateData;

    if (eventType === 'INSERT' || eventType === 'UPDATE') {
      // Queue background analysis for new data
      if (table === 'zoom_participants') {
        enqueueAnalysisTask('participant_analysis', {
          webinar_id: webinarId,
          participant_id: newData.id,
        }, 2); // High priority for live webinars
      } else if (table === 'zoom_poll_responses') {
        enqueueAnalysisTask('poll_analysis', {
          webinar_id: webinarId,
        }, 1); // Highest priority
      } else if (table === 'zoom_qna') {
        enqueueAnalysisTask('qna_analysis', {
          webinar_id: webinarId,
        }, 1); // Highest priority
      }

      // Trigger comprehensive engagement analysis
      enqueueAnalysisTask('engagement_analysis', {
        webinar_id: webinarId,
      }, 3); // Medium priority
    }
  }, [webinarId, enqueueAnalysisTask]);

  const addLiveAlert = useCallback((alert: Omit<LiveAlert, 'id' | 'timestamp'>) => {
    const newAlert: LiveAlert = {
      ...alert,
      id: `alert-${Date.now()}-${Math.random()}`,
      timestamp: new Date().toISOString(),
    };

    setLiveAlerts(prev => [newAlert, ...prev.slice(0, 19)]); // Keep last 20 alerts

    // Auto-dismiss info alerts after 10 seconds
    if (alert.type === 'info') {
      setTimeout(() => {
        dismissAlert(newAlert.id);
      }, 10000);
    }
  }, []);

  const dismissAlert = useCallback((alertId: string) => {
    setLiveAlerts(prev => prev.map(alert => 
      alert.id === alertId ? { ...alert, dismissed: true } : alert
    ));
  }, []);

  const refreshDashboard = useCallback(async () => {
    if (!webinarId) return;

    try {
      // Check cache first
      const cachedEngagement = getCachedData(`engagement_analysis:${webinarId}`);
      const cachedPolls = getCachedData(`poll_analysis:${webinarId}`);
      const cachedQna = getCachedData(`qna_analysis:${webinarId}`);

      if (cachedEngagement || cachedPolls || cachedQna) {
        setDashboardData(prev => ({
          ...prev,
          engagement: cachedEngagement || prev.engagement,
          polls: cachedPolls?.polls || prev.polls,
          qna: cachedQna?.qna || prev.qna,
          lastUpdated: new Date().toISOString(),
        }));
      }

      // Queue fresh analysis if cache is old or missing
      if (!cachedEngagement) {
        await enqueueAnalysisTask('engagement_analysis', { webinar_id: webinarId }, 2);
      }
      if (!cachedPolls) {
        await enqueueAnalysisTask('poll_analysis', { webinar_id: webinarId }, 2);
      }
      if (!cachedQna) {
        await enqueueAnalysisTask('qna_analysis', { webinar_id: webinarId }, 2);
      }

    } catch (error) {
      console.error('Error refreshing dashboard:', error);
      addLiveAlert({
        type: 'error',
        message: 'Failed to refresh dashboard data',
      });
    }
  }, [webinarId, getCachedData, enqueueAnalysisTask, addLiveAlert]);

  const invalidateDashboardCache = useCallback(async () => {
    if (!webinarId) return;

    await invalidateCache(`engagement_analysis:${webinarId}`);
    await invalidateCache(`poll_analysis:${webinarId}`);
    await invalidateCache(`qna_analysis:${webinarId}`);
    
    // Refresh after invalidation
    await refreshDashboard();
  }, [webinarId, invalidateCache, refreshDashboard]);

  // Auto-refresh dashboard periodically
  useEffect(() => {
    const refreshInterval = setInterval(refreshDashboard, 30000); // Every 30 seconds
    return () => clearInterval(refreshInterval);
  }, [refreshDashboard]);

  return {
    dashboardData,
    liveAlerts,
    connectionHealth: { ...connectionHealth, isConnected },
    processingTasks,
    analyticsEvents,
    actions: {
      refreshDashboard,
      invalidateDashboardCache,
      dismissAlert,
      enqueueAnalysisTask,
    },
  };
};
