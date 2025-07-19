
import { supabase } from '@/integrations/supabase/client';

export class AnalyticsService {
  static async getWebinarPerformanceData(userId: string, dateRange?: { start: string; end: string }) {
    console.warn('AnalyticsService: total_attendees and total_registrants columns not implemented yet');
    
    // Get basic webinar data that exists
    const { data: webinars, error } = await supabase
      .from('zoom_webinars')
      .select(`
        id,
        topic,
        start_time,
        duration,
        status,
        zoom_webinar_id,
        host_id,
        zoom_connections!inner(
          zoom_email
        )
      `)
      .order('start_time', { ascending: false });

    if (error) {
      console.error('Error fetching webinar data:', error);
      throw error;
    }

    if (!webinars || webinars.length === 0) {
      return [];
    }

    // Process webinars and add mock performance data
    const performanceData = await Promise.all(
      webinars.map(async (webinar) => {
        // Get participant count as proxy for attendees
        const { count: participantCount } = await supabase
          .from('zoom_participants')
          .select('*', { count: 'exact' })
          .eq('webinar_id', webinar.id);

        // Get registrant count
        const { count: registrantCount } = await supabase
          .from('zoom_registrants')
          .select('*', { count: 'exact' })
          .eq('webinar_id', webinar.id);

        return {
          ...webinar,
          total_registrants: registrantCount || 0,
          total_attendees: participantCount || 0,
          attendance_rate: registrantCount && registrantCount > 0 
            ? ((participantCount || 0) / registrantCount) * 100 
            : 0,
          avg_duration: webinar.duration || 0,
          engagement_score: Math.random() * 100, // Mock engagement score
          poll_count: await this.getPollCount(webinar.id),
          qna_count: await this.getQnaCount(webinar.id),
        };
      })
    );

    return performanceData;
  }

  static async getEngagementTrends(userId: string, period: '7d' | '30d' | '90d' = '30d') {
    console.warn('AnalyticsService: engagement trends calculation not fully implemented yet');
    
    const days = period === '7d' ? 7 : period === '30d' ? 30 : 90;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Get webinars in the specified period
    const { data: webinars, error } = await supabase
      .from('zoom_webinars')
      .select('id, start_time, duration')
      .gte('start_time', startDate.toISOString())
      .order('start_time', { ascending: true });

    if (error) {
      console.error('Error fetching engagement trends:', error);
      throw error;
    }

    if (!webinars || webinars.length === 0) {
      return [];
    }

    // Generate trend data with mock metrics
    const trendData = webinars.map(webinar => {
      const date = new Date(webinar.start_time).toISOString().split('T')[0];
      
      return {
        date,
        webinar_id: webinar.id,
        attendees: Math.floor(Math.random() * 100) + 20,
        engagement_rate: Math.random() * 100,
        duration_minutes: webinar.duration || 60,
        interactions: Math.floor(Math.random() * 50) + 5,
      };
    });

    return trendData;
  }

  static async getAudienceInsights(userId: string) {
    console.warn('AnalyticsService: audience insights not fully implemented yet');
    
    // Get registrant data for analysis
    const { data: registrants, error } = await supabase
      .from('zoom_registrants')
      .select('industry, org, job_title, country, state, created_at');

    if (error) {
      console.error('Error fetching audience data:', error);
      throw error;
    }

    if (!registrants || registrants.length === 0) {
      return {
        totalAudience: 0,
        topIndustries: [],
        topLocations: [],
        topJobTitles: [],
        growthRate: 0
      };
    }

    // Analyze audience data
    const industryCount = this.countBy(registrants, 'industry');
    const locationCount = this.countBy(registrants, 'country');
    const jobTitleCount = this.countBy(registrants, 'job_title');

    return {
      totalAudience: registrants.length,
      topIndustries: this.getTopItems(industryCount, 5),
      topLocations: this.getTopItems(locationCount, 5),
      topJobTitles: this.getTopItems(jobTitleCount, 5),
      growthRate: Math.random() * 20 + 5, // Mock growth rate
    };
  }

  private static async getPollCount(webinarId: string): Promise<number> {
    const { count } = await supabase
      .from('zoom_polls')
      .select('*', { count: 'exact' })
      .eq('webinar_id', webinarId);
    
    return count || 0;
  }

  private static async getQnaCount(webinarId: string): Promise<number> {
    const { count } = await supabase
      .from('zoom_qna')
      .select('*', { count: 'exact' })
      .eq('webinar_id', webinarId);
    
    return count || 0;
  }

  private static countBy(array: any[], key: string): Record<string, number> {
    return array.reduce((acc, item) => {
      const value = item[key];
      if (value && typeof value === 'string') {
        acc[value] = (acc[value] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>);
  }

  private static getTopItems(countObj: Record<string, number>, limit: number) {
    return Object.entries(countObj)
      .sort(([,a], [,b]) => b - a)
      .slice(0, limit)
      .map(([name, count]) => ({ name, count }));
  }
}
