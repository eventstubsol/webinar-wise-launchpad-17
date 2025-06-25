
import { supabase } from '@/integrations/supabase/client';

export interface EngagementTrend {
  date: string;
  attendance_rate: number;
  engagement_score: number;
  total_webinars: number;
  total_attendees: number;
  total_registrants: number;
}

export class EngagementTrendsService {
  static async getEngagementTrends(
    userId: string,
    startDate: string,
    endDate: string,
    granularity: 'day' | 'week' | 'month' = 'day'
  ): Promise<EngagementTrend[]> {
    const { data: webinars, error } = await supabase
      .from('zoom_webinars')
      .select(`
        *,
        zoom_connections!inner(user_id),
        zoom_participants(*)
      `)
      .eq('zoom_connections.user_id', userId)
      .gte('start_time', startDate)
      .lte('start_time', endDate)
      .order('start_time');

    if (error) {
      console.error('Error fetching engagement trends:', error);
      throw error;
    }

    if (!webinars || webinars.length === 0) {
      return [];
    }

    // Group webinars by date based on granularity
    const grouped = this.groupWebinarsByDate(webinars, granularity);
    
    return Object.entries(grouped).map(([date, webinarGroup]) => {
      const totalWebinars = webinarGroup.length;
      const totalAttendees = webinarGroup.reduce((sum, w) => sum + (w.zoom_participants?.length || 0), 0);
      const totalRegistrants = webinarGroup.reduce((sum, w) => sum + (w.total_registrants || 0), 0);
      
      // Calculate average engagement score from participants
      const allParticipants = webinarGroup.flatMap(w => w.zoom_participants || []);
      const avgEngagementScore = allParticipants.length > 0 
        ? allParticipants.reduce((sum, p) => sum + (p.attentiveness_score || 0), 0) / allParticipants.length
        : 0;

      const attendanceRate = totalRegistrants > 0 ? (totalAttendees / totalRegistrants) * 100 : 0;

      return {
        date,
        attendance_rate: Math.round(attendanceRate * 100) / 100,
        engagement_score: Math.round(avgEngagementScore * 100) / 100,
        total_webinars: totalWebinars,
        total_attendees: totalAttendees,
        total_registrants: totalRegistrants
      };
    }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }

  private static groupWebinarsByDate(
    webinars: any[],
    granularity: 'day' | 'week' | 'month'
  ): Record<string, any[]> {
    const grouped: Record<string, any[]> = {};

    webinars.forEach(webinar => {
      const date = new Date(webinar.start_time);
      let key: string;

      switch (granularity) {
        case 'day':
          key = date.toISOString().split('T')[0];
          break;
        case 'week':
          const weekStart = new Date(date);
          weekStart.setDate(date.getDate() - date.getDay());
          key = weekStart.toISOString().split('T')[0];
          break;
        case 'month':
          key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
          break;
        default:
          key = date.toISOString().split('T')[0];
      }

      if (!grouped[key]) {
        grouped[key] = [];
      }
      grouped[key].push(webinar);
    });

    return grouped;
  }

  static async getEngagementBenchmarks(userId: string): Promise<{
    avg_attendance_rate: number;
    avg_engagement_score: number;
    top_performing_webinars: any[];
  }> {
    const { data: webinars, error } = await supabase
      .from('zoom_webinars')
      .select(`
        *,
        zoom_connections!inner(user_id),
        zoom_participants(attentiveness_score, duration)
      `)
      .eq('zoom_connections.user_id', userId)
      .order('start_time', { ascending: false })
      .limit(50); // Last 50 webinars for benchmarking

    if (error) throw error;

    if (!webinars || webinars.length === 0) {
      return {
        avg_attendance_rate: 0,
        avg_engagement_score: 0,
        top_performing_webinars: []
      };
    }

    // Calculate averages
    const totalAttendees = webinars.reduce((sum, w) => sum + (w.zoom_participants?.length || 0), 0);
    const totalRegistrants = webinars.reduce((sum, w) => sum + (w.total_registrants || 0), 0);
    const avgAttendanceRate = totalRegistrants > 0 ? (totalAttendees / totalRegistrants) * 100 : 0;

    const allParticipants = webinars.flatMap(w => w.zoom_participants || []);
    const avgEngagementScore = allParticipants.length > 0
      ? allParticipants.reduce((sum, p) => sum + (p.attentiveness_score || 0), 0) / allParticipants.length
      : 0;

    // Find top performing webinars
    const webinarsWithScores = webinars.map(webinar => {
      const participants = webinar.zoom_participants || [];
      const engagementScore = participants.length > 0
        ? participants.reduce((sum, p) => sum + (p.attentiveness_score || 0), 0) / participants.length
        : 0;
      
      return {
        ...webinar,
        calculated_engagement_score: engagementScore,
        attendee_count: participants.length
      };
    });

    const topPerforming = webinarsWithScores
      .sort((a, b) => b.calculated_engagement_score - a.calculated_engagement_score)
      .slice(0, 5);

    return {
      avg_attendance_rate: Math.round(avgAttendanceRate * 100) / 100,
      avg_engagement_score: Math.round(avgEngagementScore * 100) / 100,
      top_performing_webinars: topPerforming
    };
  }
}
