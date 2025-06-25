import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

// Define interfaces for webinar and participant data
interface Webinar {
  id: string;
  topic: string;
  start_time: string;
  duration: number;
  status: string;
  participant_sync_status: string | null;
  created_at: string;
  updated_at: string;
}

interface Participant {
  id: string;
  name: string;
  email: string;
  join_time: string;
  leave_time: string;
  duration: number;
}

export const useWebinarAnalytics = (connectionId?: string) => {
  const [webinars, setWebinars] = useState<Webinar[]>([]);
  const [totalWebinars, setTotalWebinars] = useState<number>(0);
  const [totalParticipants, setTotalParticipants] = useState<number>(0);
  const [averageDuration, setAverageDuration] = useState<number>(0);
  const [mostRecentWebinar, setMostRecentWebinar] = useState<Webinar | null>(null);

  // Query for webinar metrics
  const { data: metrics = [], isLoading: metricsLoading } = useQuery({
    queryKey: ['webinar-analytics-metrics', connectionId],
    queryFn: async () => {
      if (!connectionId) return [];

      try {
        const { data, error } = await supabase
          .from('zoom_webinars')
          .select(`
            id,
            topic,
            start_time,
            duration,
            status,
            participant_sync_status,
            created_at,
            updated_at
          `)
          .eq('connection_id', connectionId)
          .order('start_time', { ascending: false });

        if (error) throw error;
        
        return data || [];
      } catch (error) {
        console.error('Error fetching webinar analytics:', error);
        return [];
      }
    },
    enabled: !!connectionId,
    refetchInterval: 30000,
  });

  useEffect(() => {
    if (metrics && metrics.length > 0) {
      setWebinars(metrics);
      setTotalWebinars(metrics.length);

      // Calculate total participants (example, needs actual participant data)
      const totalParticipantsCount = metrics.reduce((sum, webinar) => {
        // Replace with actual participant count from your data
        return sum + 0;
      }, 0);
      setTotalParticipants(totalParticipantsCount);

      // Calculate average duration
      const totalDuration = metrics.reduce((sum, webinar) => sum + webinar.duration, 0);
      setAverageDuration(totalDuration / metrics.length);

      // Set most recent webinar
      setMostRecentWebinar(metrics[0]);
    }
  }, [metrics]);
  
  return {
    webinars,
    totalWebinars,
    totalParticipants,
    averageDuration,
    mostRecentWebinar,
    metrics: metrics as any[], // Type assertion to avoid conversion errors
    isLoading: metricsLoading,
  };
};
