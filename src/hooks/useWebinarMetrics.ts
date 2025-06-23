
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
}

export const useWebinarMetrics = () => {
  const { user } = useAuth();
  const { connection } = useZoomConnection();
  const [metrics, setMetrics] = useState<WebinarMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.id || !connection?.id) return;

    const fetchMetrics = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch webinars directly from zoom_webinars table
        const { data: webinars, error: webinarsError } = await supabase
          .from('zoom_webinars')
          .select('*')
          .eq('connection_id', connection.id);

        if (webinarsError) throw webinarsError;

        if (!webinars) {
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
          });
          return;
        }

        // Calculate aggregate metrics
        const totalWebinars = webinars.length;
        const totalRegistrants = webinars.reduce((sum, w) => sum + (w.total_registrants || 0), 0);
        const totalAttendees = webinars.reduce((sum, w) => sum + (w.total_attendees || 0), 0);
        const attendanceRate = totalRegistrants > 0 ? (totalAttendees / totalRegistrants) * 100 : 0;
        const totalEngagement = webinars.reduce((sum, w) => sum + (w.avg_attendance_duration || 0), 0);
        const averageDuration = totalWebinars > 0 ? totalEngagement / totalWebinars : 0;

        // Generate monthly trends (last 6 months)
        const monthlyTrends = [];
        for (let i = 5; i >= 0; i--) {
          const date = new Date();
          date.setMonth(date.getMonth() - i);
          const monthKey = date.toISOString().slice(0, 7); // YYYY-MM format
          
          const monthWebinars = webinars.filter(w => 
            w.start_time?.startsWith(monthKey)
          );
          
          monthlyTrends.push({
            month: date.toLocaleDateString('en', { month: 'short' }),
            webinars: monthWebinars.length,
            registrants: monthWebinars.reduce((sum, w) => sum + (w.total_registrants || 0), 0),
            attendees: monthWebinars.reduce((sum, w) => sum + (w.total_attendees || 0), 0),
          });
        }

        // Recent webinars (last 30 days)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        
        const recentWebinars = webinars
          .filter(w => w.start_time && new Date(w.start_time) >= thirtyDaysAgo)
          .sort((a, b) => new Date(b.start_time || 0).getTime() - new Date(a.start_time || 0).getTime())
          .slice(0, 5)
          .map(w => ({
            id: w.id,
            title: w.topic || 'Untitled Webinar',
            date: w.start_time ? new Date(w.start_time).toLocaleDateString() : '',
            duration: Math.round((w.avg_attendance_duration || 0) / 60), // Convert to minutes
            attendees: w.total_attendees || 0,
            registrants: w.total_registrants || 0,
            attendanceRate: w.total_registrants && w.total_attendees ? `${Math.round((w.total_attendees / w.total_registrants) * 100)}%` : '0%',
          }));

        // Upcoming webinars (future dates)
        const now = new Date();
        const upcomingWebinars = webinars
          .filter(w => w.start_time && new Date(w.start_time) > now)
          .sort((a, b) => new Date(a.start_time || 0).getTime() - new Date(b.start_time || 0).getTime())
          .slice(0, 5)
          .map(w => ({
            id: w.id,
            title: w.topic || 'Untitled Webinar',
            date: w.start_time ? new Date(w.start_time).toLocaleDateString() : '',
            time: w.start_time ? new Date(w.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '',
            duration: Math.round((w.duration || 0) / 60), // Convert to minutes
            registrants: w.total_registrants || 0,
            status: 'upcoming',
          }));

        const metricsData: WebinarMetrics = {
          totalWebinars,
          totalRegistrants,
          totalAttendees,
          attendanceRate: Math.round(attendanceRate * 10) / 10, // Round to 1 decimal
          totalEngagement: Math.round(totalEngagement / 3600), // Convert to hours
          averageDuration: Math.round(averageDuration / 60), // Convert to minutes
          monthlyTrends,
          recentWebinars,
          upcomingWebinars,
        };

        setMetrics(metricsData);
      } catch (err) {
        console.error('Error fetching webinar metrics:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch metrics');
      } finally {
        setLoading(false);
      }
    };

    fetchMetrics();
  }, [user?.id, connection?.id]);

  return { metrics, loading, error, refetch: () => setLoading(true) };
};
