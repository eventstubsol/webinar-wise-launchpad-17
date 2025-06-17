
import { ZoomParticipant } from '@/types/zoom';

/**
 * Data transformation utilities for participants and engagement
 */
export class ParticipantTransformers {
  /**
   * Transform Zoom API participant to database format
   */
  static transformParticipant(
    apiParticipant: any,
    webinarId: string
  ): Omit<ZoomParticipant, 'id' | 'created_at' | 'updated_at'> {
    return {
      webinar_id: webinarId,
      participant_id: apiParticipant.id || apiParticipant.participant_id,
      registrant_id: apiParticipant.registrant_id || null,
      participant_name: apiParticipant.name || apiParticipant.participant_name,
      participant_email: apiParticipant.user_email || apiParticipant.participant_email || null,
      participant_user_id: apiParticipant.user_id || null,
      join_time: apiParticipant.join_time || null,
      leave_time: apiParticipant.leave_time || null,
      duration: apiParticipant.duration || null,
      attentiveness_score: apiParticipant.attentiveness_score || null,
      camera_on_duration: apiParticipant.camera_on_duration || null,
      share_application_duration: apiParticipant.share_application_duration || null,
      share_desktop_duration: apiParticipant.share_desktop_duration || null,
      posted_chat: apiParticipant.posted_chat || false,
      raised_hand: apiParticipant.raised_hand || false,
      answered_polling: apiParticipant.answered_polling || false,
      asked_question: apiParticipant.asked_question || false,
      device: apiParticipant.device || null,
      ip_address: apiParticipant.ip_address ? String(apiParticipant.ip_address) : null,
      location: apiParticipant.location || null,
      network_type: apiParticipant.network_type || null,
      version: apiParticipant.version || null,
      customer_key: apiParticipant.customer_key || null,
    };
  }

  /**
   * Normalize participant engagement data
   */
  static normalizeEngagementData(participant: any): {
    engagement_score: number;
    participation_summary: {
      polls_answered: boolean;
      questions_asked: boolean;
      chat_messages: boolean;
      hand_raised: boolean;
      camera_usage_percent: number;
    };
  } {
    const duration = participant.duration || 0;
    const cameraOnDuration = participant.camera_on_duration || 0;
    
    // Calculate engagement score (0-100)
    let score = 0;
    
    // Duration component (0-40 points)
    score += Math.min(40, (duration / 60) * 10);
    
    // Interaction components (60 points total)
    if (participant.answered_polling) score += 20;
    if (participant.asked_question) score += 15;
    if (participant.posted_chat) score += 15;
    if (participant.raised_hand) score += 10;
    
    const cameraUsagePercent = duration > 0 ? (cameraOnDuration / duration) * 100 : 0;
    
    return {
      engagement_score: Math.round(Math.min(100, score)),
      participation_summary: {
        polls_answered: !!participant.answered_polling,
        questions_asked: !!participant.asked_question,
        chat_messages: !!participant.posted_chat,
        hand_raised: !!participant.raised_hand,
        camera_usage_percent: Math.round(cameraUsagePercent),
      },
    };
  }
}
