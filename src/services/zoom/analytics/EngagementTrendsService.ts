
import { supabase } from '@/integrations/supabase/client';

export interface EngagementTrend {
  date: string;
  averageEngagement: number;
  totalParticipants: number;
  webinarCount: number;
}

export interface EngagementTrends {
  connectionId: string;
  dateRange: {
    startDate: string;
    endDate: string;
  };
  totalWebinars: number;
  totalParticipants: number;
  averageEngagement: number;
  peakEngagement: number;
  lowestEngagement: number;
  trends: EngagementTrend[];
  growthRate: number;
}

export class EngagementTrendsService {
  static async getEngagementTrends(
    connectionId: string, 
    startDate: string, 
    endDate: string
  ): Promise<EngagementTrends> {
    try {
      const { data: webinars, error } = await supabase
        .from('zoom_webinars')
        .select(`
          *,
          zoom_participants(*)
        `)
        .eq('connection_id', connectionId)
        .gte('start_time', startDate)
        .lte('start_time', endDate)
        .order('start_time', { ascending: true });

      if (error) throw error;

      if (!webinars || webinars.length === 0) {
        return this.getEmptyTrends(connectionId, startDate, endDate);
      }

      // Group webinars by date and calculate metrics
      const trendsMap = new Map<string, {
        totalEngagement: number;
        totalParticipants: number;
        webinarCount: number;
      }>();

      let totalParticipants = 0;
      let totalEngagementSum = 0;
      let engagementScores: number[] = [];

      webinars.forEach(webinar => {
        const date = new Date(webinar.start_time).toISOString().split('T')[0];
        const participants = webinar.zoom_participants || [];
        
        // Safe access to total_registrants
        const webinarRegistrants = (webinar as any).total_registrants || participants.length;
        totalParticipants += participants.length;

        // Calculate average engagement for this webinar with safe property access
        const webinarEngagement = participants.reduce((sum, p) => {
          const score = (p as any).attentiveness_score || 0;
          return sum + score;
        }, 0) / (participants.length || 1);

        totalEngagementSum += webinarEngagement;
        engagementScores.push(webinarEngagement);

        // Update trends map
        const existing = trendsMap.get(date) || { 
          totalEngagement: 0, 
          totalParticipants: 0, 
          webinarCount: 0 
        };
        
        trendsMap.set(date, {
          totalEngagement: existing.totalEngagement + webinarEngagement,
          totalParticipants: existing.totalParticipants + participants.length,
          webinarCount: existing.webinarCount + 1
        });
      });

      // Convert trends map to array
      const trends: EngagementTrend[] = Array.from(trendsMap.entries()).map(([date, data]) => ({
        date,
        averageEngagement: data.totalEngagement / data.webinarCount,
        totalParticipants: data.totalParticipants,
        webinarCount: data.webinarCount
      }));

      // Calculate overall metrics
      const averageEngagement = totalEngagementSum / webinars.length;
      const peakEngagement = Math.max(...engagementScores);
      const lowestEngagement = Math.min(...engagementScores);

      // Calculate growth rate (simple: last vs first)
      const growthRate = trends.length > 1 
        ? ((trends[trends.length - 1].averageEngagement - trends[0].averageEngagement) / trends[0].averageEngagement) * 100
        : 0;

      return {
        connectionId,
        dateRange: { startDate, endDate },
        totalWebinars: webinars.length,
        totalParticipants,
        averageEngagement,
        peakEngagement,
        lowestEngagement,
        trends,
        growthRate
      };
    } catch (error) {
      console.error('Error calculating engagement trends:', error);
      return this.getEmptyTrends(connectionId, startDate, endDate);
    }
  }

  private static getEmptyTrends(connectionId: string, startDate: string, endDate: string): EngagementTrends {
    return {
      connectionId,
      dateRange: { startDate, endDate },
      totalWebinars: 0,
      totalParticipants: 0,
      averageEngagement: 0,
      peakEngagement: 0,
      lowestEngagement: 0,
      trends: [],
      growthRate: 0
    };
  }

  static async getEngagementTrendsForPeriod(
    connectionId: string,
    period: 'week' | 'month' | 'quarter' | 'year'
  ): Promise<EngagementTrends> {
    const now = new Date();
    const startDate = new Date();

    switch (period) {
      case 'week':
        startDate.setDate(now.getDate() - 7);
        break;
      case 'month':
        startDate.setMonth(now.getMonth() - 1);
        break;
      case 'quarter':
        startDate.setMonth(now.getMonth() - 3);
        break;
      case 'year':
        startDate.setFullYear(now.getFullYear() - 1);
        break;
    }

    return this.getEngagementTrends(
      connectionId,
      startDate.toISOString(),
      now.toISOString()
    );
  }
}
