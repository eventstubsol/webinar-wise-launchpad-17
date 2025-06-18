
/**
 * Enhanced participant data transformers for frontend use
 */

export class ParticipantTransformers {
  /**
   * Validate participant data structure
   */
  static validateParticipantData(participant: any): {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Critical validations
    if (!participant) {
      errors.push('Participant data is null or undefined');
      return { isValid: false, errors, warnings };
    }

    // Check for any form of identifier
    const hasId = !!(
      participant.id || 
      participant.participant_id || 
      participant.user_id ||
      participant.email ||
      participant.participant_email ||
      participant.user_email
    );

    if (!hasId) {
      errors.push('No valid identifier found (id, email, or user_id)');
    }

    // Check for name
    const hasName = !!(
      participant.name ||
      participant.participant_name ||
      participant.display_name
    );

    if (!hasName) {
      warnings.push('No name field found');
    }

    // Check for email
    const hasEmail = !!(
      participant.email ||
      participant.participant_email ||
      participant.user_email
    );

    if (!hasEmail) {
      warnings.push('No email field found');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

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
      status: this.mapParticipantStatus(participant),
      failover: participant.failover || false,
      internal_user: participant.internal_user || false
    };
  }

  /**
   * Map participant status with fallbacks
   */
  static mapParticipantStatus(participant: any): string {
    if (participant.status) {
      const statusMap: { [key: string]: string } = {
        'in_meeting': 'attended',
        'in_waiting_room': 'in_waiting_room',
        'left': 'left_early',
        'joined': 'attended',
        'attended': 'attended',
        'not_attended': 'not_attended',
        'left_early': 'left_early'
      };
      return statusMap[participant.status.toLowerCase()] || 'attended';
    }

    // Infer status from timing data
    const hasJoinTime = !!participant.join_time;
    const hasLeaveTime = !!participant.leave_time;
    const duration = participant.duration || 0;

    if (hasJoinTime && hasLeaveTime && duration > 0) {
      return 'attended';
    } else if (hasJoinTime && !hasLeaveTime) {
      return 'attended';
    } else {
      return 'not_attended';
    }
  }

  /**
   * Normalize engagement data for display
   */
  static normalizeEngagementData(participant: any): any {
    const duration = participant.duration || 0;
    const attentiveness = participant.attentiveness_score || 0;
    
    // Calculate engagement score (0-100)
    let engagementScore = 0;
    
    if (duration > 0) {
      engagementScore += Math.min(40, duration); // Up to 40 points for duration
    }
    
    if (attentiveness > 0) {
      engagementScore += Math.min(30, attentiveness); // Up to 30 points for attention
    }
    
    // Interaction bonuses
    if (participant.posted_chat) engagementScore += 10;
    if (participant.answered_polling) engagementScore += 10;
    if (participant.asked_question) engagementScore += 10;
    if (participant.raised_hand) engagementScore += 5;
    
    engagementScore = Math.min(100, engagementScore);
    
    return {
      ...participant,
      engagement_score: Math.round(engagementScore),
      duration_formatted: this.formatDuration(duration),
      status_display: this.formatStatus(participant.status)
    };
  }

  /**
   * Format duration for display
   */
  static formatDuration(minutes: number): string {
    if (!minutes || minutes === 0) return '0 min';
    
    if (minutes < 60) {
      return `${Math.round(minutes)} min`;
    }
    
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = Math.round(minutes % 60);
    
    if (remainingMinutes === 0) {
      return `${hours}h`;
    }
    
    return `${hours}h ${remainingMinutes}m`;
  }

  /**
   * Format status for display
   */
  static formatStatus(status: string): string {
    const statusMap: { [key: string]: string } = {
      'attended': 'Attended',
      'not_attended': 'Did Not Attend',
      'left_early': 'Left Early',
      'in_waiting_room': 'In Waiting Room',
      'in_meeting': 'In Meeting'
    };
    
    return statusMap[status] || 'Unknown';
  }
}
