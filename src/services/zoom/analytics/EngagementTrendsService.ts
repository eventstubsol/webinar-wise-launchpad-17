
import { supabase } from '@/integrations/supabase/client';
import { EngagementTrends } from './types';
import { EngagementCalculator } from './EngagementCalculator';
import { AnalyticsHelpers } from './AnalyticsHelpers';
import { WebinarEngagementService } from './WebinarEngagementService';

/**
 * Service for analyzing engagement trends over time
 */
export class EngagementTrendsService {
  /**
   * Get engagement trends over a date range
   */
  static async getEngagementTrends(
    connectionId: string, 
    dateRange: { from: Date; to: Date }
  ): Promise<EngagementTrends | null> {
    try {
      // Get all webinars in the date range
      const { data: webinars, error: webinarsError } = await supabase
        .from('zoom_webinars')
        .select(`
          *,
          zoom_participants(*)
        `)
        .eq('connection_id', connectionId)
        .gte('start_time', dateRange.from.toISOString())
        .lte('start_time', dateRange.to.toISOString())
        .order('start_time', { ascending: true });

      if (webinarsError) {
        console.error('Error fetching webinars for trends:', webinarsError);
        return null;
      }

      if (!webinars || webinars.length === 0) {
        return null;
      }

      // Calculate engagement for all webinars
      const webinarEngagements = await Promise.all(
        webinars.map(async (webinar) => {
          const engagement = await WebinarEngagementService.calculateWebinarEngagement(webinar.id);
          return {
            webinar,
            engagement
          };
        })
      );

      // Calculate overall metrics
      const totalWebinars = webinars.length;
      const allParticipants = webinars.flatMap((w: any) => w.zoom_participants || []);
      const totalParticipants = allParticipants.length;
      const uniqueParticipants = new Set(allParticipants.map(p => p.participant_email).filter(Boolean)).size;

      const averageEngagementScore = webinarEngagements
        .filter(we => we.engagement)
        .reduce((sum, we) => sum + we.engagement!.averageEngagementScore, 0) / webinarEngagements.filter(we => we.engagement).length;

      // Calculate monthly trends
      const monthlyTrends = AnalyticsHelpers.calculateMonthlyTrends(webinarEngagements);
      
      // Determine trend direction
      const engagementTrendDirection = EngagementCalculator.calculateTrendDirection(monthlyTrends);
      
      // Get top performing webinars
      const topPerformingWebinars = webinarEngagements
        .filter(we => we.engagement)
        .sort((a, b) => b.engagement!.averageEngagementScore - a.engagement!.averageEngagementScore)
        .slice(0, 5)
        .map(we => ({
          webinarId: we.webinar.id,
          title: we.webinar.topic,
          date: we.webinar.start_time,
          engagementScore: we.engagement!.averageEngagementScore,
          attendanceRate: we.engagement!.averageAttendancePercentage
        }));

      const trends: EngagementTrends = {
        connectionId,
        dateRange,
        totalWebinars,
        totalParticipants,
        uniqueParticipants,
        averageEngagementScore: Math.round(averageEngagementScore * 100) / 100,
        engagementTrendDirection,
        monthlyTrends,
        topPerformingWebinars
      };

      return trends;
    } catch (error) {
      console.error('Error calculating engagement trends:', error);
      return null;
    }
  }
}
