
import { supabase } from '@/integrations/supabase/client';

export class AnalyticsService {
  static async getWebinarPerformanceData(userId: string, dateRange?: { start: string; end: string }) {
    console.warn('AnalyticsService: total_attendees and total_registrants columns not implemented yet');
    
    // Mock webinar data since Zoom tables were removed
    const webinars = [
      {
        id: 'mock-1',
        topic: 'Sample Webinar 1',
        start_time: new Date().toISOString(),
        duration: 60,
        status: 'completed',
        host_email: 'host@example.com'
      }
    ];
    const error = null;

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
        // Mock participant and registrant counts
        const participantCount = Math.floor(Math.random() * 100) + 20;
        const registrantCount = Math.floor(Math.random() * 150) + 50;

        return {
          ...webinar,
          total_registrants: registrantCount,
          total_attendees: participantCount,
          attendance_rate: registrantCount > 0 
            ? (participantCount / registrantCount) * 100 
            : 0,
          avg_duration: webinar.duration || 0,
          engagement_score: Math.random() * 100, // Mock engagement score
          poll_count: Math.floor(Math.random() * 5),
          qna_count: Math.floor(Math.random() * 10),
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

    // Mock webinars for the specified period
    const webinars = Array.from({ length: Math.floor(Math.random() * 10) + 1 }, (_, i) => ({
      id: `mock-${i + 1}`,
      start_time: new Date(Date.now() - Math.random() * days * 24 * 60 * 60 * 1000).toISOString(),
      duration: 60 + Math.floor(Math.random() * 60)
    }));
    const error = null;

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
    
    // Mock registrant data for analysis
    const registrants = Array.from({ length: Math.floor(Math.random() * 100) + 10 }, (_, i) => ({
      industry: ['Technology', 'Healthcare', 'Finance', 'Education', 'Marketing'][Math.floor(Math.random() * 5)],
      org: `Company ${i + 1}`,
      job_title: ['Manager', 'Director', 'Analyst', 'Consultant', 'Executive'][Math.floor(Math.random() * 5)],
      country: ['United States', 'Canada', 'United Kingdom', 'Germany', 'Australia'][Math.floor(Math.random() * 5)],
      state: ['California', 'New York', 'Texas', 'Florida', 'Illinois'][Math.floor(Math.random() * 5)],
      created_at: new Date().toISOString()
    }));
    const error = null;

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

  // Removed getPollCount and getQnaCount methods since Zoom tables were removed

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
