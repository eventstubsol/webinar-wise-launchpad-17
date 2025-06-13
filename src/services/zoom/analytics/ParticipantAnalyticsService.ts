
import { supabase } from '@/integrations/supabase/client';
import { ZoomParticipant } from '@/types/zoom';
import { 
  WebinarEngagementSummary, 
  ParticipantHistory, 
  EngagementTrends,
  EngagementBreakdown
} from './types';
import { EngagementCalculator } from './EngagementCalculator';
import { AnalyticsHelpers } from './AnalyticsHelpers';
import { DatabaseOperations } from './DatabaseOperations';

/**
 * Service for analyzing participant engagement and generating insights
 */
export class ParticipantAnalyticsService {
  
  /**
   * Calculate engagement score for a participant (0-100 scale)
   */
  static calculateEngagementScore(
    participant: ZoomParticipant,
    webinarDuration: number
  ): EngagementBreakdown {
    return EngagementCalculator.calculateEngagementScore(participant, webinarDuration);
  }

  /**
   * Calculate comprehensive engagement metrics for a webinar
   */
  static async calculateWebinarEngagement(webinarId: string): Promise<WebinarEngagementSummary | null> {
    try {
      // Get webinar details
      const { data: webinar, error: webinarError } = await supabase
        .from('zoom_webinars')
        .select('*')
        .eq('id', webinarId)
        .single();

      if (webinarError || !webinar) {
        console.error('Error fetching webinar:', webinarError);
        return null;
      }

      // Get all participants for this webinar
      const { data: participants, error: participantsError } = await supabase
        .from('zoom_participants')
        .select('*')
        .eq('webinar_id', webinarId);

      if (participantsError) {
        console.error('Error fetching participants:', participantsError);
        return null;
      }

      if (!participants || participants.length === 0) {
        return null;
      }

      const webinarDuration = webinar.duration || 0;
      const engagementData = participants.map(p => ({
        participant: p,
        engagement: this.calculateEngagementScore(p, webinarDuration)
      }));

      // Calculate summary metrics
      const totalParticipants = participants.length;
      const averageEngagementScore = engagementData.reduce((sum, p) => sum + p.engagement.totalScore, 0) / totalParticipants;
      const averageAttendanceDuration = participants.reduce((sum, p) => sum + (p.duration || 0), 0) / totalParticipants;
      const averageAttendancePercentage = webinarDuration > 0 ? (averageAttendanceDuration / webinarDuration) * 100 : 0;

      // Engagement distribution
      const highlyEngagedCount = engagementData.filter(p => p.engagement.totalScore >= 70).length;
      const moderatelyEngagedCount = engagementData.filter(p => p.engagement.totalScore >= 40 && p.engagement.totalScore < 70).length;
      const lowEngagedCount = engagementData.filter(p => p.engagement.totalScore < 40).length;

      // Drop-off analysis
      const dropOffAnalysis = AnalyticsHelpers.analyzeDropOffPatterns(participants, webinarDuration);
      
      // Device and location distribution
      const deviceDistribution = AnalyticsHelpers.calculateDeviceDistribution(participants);
      const locationDistribution = AnalyticsHelpers.calculateLocationDistribution(participants);
      
      // Peak attendance time
      const peakAttendanceTime = AnalyticsHelpers.calculatePeakAttendanceTime(participants, webinar);

      const summary: WebinarEngagementSummary = {
        webinarId,
        totalParticipants,
        averageEngagementScore: Math.round(averageEngagementScore * 100) / 100,
        averageAttendanceDuration: Math.round(averageAttendanceDuration),
        averageAttendancePercentage: Math.round(averageAttendancePercentage * 100) / 100,
        highlyEngagedCount,
        moderatelyEngagedCount,
        lowEngagedCount,
        peakAttendanceTime,
        dropOffAnalysis,
        deviceDistribution,
        locationDistribution
      };

      // Update webinar record with calculated metrics
      await DatabaseOperations.updateWebinarMetrics(webinarId, summary);

      return summary;
    } catch (error) {
      console.error('Error calculating webinar engagement:', error);
      return null;
    }
  }

  /**
   * Calculate participant history across multiple webinars
   */
  static async calculateParticipantHistory(participantEmail: string): Promise<ParticipantHistory | null> {
    try {
      // Get all participations for this email
      const { data: participations, error } = await supabase
        .from('zoom_participants')
        .select(`
          *,
          zoom_webinars!inner(id, topic, start_time, duration)
        `)
        .eq('participant_email', participantEmail)
        .order('join_time', { ascending: false });

      if (error) {
        console.error('Error fetching participant history:', error);
        return null;
      }

      if (!participations || participations.length === 0) {
        return null;
      }

      // Calculate engagement for each participation
      const engagementHistory = participations.map(p => {
        const webinar = (p as any).zoom_webinars;
        const engagement = this.calculateEngagementScore(p, webinar.duration || 0);
        
        return {
          webinarId: webinar.id,
          title: webinar.topic,
          date: webinar.start_time,
          engagementScore: engagement.totalScore,
          attendanceDuration: p.duration || 0,
          participant: p
        };
      });

      // Calculate aggregated metrics
      const totalWebinarsAttended = participations.length;
      const averageEngagementScore = engagementHistory.reduce((sum, e) => sum + e.engagementScore, 0) / totalWebinarsAttended;
      const averageAttendanceDuration = engagementHistory.reduce((sum, e) => sum + e.attendanceDuration, 0) / totalWebinarsAttended;
      const totalTimeSpent = engagementHistory.reduce((sum, e) => sum + e.attendanceDuration, 0);

      // Determine engagement trend
      const engagementTrend = EngagementCalculator.calculateEngagementTrend(engagementHistory.map(e => e.engagementScore));
      
      // Determine if highly engaged (average score >= 70)
      const isHighlyEngaged = averageEngagementScore >= 70;

      const history: ParticipantHistory = {
        participantEmail,
        participantName: participations[0].participant_name,
        totalWebinarsAttended,
        averageEngagementScore: Math.round(averageEngagementScore * 100) / 100,
        averageAttendanceDuration: Math.round(averageAttendanceDuration),
        totalTimeSpent: Math.round(totalTimeSpent),
        engagementTrend,
        isHighlyEngaged,
        recentWebinars: engagementHistory.slice(0, 10).map(e => ({
          webinarId: e.webinarId,
          title: e.title,
          date: e.date,
          engagementScore: e.engagementScore,
          attendanceDuration: e.attendanceDuration
        }))
      };

      return history;
    } catch (error) {
      console.error('Error calculating participant history:', error);
      return null;
    }
  }

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
          const engagement = await this.calculateWebinarEngagement(webinar.id);
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

  /**
   * Helper: Calculate attendance rate
   */
  static calculateAttendanceRate(registrants: number, attendees: number): number {
    return EngagementCalculator.calculateAttendanceRate(registrants, attendees);
  }

  /**
   * Helper: Identify highly engaged participants
   */
  static async flagHighlyEngagedParticipants(connectionId: string, threshold: number = 70) {
    return DatabaseOperations.flagHighlyEngagedParticipants(connectionId, threshold);
  }

  /**
   * Generate insights based on engagement data
   */
  static generateInsights(engagement: WebinarEngagementSummary): string[] {
    return AnalyticsHelpers.generateInsights(engagement);
  }
}
