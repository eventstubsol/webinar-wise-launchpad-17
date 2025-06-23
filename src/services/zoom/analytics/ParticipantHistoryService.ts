
import { supabase } from '@/integrations/supabase/client';
import { ParticipantHistory } from './types';
import { EngagementCalculator } from './EngagementCalculator';

/**
 * Service for analyzing participant history across multiple webinars
 */
export class ParticipantHistoryService {
  /**
   * Calculate participant history across multiple webinars
   */
  static async calculateParticipantHistory(participantEmail: string): Promise<ParticipantHistory | null> {
    try {
      // Get all participations for this email - using correct field names
      const { data: participations, error } = await supabase
        .from('zoom_participants')
        .select(`
          *,
          zoom_webinars!inner(id, topic, start_time, duration)
        `)
        .eq('email', participantEmail)
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
        // Create a properly typed participant object with all required fields
        const participant = {
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
        };
        
        const engagement = EngagementCalculator.calculateEngagementScore(participant, webinar.duration || 0);
        
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
        participantName: participations[0].name || '',
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
}
