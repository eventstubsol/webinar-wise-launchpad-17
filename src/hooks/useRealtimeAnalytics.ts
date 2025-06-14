
import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface AnalyticsEvent {
  id: string;
  event_type: string;
  event_data: any;
  timestamp: string;
}

interface ProcessingTask {
  id: string;
  task_type: string;
  status: string;
  priority: number;
  progress?: number;
  error_message?: string;
  webinar_id?: string;
}

interface CacheEntry {
  cache_key: string;
  cache_data: any;
  cache_version: number;
  expires_at: string;
}

interface UseRealtimeAnalyticsOptions {
  webinarId?: string;
  enableProcessingUpdates?: boolean;
  enableCacheUpdates?: boolean;
  reconnectInterval?: number;
}

export const useRealtimeAnalytics = (options: UseRealtimeAnalyticsOptions = {}) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isConnected, setIsConnected] = useState(false);
  const [processingTasks, setProcessingTasks] = useState<ProcessingTask[]>([]);
  const [cacheEntries, setCacheEntries] = useState<Map<string, CacheEntry>>(new Map());
  const [analyticsEvents, setAnalyticsEvents] = useState<AnalyticsEvent[]>([]);
  const [connectionAttempts, setConnectionAttempts] = useState(0);
  const subscriptionsRef = useRef<any[]>([]);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();

  // Connection management with exponential backoff
  const connect = useCallback(() => {
    if (!user?.id) return;

    try {
      // Subscribe to processing queue updates
      if (options.enableProcessingUpdates !== false) {
        const processingChannel = supabase
          .channel(`processing-queue-${user.id}`)
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'processing_queue',
              filter: `user_id=eq.${user.id}`,
            },
            (payload) => {
              // Handle DELETE events safely
              if (payload.eventType === 'DELETE') {
                if (payload.old && typeof payload.old === 'object' && 'id' in payload.old) {
                  setProcessingTasks(prev => prev.filter(t => t.id !== payload.old.id));
                }
                return;
              }

              // Handle INSERT and UPDATE events
              if (payload.new && typeof payload.new === 'object' && 'id' in payload.new) {
                const task = payload.new as ProcessingTask;
                
                setProcessingTasks(prev => {
                  const existing = prev.findIndex(t => t.id === task.id);
                  if (existing >= 0) {
                    const updated = [...prev];
                    updated[existing] = task;
                    return updated;
                  } else {
                    return [...prev, task];
                  }
                });

                // Show toast for important status changes
                if (task.status === 'completed') {
                  toast({
                    title: "Analysis Complete",
                    description: `${task.task_type} finished successfully`,
                  });
                } else if (task.status === 'failed') {
                  toast({
                    title: "Analysis Failed",
                    description: task.error_message || `${task.task_type} failed`,
                    variant: "destructive",
                  });
                }
              }
            }
          )
          .subscribe((status) => {
            setIsConnected(status === 'SUBSCRIBED');
            if (status === 'SUBSCRIBED') {
              setConnectionAttempts(0);
            }
          });

        subscriptionsRef.current.push(processingChannel);
      }

      // Subscribe to cache updates
      if (options.enableCacheUpdates !== false) {
        const cacheChannel = supabase
          .channel('analytics-cache-global')
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'analytics_cache',
            },
            (payload) => {
              if (payload.eventType === 'DELETE') {
                if (payload.old && typeof payload.old === 'object' && 'cache_key' in payload.old) {
                  setCacheEntries(prev => {
                    const updated = new Map(prev);
                    updated.delete(payload.old.cache_key);
                    return updated;
                  });
                }
              } else {
                if (payload.new && typeof payload.new === 'object' && 'cache_key' in payload.new) {
                  const cacheEntry = payload.new as CacheEntry;
                  setCacheEntries(prev => {
                    const updated = new Map(prev);
                    updated.set(cacheEntry.cache_key, cacheEntry);
                    return updated;
                  });
                }
              }
            }
          )
          .subscribe();

        subscriptionsRef.current.push(cacheChannel);
      }

      // Subscribe to realtime events
      const eventsChannel = supabase
        .channel(`analytics-events-${user.id}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'realtime_events',
            filter: `target_users=cs.{${user.id}}`,
          },
          (payload) => {
            if (payload.new && typeof payload.new === 'object' && 'id' in payload.new) {
              const event = payload.new as AnalyticsEvent;
              setAnalyticsEvents(prev => [event, ...prev.slice(0, 49)]); // Keep last 50 events
            }
          }
        )
        .subscribe();

      subscriptionsRef.current.push(eventsChannel);

      // Subscribe to webinar-specific updates if webinarId is provided
      if (options.webinarId) {
        const webinarChannel = supabase
          .channel(`webinar-analytics-${options.webinarId}`)
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'zoom_participants',
              filter: `webinar_id=eq.${options.webinarId}`,
            },
            (payload) => {
              // Trigger background processing for new participant data
              if (payload.new && typeof payload.new === 'object' && 'id' in payload.new) {
                enqueueAnalysisTask('participant_analysis', {
                  webinar_id: options.webinarId,
                  participant_id: payload.new.id,
                }, 3); // Medium priority
              }
            }
          )
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'zoom_poll_responses',
              filter: `poll_id=in.(select id from zoom_polls where webinar_id=eq.${options.webinarId})`,
            },
            () => {
              // Trigger poll analysis update
              enqueueAnalysisTask('poll_analysis', {
                webinar_id: options.webinarId,
              }, 2); // High priority
            }
          )
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'zoom_qna',
              filter: `webinar_id=eq.${options.webinarId}`,
            },
            () => {
              // Trigger Q&A analysis update
              enqueueAnalysisTask('qna_analysis', {
                webinar_id: options.webinarId,
              }, 2); // High priority
            }
          )
          .subscribe();

        subscriptionsRef.current.push(webinarChannel);
      }

    } catch (error) {
      console.error('Failed to establish realtime connections:', error);
      scheduleReconnect();
    }
  }, [user?.id, options, toast]);

  // Reconnection logic with exponential backoff
  const scheduleReconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }

    const delay = Math.min(1000 * Math.pow(2, connectionAttempts), 30000); // Max 30 seconds
    
    reconnectTimeoutRef.current = setTimeout(() => {
      setConnectionAttempts(prev => prev + 1);
      connect();
    }, delay);
  }, [connectionAttempts, connect]);

  // Disconnect all subscriptions
  const disconnect = useCallback(() => {
    subscriptionsRef.current.forEach(channel => {
      supabase.removeChannel(channel);
    });
    subscriptionsRef.current = [];
    setIsConnected(false);
    
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
  }, []);

  // Enqueue analysis task
  const enqueueAnalysisTask = useCallback(async (
    taskType: string,
    taskData: any,
    priority: number = 5
  ) => {
    try {
      const { error } = await supabase.rpc('enqueue_task', {
        p_task_type: taskType,
        p_task_data: taskData,
        p_priority: priority,
        p_webinar_id: taskData.webinar_id || null,
        p_user_id: user?.id || null,
      });

      if (error) {
        console.error('Failed to enqueue task:', error);
        throw error;
      }
    } catch (error) {
      console.error('Error enqueuing analysis task:', error);
    }
  }, [user?.id]);

  // Get cached data
  const getCachedData = useCallback((cacheKey: string) => {
    const entry = cacheEntries.get(cacheKey);
    if (!entry) return null;
    
    // Check if expired
    if (new Date(entry.expires_at) < new Date()) {
      return null;
    }
    
    return entry.cache_data;
  }, [cacheEntries]);

  // Set cached data
  const setCachedData = useCallback(async (
    cacheKey: string,
    data: any,
    expiresInMinutes: number = 30,
    dependencies: string[] = []
  ) => {
    try {
      const expiresAt = new Date();
      expiresAt.setMinutes(expiresAt.getMinutes() + expiresInMinutes);

      const { error } = await supabase
        .from('analytics_cache')
        .upsert({
          cache_key: cacheKey,
          cache_data: data,
          dependencies,
          expires_at: expiresAt.toISOString(),
        });

      if (error) throw error;
    } catch (error) {
      console.error('Failed to set cache data:', error);
    }
  }, []);

  // Invalidate cache
  const invalidateCache = useCallback(async (pattern: string) => {
    try {
      const { error } = await supabase.rpc('invalidate_cache_dependencies', {
        dep_pattern: pattern,
      });

      if (error) throw error;
    } catch (error) {
      console.error('Failed to invalidate cache:', error);
    }
  }, []);

  // Initialize connections
  useEffect(() => {
    connect();
    return disconnect;
  }, [connect, disconnect]);

  return {
    isConnected,
    processingTasks,
    analyticsEvents,
    enqueueAnalysisTask,
    getCachedData,
    setCachedData,
    invalidateCache,
    reconnect: connect,
    disconnect,
  };
};
