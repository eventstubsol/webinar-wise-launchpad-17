
import { supabase } from '@/integrations/supabase/client';
import { ZoomParticipant } from '@/types/zoom';
import { WebinarEngagementSummary } from './types';
import { EngagementCalculator } from './EngagementCalculator';
import { AnalyticsHelpers } from './AnalyticsHelpers';
import { DatabaseOperations } from './DatabaseOperations';

/**
 * Service for calculating webinar-level engagement metrics
 */
export class WebinarEngagementService {
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
        engagement: EngagementCalculator.calculateEngagementScore(p, webinarDuration)
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
}
