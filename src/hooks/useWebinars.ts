
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

      let query = supabase
        .from('zoom_webinars')
        .select('*', { count: 'exact' })
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

      return { data: data || [], count: count || 0 };
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
