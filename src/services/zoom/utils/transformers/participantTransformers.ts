
import { ZoomParticipant } from '@/types/zoom';

/**
 * FIXED: Data transformation utilities for participants with proper status field mapping
 */
export class ParticipantTransformers {
  /**
   * FIXED: Transform Zoom API participant to database format with correct status field
   */
  static transformParticipant(
    apiParticipant: any,
    webinarId: string
  ): Omit<ZoomParticipant, 'id' | 'created_at' | 'updated_at'> & { ip_address: string | null } {
    
    // Enhanced status mapping for participant_status enum
    const normalizeStatus = (status: string | undefined): string => {
      if (!status) return 'attended';
      
      const statusMap: { [key: string]: string } = {
        'in_meeting': 'attended',
        'in_waiting_room': 'in_waiting_room', 
        'attended': 'attended',
        'not_attended': 'not_attended',
        'left_early': 'left_early',
        'left': 'left_early',
        'joined': 'attended'
      };
      
      return statusMap[status.toLowerCase()] || 'attended';
    };

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
      // FIXED: Use 'status' field to match database schema
      status: normalizeStatus(apiParticipant.status),
      // NEW: Added missing fields from API spec
      failover: apiParticipant.failover || false,
      internal_user: apiParticipant.internal_user || false,
    };
  }

  /**
   * ENHANCED: Normalize participant engagement data with improved calculations
   */
  static normalizeEngagementData(participant: any): {
    engagement_score: number;
    participation_summary: {
      polls_answered: boolean;
      questions_asked: boolean;
      chat_messages: boolean;
      hand_raised: boolean;
      camera_usage_percent: number;
      had_technical_issues: boolean;
    };
  } {
    const duration = participant.duration || 0;
    const cameraOnDuration = participant.camera_on_duration || 0;
    
    // Enhanced engagement score calculation (0-100)
    let score = 0;
    
    // Duration component (0-40 points)
    score += Math.min(40, (duration / 60) * 10);
    
    // Interaction components (60 points total)
    if (participant.answered_polling) score += 20;
    if (participant.asked_question) score += 15;
    if (participant.posted_chat) score += 15;
    if (participant.raised_hand) score += 10;
    
    // Penalty for technical issues
    if (participant.failover) score -= 5;
    
    const cameraUsagePercent = duration > 0 ? (cameraOnDuration / duration) * 100 : 0;
    
    return {
      engagement_score: Math.round(Math.min(100, Math.max(0, score))),
      participation_summary: {
        polls_answered: !!participant.answered_polling,
        questions_asked: !!participant.asked_question,
        chat_messages: !!participant.posted_chat,
        hand_raised: !!participant.raised_hand,
        camera_usage_percent: Math.round(cameraUsagePercent),
        had_technical_issues: !!participant.failover,
      },
    };
  }

  /**
   * NEW: Validate participant data before processing
   */
  static validateParticipantData(apiParticipant: any): {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Required fields validation
    if (!apiParticipant.id && !apiParticipant.participant_id) {
      errors.push('Missing participant ID');
    }

    if (!apiParticipant.name && !apiParticipant.participant_name) {
      warnings.push('Missing participant name');
    }

    // Data type validation
    if (apiParticipant.duration && typeof apiParticipant.duration !== 'number') {
      warnings.push('Duration is not a number');
    }

    if (apiParticipant.registrant_id && typeof apiParticipant.registrant_id !== 'string') {
      warnings.push('Registrant ID should be a string');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }
}
