
import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ProcessingTask } from '@/types/analytics';

interface RealtimeMetrics {
  activeTasks: ProcessingTask[];
  completedTasks: ProcessingTask[];
  performance: {
    averageProcessingTime: number;
    successRate: number;
    totalProcessed: number;
  };
}

export const useRealtimeAnalytics = (connectionId?: string) => {
  const [realtimeData, setRealtimeData] = useState<RealtimeMetrics>({
    activeTasks: [],
    completedTasks: [],
    performance: {
      averageProcessingTime: 0,
      successRate: 0,
      totalProcessed: 0,
    },
  });

  // Query for processing queue tasks
  const { data: tasks = [], isLoading, error } = useQuery({
    queryKey: ['realtime-analytics', connectionId],
    queryFn: async () => {
      if (!connectionId) return [];

      try {
        const { data, error } = await supabase
          .from('processing_queue')
          .select('*')
          .eq('user_id', connectionId) // Assuming user_id maps to connection
          .order('created_at', { ascending: false })
          .limit(50);

        if (error) throw error;

        // Type-safe conversion with proper status mapping
        return (data || []).map(item => ({
          ...item,
          status: ['pending', 'processing', 'completed', 'failed'].includes(item.status) 
            ? item.status as 'pending' | 'processing' | 'completed' | 'failed'
            : 'pending' as const,
          progress: Math.random() * 100, // Mock progress for now
        })) as ProcessingTask[];
      } catch (error) {
        console.error('Error fetching realtime analytics:', error);
        return [];
      }
    },
    enabled: !!connectionId,
    refetchInterval: 5000,
  });

  // Update realtime data when tasks change
  useEffect(() => {
    if (tasks.length === 0) return;

    const activeTasks = tasks.filter(task => 
      task.status === 'pending' || task.status === 'processing'
    );
    const completedTasks = tasks.filter(task => 
      task.status === 'completed' || task.status === 'failed'
    );

    const successfulTasks = completedTasks.filter(task => task.status === 'completed');
    const successRate = completedTasks.length > 0 
      ? (successfulTasks.length / completedTasks.length) * 100 
      : 0;

    // Calculate average processing time for completed tasks
    const completedWithDuration = completedTasks.filter(task => 
      task.started_at && task.completed_at
    );
    const averageProcessingTime = completedWithDuration.length > 0
      ? completedWithDuration.reduce((sum, task) => {
          const start = new Date(task.started_at!).getTime();
          const end = new Date(task.completed_at!).getTime();
          return sum + (end - start);
        }, 0) / completedWithDuration.length / 1000 // Convert to seconds
      : 0;

    setRealtimeData({
      activeTasks,
      completedTasks,
      performance: {
        averageProcessingTime,
        successRate,
        totalProcessed: completedTasks.length,
      },
    });
  }, [tasks]);

  // Set up real-time subscription
  useEffect(() => {
    if (!connectionId) return;

    const channel = supabase
      .channel(`analytics-${connectionId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'processing_queue',
        },
        (payload) => {
          console.log('Real-time update:', payload);
          // Trigger refetch to get updated data
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [connectionId]);

  return {
    ...realtimeData,
    isLoading,
    error,
    refresh: () => {
      // Manual refresh function if needed
    },
  };
};
