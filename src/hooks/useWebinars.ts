import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useZoomConnection } from '@/hooks/useZoomConnection';

interface WebinarFilters {
  search?: string;
  status?: string;
  dateFrom?: string;
  dateTo?: string;
}

interface UseWebinarsProps {
  filters?: WebinarFilters;
  page?: number;
  limit?: number;
}

export const useWebinars = ({ filters = {}, page = 1, limit = 10 }: UseWebinarsProps = {}) => {
  const { user } = useAuth();
  const { connection } = useZoomConnection();

  const {
    data,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['webinars', connection?.id, filters, page, limit],
    queryFn: async () => {
      if (!connection?.id) {
        return { data: [], count: 0 };
      }

      // Join zoom_webinars with webinar_metrics to get all data
      let query = supabase
        .from('zoom_webinars')
        .select(`
          *,
          metrics:webinar_metrics(
            total_attendees,
            unique_attendees,
            total_absentees,
            actual_participant_count,
            total_minutes,
            avg_attendance_duration,
            participant_sync_status,
            participant_sync_attempted_at,
            participant_sync_completed_at,
            participant_sync_error
          )
        `, { count: 'exact' })
        .eq('connection_id', connection.id)
        .order('start_time', { ascending: false });

      // Apply search filter
      if (filters.search) {
        query = query.ilike('topic', `%${filters.search}%`);
      }

      // Apply status filter
      if (filters.status) {
        query = query.eq('status', filters.status);
      }

      // Apply date range filters
      if (filters.dateFrom) {
        query = query.gte('start_time', filters.dateFrom);
      }
      if (filters.dateTo) {
        query = query.lte('start_time', filters.dateTo);
      }

      // Apply pagination
      const from = (page - 1) * limit;
      const to = from + limit - 1;
      query = query.range(from, to);

      const { data, error, count } = await query;

      if (error) {
        throw new Error(error.message);
      }

      // Transform data to flatten metrics
      const transformedData = (data || []).map(webinar => {
        const metrics = Array.isArray(webinar.metrics) ? webinar.metrics[0] : webinar.metrics;
        return {
          ...webinar,
          // Add metrics fields at root level for backward compatibility
          total_attendees: metrics?.total_attendees || 0,
          unique_attendees: metrics?.unique_attendees || 0,
          total_absentees: metrics?.total_absentees || 0,
          actual_participant_count: metrics?.actual_participant_count || 0,
          total_minutes: metrics?.total_minutes || 0,
          avg_attendance_duration: metrics?.avg_attendance_duration || 0,
          participant_sync_status: metrics?.participant_sync_status || 'pending',
          participant_sync_attempted_at: metrics?.participant_sync_attempted_at,
          participant_sync_completed_at: metrics?.participant_sync_completed_at,
          participant_sync_error: metrics?.participant_sync_error,
          // Rename for backward compatibility
          total_registrants: webinar.registrants_count || 0
        };
      });

      return { data: transformedData, count: count || 0 };
    },
    enabled: !!connection?.id,
  });

  return {
    webinars: data?.data || [],
    totalCount: data?.count || 0,
    isLoading,
    error,
    refetch,
  };
};
