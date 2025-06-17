
import { ZoomParticipant } from '@/types/zoom';

/**
 * Data transformation utilities for participants and engagement with enhanced validation
 */
export class ParticipantTransformers {
  /**
   * Transform Zoom API participant to database format with enhanced validation
   */
  static transformParticipant(
    apiParticipant: any,
    webinarId: string
  ): Omit<ZoomParticipant, 'id' | 'created_at' | 'updated_at'> | null {
    try {
      const details = apiParticipant.details?.[0] || {};
      
      // Validate required fields
      if (!webinarId) {
        console.error('webinarId is required for participant transformation');
        return null;
      }
      
      // Generate a unique participant_id if missing
      const participantId = apiParticipant.id || 
                           apiParticipant.participant_id || 
                           apiParticipant.user_id || 
                           `participant_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Handle IP address conversion safely - ensure it's a string or null
      let ipAddress: string | null = null;
      if (details.ip_address) {
        // Convert to string to match the text column type
        ipAddress = String(details.ip_address);
      }
      
      return {
        webinar_id: webinarId,
        participant_id: participantId,
        registrant_id: null, // This would need to be linked separately
        participant_name: apiParticipant.name || 
                         apiParticipant.participant_name || 
                         apiParticipant.user_name || 
                         'Unknown Participant',
        participant_email: apiParticipant.user_email || 
                          apiParticipant.participant_email || 
                          apiParticipant.email || 
                          null,
        participant_user_id: apiParticipant.user_id || null,
        join_time: apiParticipant.join_time || null,
        leave_time: apiParticipant.leave_time || null,
        duration: apiParticipant.duration || null,
        attentiveness_score: apiParticipant.attentiveness_score || null,
        camera_on_duration: details.camera_on_duration || null,
        share_application_duration: details.share_application_duration || null,
        share_desktop_duration: details.share_desktop_duration || null,
        posted_chat: apiParticipant.posted_chat || false,
        raised_hand: apiParticipant.raised_hand || false,
        answered_polling: apiParticipant.answered_polling || false,
        asked_question: apiParticipant.asked_question || false,
        device: details.device || null,
        ip_address: ipAddress, // Now properly typed as string | null
        location: details.location || null,
        network_type: details.network_type || null,
        version: details.version || null,
        customer_key: apiParticipant.customer_key || null,
      };
    } catch (error) {
      console.error('Error transforming participant:', error, apiParticipant);
      return null;
    }
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
    const cameraUsagePercent = duration > 0 ? Math.round((cameraOnDuration / duration) * 100) : 0;

    // Calculate engagement score (0-100)
    let score = 0;
    score += Math.min(40, (duration / 60) * 10); // Duration points
    if (participant.answered_polling) score += 20;
    if (participant.asked_question) score += 20;
    if (participant.posted_chat) score += 10;
    if (participant.raised_hand) score += 10;

    return {
      engagement_score: Math.round(Math.min(100, score)),
      participation_summary: {
        polls_answered: !!participant.answered_polling,
        questions_asked: !!participant.asked_question,
        chat_messages: !!participant.posted_chat,
        hand_raised: !!participant.raised_hand,
        camera_usage_percent: cameraUsagePercent,
      },
    };
  }
}
