
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useZoomConnection } from '@/hooks/useZoomConnection';

interface WebinarMetrics {
  totalWebinars: number;
  totalRegistrants: number;
  totalAttendees: number;
  attendanceRate: number;
  totalEngagement: number;
  averageDuration: number;
  monthlyTrends: Array<{
    month: string;
    webinars: number;
    registrants: number;
    attendees: number;
  }>;
  recentWebinars: Array<{
    id: string;
    title: string;
    date: string;
    duration: number;
    attendees: number;
    registrants: number;
    attendanceRate: string;
  }>;
  upcomingWebinars: Array<{
    id: string;
    title: string;
    date: string;
    time: string;
    duration: number;
    registrants: number;
    status: string;
  }>;
  // New properties for better empty state handling
  hasData: boolean;
  isEmpty: boolean;
  lastSyncAt?: string;
  syncHistoryCount: number;
}

export const useWebinarMetrics = () => {
  const { user } = useAuth();
  const { connection } = useZoomConnection();
  const [metrics, setMetrics] = useState<WebinarMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    const fetchMetrics = async () => {
      try {
        setLoading(true);
        setError(null);

        // Always fetch sync history, even without a connection
        const { data: syncHistory } = await supabase
          .from('zoom_sync_logs')
          .select('completed_at, sync_status')
          .eq('connection_id', connection?.id || '')
          .order('created_at', { ascending: false })
          .limit(1);

        const lastSync = syncHistory?.[0];
        const syncHistoryCount = syncHistory?.length || 0;

        // If no connection, return minimal metrics with helpful info
        if (!connection?.id) {
          setMetrics({
            totalWebinars: 0,
            totalRegistrants: 0,
            totalAttendees: 0,
            attendanceRate: 0,
            totalEngagement: 0,
            averageDuration: 0,
            monthlyTrends: [],
            recentWebinars: [],
            upcomingWebinars: [],
            hasData: false,
            isEmpty: true,
            syncHistoryCount: 0,
          });
          return;
        }

        // Fetch webinars with related counts
        const { data: webinars, error: webinarsError } = await supabase
          .from('zoom_webinars')
          .select(`
            *,
            zoom_registrants(count),
            zoom_participants(count)
          `)
          .eq('connection_id', connection.id);

        if (webinarsError) throw webinarsError;

        const hasData = webinars && webinars.length > 0;

        if (!hasData) {
          setMetrics({
            totalWebinars: 0,
            totalRegistrants: 0,
            totalAttendees: 0,
            attendanceRate: 0,
            totalEngagement: 0,
            averageDuration: 0,
            monthlyTrends: [],
            recentWebinars: [],
            upcomingWebinars: [],
            hasData: false,
            isEmpty: true,
            lastSyncAt: lastSync?.completed_at,
            syncHistoryCount,
          });
          return;
        }

        // Calculate metrics by aggregating related data
        const totalWebinars = webinars.length;
        let totalRegistrants = 0;
        let totalAttendees = 0;
        let totalDuration = 0;

        // For each webinar, get actual counts
        for (const webinar of webinars) {
          // Get registrant count
          const { count: registrantCount } = await supabase
            .from('zoom_registrants')
            .select('*', { count: 'exact', head: true })
            .eq('webinar_id', webinar.id);

          // Get participant count  
          const { count: participantCount } = await supabase
            .from('zoom_participants')
            .select('*', { count: 'exact', head: true })
            .eq('webinar_id', webinar.id);

          totalRegistrants += registrantCount || 0;
          totalAttendees += participantCount || 0;
          totalDuration += webinar.duration || 0;
        }

        const attendanceRate = totalRegistrants > 0 ? (totalAttendees / totalRegistrants) * 100 : 0;
        const averageDuration = totalWebinars > 0 ? totalDuration / totalWebinars : 0;

        // Generate monthly trends (last 6 months)
        const monthlyTrends = [];
        for (let i = 5; i >= 0; i--) {
          const date = new Date();
          date.setMonth(date.getMonth() - i);
          const monthKey = date.toISOString().slice(0, 7); // YYYY-MM format
          
          const monthWebinars = webinars.filter(w => 
            w.start_time?.startsWith(monthKey)
          );
          
          // Calculate registrants and attendees for this month
          let monthRegistrants = 0;
          let monthAttendees = 0;
          
          for (const webinar of monthWebinars) {
            const { count: regCount } = await supabase
              .from('zoom_registrants')
              .select('*', { count: 'exact', head: true })
              .eq('webinar_id', webinar.id);
            
            const { count: partCount } = await supabase
              .from('zoom_participants')
              .select('*', { count: 'exact', head: true })
              .eq('webinar_id', webinar.id);
            
            monthRegistrants += regCount || 0;
            monthAttendees += partCount || 0;
          }
          
          monthlyTrends.push({
            month: date.toLocaleDateString('en', { month: 'short' }),
            webinars: monthWebinars.length,
            registrants: monthRegistrants,
            attendees: monthAttendees,
          });
        }

        // Recent webinars (last 30 days)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        
        const recentWebinarsList = await Promise.all(
          webinars
            .filter(w => w.start_time && new Date(w.start_time) >= thirtyDaysAgo)
            .sort((a, b) => new Date(b.start_time || 0).getTime() - new Date(a.start_time || 0).getTime())
            .slice(0, 5)
            .map(async (w) => {
              const { count: regCount } = await supabase
                .from('zoom_registrants')
                .select('*', { count: 'exact', head: true })
                .eq('webinar_id', w.id);
              
              const { count: partCount } = await supabase
                .from('zoom_participants')
                .select('*', { count: 'exact', head: true })
                .eq('webinar_id', w.id);

              return {
                id: w.id,
                title: w.topic || 'Untitled Webinar',
                date: w.start_time ? new Date(w.start_time).toLocaleDateString() : '',
                duration: Math.round((w.duration || 0) / 60), // Convert to minutes
                attendees: partCount || 0,
                registrants: regCount || 0,
                attendanceRate: regCount && partCount ? `${Math.round((partCount / regCount) * 100)}%` : '0%',
              };
            })
        );

        // Upcoming webinars (future dates)
        const now = new Date();
        const upcomingWebinarsList = await Promise.all(
          webinars
            .filter(w => w.start_time && new Date(w.start_time) > now)
            .sort((a, b) => new Date(a.start_time || 0).getTime() - new Date(b.start_time || 0).getTime())
            .slice(0, 5)
            .map(async (w) => {
              const { count: regCount } = await supabase
                .from('zoom_registrants')
                .select('*', { count: 'exact', head: true })
                .eq('webinar_id', w.id);

              return {
                id: w.id,
                title: w.topic || 'Untitled Webinar',
                date: w.start_time ? new Date(w.start_time).toLocaleDateString() : '',
                time: w.start_time ? new Date(w.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '',
                duration: Math.round((w.duration || 0) / 60), // Convert to minutes
                registrants: regCount || 0,
                status: 'upcoming',
              };
            })
        );

        const metricsData: WebinarMetrics = {
          totalWebinars,
          totalRegistrants,
          totalAttendees,
          attendanceRate: Math.round(attendanceRate * 10) / 10, // Round to 1 decimal
          totalEngagement: Math.round(totalDuration / 3600), // Convert to hours
          averageDuration: Math.round(averageDuration / 60), // Convert to minutes
          monthlyTrends,
          recentWebinars: recentWebinarsList,
          upcomingWebinars: upcomingWebinarsList,
          hasData: true,
          isEmpty: false,
          lastSyncAt: lastSync?.completed_at,
          syncHistoryCount,
        };

        setMetrics(metricsData);
      } catch (err) {
        console.error('Error fetching webinar metrics:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch metrics');
        
        // Set empty metrics even on error
        setMetrics({
          totalWebinars: 0,
          totalRegistrants: 0,
          totalAttendees: 0,
          attendanceRate: 0,
          totalEngagement: 0,
          averageDuration: 0,
          monthlyTrends: [],
          recentWebinars: [],
          upcomingWebinars: [],
          hasData: false,
          isEmpty: true,
          syncHistoryCount: 0,
        });
      } finally {
        setLoading(false);
      }
    };

    fetchMetrics();
  }, [user?.id, connection?.id]);

  return { metrics, loading, error, refetch: () => setLoading(true) };
};
