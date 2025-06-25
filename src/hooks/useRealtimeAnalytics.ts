
import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface AnalyticsCache {
  id: string;
  cache_key: string;
  cache_data: any;
  cache_version: number;
  dependencies: string[];
  expires_at: string;
  created_at: string;
  updated_at: string;
}

interface ProcessingTask {
  id: string;
  task_type: string;
  task_data: any;
  priority: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  webinar_id?: string;
  user_id?: string;
  retry_count: number;
  max_retries: number;
  scheduled_at: string;
  started_at?: string;
  completed_at?: string;
  error_message?: string;
  created_at: string;
  updated_at: string;
}

interface AnalyticsEvent {
  id: string;
  type: string;
  data: any;
  timestamp: string;
}

interface UseRealtimeAnalyticsOptions {
  webinarId?: string;
  enableProcessingUpdates?: boolean;
  enableCacheUpdates?: boolean;
}

export const useRealtimeAnalytics = (options: UseRealtimeAnalyticsOptions = {}) => {
  const {
    webinarId,
    enableProcessingUpdates = false,
    enableCacheUpdates = false,
  } = options;

  const [isConnected, setIsConnected] = useState(false);
  const [processingTasks, setProcessingTasks] = useState<ProcessingTask[]>([]);
  const [analyticsEvents, setAnalyticsEvents] = useState<AnalyticsEvent[]>([]);
  const [cacheData, setCacheData] = useState<Map<string, any>>(new Map());
  
  const channelRef = useRef<any>(null);
  const taskQueueRef = useRef<Map<string, any>>(new Map());

  // Load initial processing tasks
  const loadProcessingTasks = useCallback(async () => {
    if (!enableProcessingUpdates) return;

    try {
      const { data, error } = await supabase
        .from('processing_queue')
        .select('*')
        .in('status', ['pending', 'processing'])
        .order('priority', { ascending: true })
        .order('scheduled_at', { ascending: true });

      if (error) throw error;
      setProcessingTasks(data || []);
    } catch (error) {
      console.error('Error loading processing tasks:', error);
    }
  }, [enableProcessingUpdates]);

  // Cache management functions
  const getCachedData = useCallback((key: string) => {
    return cacheData.get(key);
  }, [cacheData]);

  const setCachedData = useCallback(async (key: string, data: any, dependencies: string[] = [], ttlHours: number = 1) => {
    try {
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + ttlHours);

      const { error } = await supabase
        .from('analytics_cache')
        .upsert({
          cache_key: key,
          cache_data: data,
          dependencies,
          expires_at: expiresAt.toISOString(),
        });

      if (error) throw error;
      
      setCacheData(prev => new Map(prev.set(key, data)));
    } catch (error) {
      console.error('Error setting cache data:', error);
    }
  }, []);

  const invalidateCache = useCallback(async (pattern: string) => {
    try {
      const { error } = await supabase.rpc('invalidate_cache_dependencies', {
        dep_pattern: pattern
      });

      if (error) throw error;

      // Update local cache
      setCacheData(prev => {
        const newCache = new Map(prev);
        for (const [key] of newCache) {
          if (key.includes(pattern)) {
            newCache.delete(key);
          }
        }
        return newCache;
      });
    } catch (error) {
      console.error('Error invalidating cache:', error);
    }
  }, []);

  // Task queue management
  const enqueueAnalysisTask = useCallback(async (
    taskType: string,
    taskData: any,
    priority: number = 5
  ) => {
    try {
      const { data, error } = await supabase.rpc('enqueue_task', {
        p_task_type: taskType,
        p_task_data: taskData,
        p_priority: priority,
        p_webinar_id: webinarId || null,
        p_user_id: null, // Will be set by RLS
      });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error enqueuing task:', error);
      return null;
    }
  }, [webinarId]);

  // Set up real-time subscriptions
  useEffect(() => {
    if (!isConnected) {
      setIsConnected(true);
    }

    const setupSubscriptions = async () => {
      // Load initial data
      await loadProcessingTasks();

      // Set up processing queue subscription
      if (enableProcessingUpdates) {
        const processingChannel = supabase
          .channel('processing-updates')
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'processing_queue',
            },
            (payload) => {
              const task = payload.new as ProcessingTask;
              
              if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
                setProcessingTasks(prev => {
                  const filtered = prev.filter(t => t.id !== task.id);
                  if (task.status === 'pending' || task.status === 'processing') {
                    return [...filtered, task].sort((a, b) => a.priority - b.priority);
                  }
                  return filtered;
                });

                // Emit analytics event
                setAnalyticsEvents(prev => [
                  ...prev.slice(-99), // Keep last 100 events
                  {
                    id: `${Date.now()}-${Math.random()}`,
                    type: `task_${payload.eventType.toLowerCase()}`,
                    data: task,
                    timestamp: new Date().toISOString(),
                  }
                ]);
              } else if (payload.eventType === 'DELETE') {
                setProcessingTasks(prev => prev.filter(t => t.id !== payload.old.id));
              }
            }
          )
          .subscribe();

        channelRef.current = processingChannel;
      }

      // Set up cache subscription
      if (enableCacheUpdates) {
        const cacheChannel = supabase
          .channel('cache-updates')
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'analytics_cache',
            },
            (payload) => {
              if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
                const cacheItem = payload.new as AnalyticsCache;
                setCacheData(prev => new Map(prev.set(cacheItem.cache_key, cacheItem.cache_data)));
              } else if (payload.eventType === 'DELETE') {
                const oldItem = payload.old as AnalyticsCache;
                setCacheData(prev => {
                  const newCache = new Map(prev);
                  newCache.delete(oldItem.cache_key);
                  return newCache;
                });
              }
            }
          )
          .subscribe();

        if (!channelRef.current) {
          channelRef.current = cacheChannel;
        }
      }
    };

    setupSubscriptions();

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [enableProcessingUpdates, enableCacheUpdates, loadProcessingTasks]);

  return {
    isConnected,
    processingTasks,
    analyticsEvents,
    enqueueAnalysisTask,
    getCachedData,
    setCachedData,
    invalidateCache,
  };
};
