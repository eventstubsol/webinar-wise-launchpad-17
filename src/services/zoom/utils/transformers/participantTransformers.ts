
import { ZoomParticipant } from '@/types/zoom';

/**
 * Data transformation utilities for participants and engagement
 * NOTE: Currently simplified for webinar-only sync
 */
export class ParticipantTransformers {
  /**
   * Transform Zoom API participant to database format
   * Currently not used in webinar-only sync
   */
  static transformParticipant(
    apiParticipant: any,
    webinarId: string
  ): Omit<ZoomParticipant, 'id' | 'created_at' | 'updated_at'> {
    // Simplified transformation for future use
    return {
      webinar_id: webinarId,
      participant_id: apiParticipant.id || apiParticipant.participant_id,
      registrant_id: null,
      participant_name: apiParticipant.name || apiParticipant.participant_name,
      participant_email: apiParticipant.user_email || apiParticipant.participant_email || null,
      participant_user_id: apiParticipant.user_id || null,
      join_time: apiParticipant.join_time || null,
      leave_time: apiParticipant.leave_time || null,
      duration: apiParticipant.duration || null,
      attentiveness_score: apiParticipant.attentiveness_score || null,
      camera_on_duration: null,
      share_application_duration: null,
      share_desktop_duration: null,
      posted_chat: apiParticipant.posted_chat || false,
      raised_hand: apiParticipant.raised_hand || false,
      answered_polling: apiParticipant.answered_polling || false,
      asked_question: apiParticipant.asked_question || false,
      device: null,
      ip_address: null, // Fixed: set to null instead of unknown type
      location: null,
      network_type: null,
      version: null,
      customer_key: apiParticipant.customer_key || null,
    };
  }

  /**
   * Normalize participant engagement data
   * Currently not used in webinar-only sync
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
    return {
      engagement_score: 0,
      participation_summary: {
        polls_answered: false,
        questions_asked: false,
        chat_messages: false,
        hand_raised: false,
        camera_usage_percent: 0,
      },
    };
  }
}
