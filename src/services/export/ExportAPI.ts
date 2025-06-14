
import { supabase } from '@/integrations/supabase/client';
import { ExportConfig, ReportTemplate, ScheduledReport } from './types';

export class ExportAPI {
  // Bulk data export endpoints
  static async exportWebinarData(filters: any = {}) {
    let query = supabase
      .from('zoom_webinars')
      .select(`
        *,
        zoom_participants(*),
        zoom_polls(*),
        zoom_qna(*)
      `);

    if (filters.webinarIds?.length > 0) {
      query = query.in('id', filters.webinarIds);
    }

    if (filters.dateRange) {
      query = query
        .gte('start_time', filters.dateRange.start)
        .lte('start_time', filters.dateRange.end);
    }

    if (filters.status) {
      query = query.eq('status', filters.status);
    }

    const { data, error } = await query.order('start_time', { ascending: false });
    
    if (error) throw error;
    return data;
  }

  static async exportParticipantData(filters: any = {}) {
    let query = supabase
      .from('zoom_participants')
      .select(`
        *,
        zoom_webinars(topic, start_time, duration)
      `);

    if (filters.webinarIds?.length > 0) {
      query = query.in('webinar_id', filters.webinarIds);
    }

    if (filters.engagementLevel) {
      switch (filters.engagementLevel) {
        case 'high':
          query = query.gte('attentiveness_score', 80);
          break;
        case 'medium':
          query = query.gte('attentiveness_score', 50).lt('attentiveness_score', 80);
          break;
        case 'low':
          query = query.lt('attentiveness_score', 50);
          break;
      }
    }

    const { data, error } = await query.order('join_time', { ascending: false });
    
    if (error) throw error;
    return data;
  }

  // Cross-webinar comparison analytics
  static async getComparativeAnalytics(webinarIds: string[]) {
    const { data: webinars, error } = await supabase
      .from('zoom_webinars')
      .select(`
        *,
        zoom_participants(count),
        zoom_polls(count),
        zoom_qna(count)
      `)
      .in('id', webinarIds);

    if (error) throw error;

    // Calculate comparative metrics
    const analytics = webinars.map(webinar => ({
      id: webinar.id,
      topic: webinar.topic,
      attendanceRate: (webinar.total_attendees / webinar.total_registrants) * 100,
      engagementScore: this.calculateEngagementScore(webinar),
      participantCount: webinar.total_attendees,
      duration: webinar.duration,
      pollsCount: webinar.zoom_polls?.length || 0,
      questionsCount: webinar.zoom_qna?.length || 0
    }));

    return {
      webinars: analytics,
      summary: {
        totalWebinars: analytics.length,
        avgAttendanceRate: analytics.reduce((sum, w) => sum + w.attendanceRate, 0) / analytics.length,
        avgEngagementScore: analytics.reduce((sum, w) => sum + w.engagementScore, 0) / analytics.length,
        bestPerforming: analytics.reduce((best, current) => 
          current.engagementScore > best.engagementScore ? current : best
        ),
        worstPerforming: analytics.reduce((worst, current) => 
          current.engagementScore < worst.engagementScore ? current : worst
        )
      }
    };
  }

  // Historical trend analysis
  static async getHistoricalTrends(dateRange: { start: string; end: string }) {
    const { data: webinars, error } = await supabase
      .from('zoom_webinars')
      .select('*')
      .gte('start_time', dateRange.start)
      .lte('start_time', dateRange.end)
      .order('start_time', { ascending: true });

    if (error) throw error;

    // Group by month
    const monthlyData = webinars.reduce((acc, webinar) => {
      const month = new Date(webinar.start_time).toISOString().substring(0, 7); // YYYY-MM
      
      if (!acc[month]) {
        acc[month] = {
          month,
          webinarCount: 0,
          totalRegistrants: 0,
          totalAttendees: 0,
          totalDuration: 0
        };
      }

      acc[month].webinarCount++;
      acc[month].totalRegistrants += webinar.total_registrants || 0;
      acc[month].totalAttendees += webinar.total_attendees || 0;
      acc[month].totalDuration += webinar.duration || 0;

      return acc;
    }, {} as any);

    const trends = Object.values(monthlyData).map((month: any) => ({
      ...month,
      attendanceRate: (month.totalAttendees / month.totalRegistrants) * 100,
      avgDuration: month.totalDuration / month.webinarCount
    }));

    return {
      trends,
      summary: {
        totalPeriods: trends.length,
        avgWebinarsPerMonth: trends.reduce((sum, t) => sum + t.webinarCount, 0) / trends.length,
        overallAttendanceRate: trends.reduce((sum, t) => sum + t.attendanceRate, 0) / trends.length,
        growth: trends.length > 1 ? 
          ((trends[trends.length - 1].webinarCount - trends[0].webinarCount) / trends[0].webinarCount) * 100 : 0
      }
    };
  }

  private static calculateEngagementScore(webinar: any): number {
    let score = 0;
    
    // Attendance rate (40% of score)
    const attendanceRate = (webinar.total_attendees / webinar.total_registrants) * 100;
    score += (attendanceRate / 100) * 40;

    // Interaction rate (30% of score)
    const interactionRate = ((webinar.zoom_polls?.length || 0) + (webinar.zoom_qna?.length || 0)) / webinar.total_attendees;
    score += Math.min(interactionRate * 10, 30);

    // Duration completion (30% of score)
    const avgDuration = webinar.avg_attendance_duration || 0;
    const completionRate = avgDuration / webinar.duration;
    score += (completionRate) * 30;

    return Math.min(Math.round(score), 100);
  }

  // Report template management
  static async getReportTemplates() {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('report_templates')
      .select('*')
      .eq('user_id', user.user.id)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  }

  static async saveReportTemplate(template: Partial<ReportTemplate>) {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('report_templates')
      .insert({
        ...template,
        user_id: user.user.id
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  // Scheduled report management
  static async getScheduledReports() {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('scheduled_reports')
      .select('*')
      .eq('user_id', user.user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  }

  static async createScheduledReport(report: Partial<ScheduledReport>) {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('scheduled_reports')
      .insert({
        ...report,
        user_id: user.user.id
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }
}
