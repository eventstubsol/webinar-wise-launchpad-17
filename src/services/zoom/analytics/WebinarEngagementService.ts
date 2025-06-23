
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
      
      // Convert raw participant data to properly typed ZoomParticipant objects
      const typedParticipants: ZoomParticipant[] = participants.map(p => ({
        id: p.id,
        webinar_id: p.webinar_id,
        participant_id: p.participant_id || '',
        registrant_id: p.registrant_id || null,
        participant_name: p.name || '',
        participant_email: p.email || '',
        participant_user_id: p.participant_id || '',
        join_time: p.join_time,
        leave_time: p.leave_time,
        duration: p.duration || 0,
        attentiveness_score: p.attentiveness_score,
        camera_on_duration: p.camera_on_duration || 0,
        share_application_duration: p.share_application_duration || 0,
        share_desktop_duration: p.share_desktop_duration || 0,
        posted_chat: p.posted_chat || false,
        raised_hand: p.raised_hand || false,
        answered_polling: p.answered_polling || false,
        asked_question: p.asked_question || false,
        device: p.device || null,
        ip_address: p.ip_address || null,
        location: p.location || null,
        network_type: p.network_type || null,
        version: p.version || null,
        customer_key: p.customer_key || null,
        created_at: p.created_at || '',
        updated_at: p.updated_at || ''
      }));

      const engagementData = typedParticipants.map(p => ({
        participant: p,
        engagement: EngagementCalculator.calculateEngagementScore(p, webinarDuration)
      }));

      // Calculate summary metrics
      const totalParticipants = typedParticipants.length;
      const averageEngagementScore = engagementData.reduce((sum, p) => sum + p.engagement.totalScore, 0) / totalParticipants;
      const averageAttendanceDuration = typedParticipants.reduce((sum, p) => sum + (p.duration || 0), 0) / totalParticipants;
      const averageAttendancePercentage = webinarDuration > 0 ? (averageAttendanceDuration / webinarDuration) * 100 : 0;

      // Engagement distribution
      const highlyEngagedCount = engagementData.filter(p => p.engagement.totalScore >= 70).length;
      const moderatelyEngagedCount = engagementData.filter(p => p.engagement.totalScore >= 40 && p.engagement.totalScore < 70).length;
      const lowEngagedCount = engagementData.filter(p => p.engagement.totalScore < 40).length;

      // Drop-off analysis
      const dropOffAnalysis = AnalyticsHelpers.analyzeDropOffPatterns(typedParticipants, webinarDuration);
      
      // Device and location distribution
      const deviceDistribution = AnalyticsHelpers.calculateDeviceDistribution(typedParticipants);
      const locationDistribution = AnalyticsHelpers.calculateLocationDistribution(typedParticipants);
      
      // Peak attendance time
      const peakAttendanceTime = AnalyticsHelpers.calculatePeakAttendanceTime(typedParticipants, webinar);

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
