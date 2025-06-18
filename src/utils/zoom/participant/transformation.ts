
import { ParticipantValidation } from './validation';
import { ParticipantStatusMapping } from './statusMapping';
import { ParticipantEngagement } from './engagement';

/**
 * Core participant transformation utilities
 */
export class ParticipantTransformation {
  /**
   * Transform participant data with enhanced fallbacks
   */
  static transformParticipant(participant: any, webinarDbId: string): any {
    // Use the same logic as the backend transformer
    const participantId = participant.id || 
                         participant.participant_id || 
                         participant.user_id || 
                         null; // Let database generate fallback

    const email = participant.user_email ||
                  participant.participant_email ||
                  participant.email ||
                  null;

    const name = participant.name ||
                 participant.participant_name ||
                 participant.display_name ||
                 (email ? email.split('@')[0] : 'Unknown Participant');

    return {
      webinar_id: webinarDbId,
      participant_id: participantId,
      registrant_id: participant.registrant_id || null,
      participant_name: name,
      participant_email: email,
      participant_user_id: participant.user_id || null,
      join_time: participant.join_time || null,
      leave_time: participant.leave_time || null,
      duration: participant.duration || null,
      attentiveness_score: participant.attentiveness_score || participant.attention_score || null,
      camera_on_duration: participant.camera_on_duration || null,
      share_application_duration: participant.share_application_duration || null,
      share_desktop_duration: participant.share_desktop_duration || null,
      posted_chat: participant.posted_chat || false,
      raised_hand: participant.raised_hand || false,
      answered_polling: participant.answered_polling || false,
      asked_question: participant.asked_question || false,
      device: participant.device || null,
      ip_address: participant.ip_address ? String(participant.ip_address) : null,
      location: participant.location || null,
      network_type: participant.network_type || null,
      version: participant.version || null,
      customer_key: participant.customer_key || null,
      status: ParticipantStatusMapping.mapParticipantStatus(participant),
      failover: participant.failover || false,
      internal_user: participant.internal_user || false
    };
  }
}
