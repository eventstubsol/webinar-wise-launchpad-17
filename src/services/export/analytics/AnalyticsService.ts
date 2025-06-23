
import { supabase } from '@/integrations/supabase/client';

export class AnalyticsService {
  private static calculateEngagementScore(webinar: any): number {
    let score = 0;
    
    // Attendance rate (40% of score)
    const attendanceRate = webinar.total_registrants > 0 ? (webinar.total_attendees / webinar.total_registrants) * 100 : 0;
    score += (attendanceRate / 100) * 40;

    // Interaction rate (30% of score)
    // Ensure total_attendees is not zero to prevent division by zero
    const interactionRate = webinar.total_attendees > 0 
        ? (((webinar.polls_count || 0) + (webinar.questions_count || 0)) / webinar.total_attendees)
        : 0;
    score += Math.min(interactionRate * 10, 30);

    // Duration completion (30% of score)
    const avgDuration = webinar.avg_attendance_duration || 0;
    const completionRate = webinar.duration > 0 ? avgDuration / webinar.duration : 0;
    score += (completionRate) * 30;

    return Math.min(Math.round(score), 100);
  }

  static async getComparativeAnalytics(webinarIds: string[]) {
    // Get webinar data with poll and Q&A counts
    const { data: webinars, error } = await supabase
      .from('zoom_webinars')
      .select(`
        id,
        topic,
        total_attendees,
        total_registrants,
        avg_attendance_duration,
        duration
      `)
      .in('id', webinarIds);

    if (error) throw error;
    if (!webinars) return { webinars: [], summary: {} };

    // Get poll counts for each webinar
    const { data: pollCounts } = await supabase
      .from('zoom_polls')
      .select('webinar_id')
      .in('webinar_id', webinarIds);

    // Get Q&A counts for each webinar
    const { data: qaCounts } = await supabase
      .from('zoom_qna')
      .select('webinar_id')
      .in('webinar_id', webinarIds);

    // Count polls and Q&A per webinar
    const pollCountsByWebinar = (pollCounts || []).reduce((acc, poll) => {
      acc[poll.webinar_id] = (acc[poll.webinar_id] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const qaCountsByWebinar = (qaCounts || []).reduce((acc, qa) => {
      acc[qa.webinar_id] = (acc[qa.webinar_id] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Calculate comparative metrics
    const analytics = webinars.map(webinar => ({
      id: webinar.id,
      topic: webinar.topic,
      attendanceRate: webinar.total_registrants > 0 ? (webinar.total_attendees / webinar.total_registrants) * 100 : 0,
      engagementScore: this.calculateEngagementScore({
        ...webinar,
        polls_count: pollCountsByWebinar[webinar.id] || 0,
        questions_count: qaCountsByWebinar[webinar.id] || 0
      }),
      participantCount: webinar.total_attendees,
      duration: webinar.duration,
      pollsCount: pollCountsByWebinar[webinar.id] || 0,
      questionsCount: qaCountsByWebinar[webinar.id] || 0
    }));
    
    const validAnalytics = analytics.filter(w => w.engagementScore !== null && !isNaN(w.engagementScore));

    return {
      webinars: analytics,
      summary: {
        totalWebinars: analytics.length,
        avgAttendanceRate: analytics.length > 0 ? analytics.reduce((sum, w) => sum + w.attendanceRate, 0) / analytics.length : 0,
        avgEngagementScore: validAnalytics.length > 0 ? validAnalytics.reduce((sum, w) => sum + w.engagementScore, 0) / validAnalytics.length : 0,
        bestPerforming: validAnalytics.length > 0 ? validAnalytics.reduce((best, current) => 
          current.engagementScore > best.engagementScore ? current : best
        ) : null,
        worstPerforming: validAnalytics.length > 0 ? validAnalytics.reduce((worst, current) => 
          current.engagementScore < worst.engagementScore ? current : worst
        ) : null
      }
    };
  }

  static async getHistoricalTrends(dateRange: { start: string; end: string }) {
    const { data: webinars, error } = await supabase
      .from('zoom_webinars')
      .select('start_time, total_registrants, total_attendees, duration')
      .gte('start_time', dateRange.start)
      .lte('start_time', dateRange.end)
      .order('start_time', { ascending: true });

    if (error) throw error;
    if (!webinars) return { trends: [], summary: {} };

    // Group by month
    const monthlyData: { [key: string]: { month: string; webinarCount: number; totalRegistrants: number; totalAttendees: number; totalDuration: number } } = {};

    webinars.forEach(webinar => {
      if (!webinar.start_time) return;
      const month = new Date(webinar.start_time).toISOString().substring(0, 7); // YYYY-MM
      
      if (!monthlyData[month]) {
        monthlyData[month] = {
          month,
          webinarCount: 0,
          totalRegistrants: 0,
          totalAttendees: 0,
          totalDuration: 0
        };
      }

      monthlyData[month].webinarCount++;
      monthlyData[month].totalRegistrants += webinar.total_registrants || 0;
      monthlyData[month].totalAttendees += webinar.total_attendees || 0;
      monthlyData[month].totalDuration += webinar.duration || 0;
    });

    const trends = Object.values(monthlyData).map(month => ({
      ...month,
      attendanceRate: month.totalRegistrants > 0 ? (month.totalAttendees / month.totalRegistrants) * 100 : 0,
      avgDuration: month.webinarCount > 0 ? month.totalDuration / month.webinarCount : 0
    }));

    return {
      trends,
      summary: {
        totalPeriods: trends.length,
        avgWebinarsPerMonth: trends.length > 0 ? trends.reduce((sum, t) => sum + t.webinarCount, 0) / trends.length : 0,
        overallAttendanceRate: trends.length > 0 ? trends.reduce((sum, t) => sum + t.attendanceRate, 0) / trends.length : 0,
        growth: trends.length > 1 && trends[0].webinarCount > 0 ? 
          ((trends[trends.length - 1].webinarCount - trends[0].webinarCount) / trends[0].webinarCount) * 100 : 0
      }
    };
  }
}
