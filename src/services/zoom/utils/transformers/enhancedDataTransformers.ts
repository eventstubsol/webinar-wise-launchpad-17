
/**
 * Enhanced data transformers for comprehensive registrant and participant processing
 */
export class EnhancedDataTransformers {
  /**
   * Transform registrant with comprehensive status and custom question handling
   */
  static transformEnhancedRegistrant(apiRegistrant: any, webinarDbId: string): any {
    const customQuestions = this.parseCustomQuestions(apiRegistrant.custom_questions);
    
    return {
      webinar_id: webinarDbId,
      registrant_id: apiRegistrant.id || apiRegistrant.registrant_id,
      email: apiRegistrant.email,
      first_name: apiRegistrant.first_name || null,
      last_name: apiRegistrant.last_name || null,
      address: apiRegistrant.address || null,
      city: apiRegistrant.city || null,
      state: apiRegistrant.state || null,
      zip: apiRegistrant.zip || null,
      country: apiRegistrant.country || null,
      phone: apiRegistrant.phone || null,
      industry: apiRegistrant.industry || null,
      org: apiRegistrant.org || null,
      job_title: apiRegistrant.job_title || null,
      purchasing_time_frame: apiRegistrant.purchasing_time_frame || null,
      role_in_purchase_process: apiRegistrant.role_in_purchase_process || null,
      no_of_employees: apiRegistrant.no_of_employees || null,
      comments: apiRegistrant.comments || null,
      custom_questions: customQuestions,
      registration_time: apiRegistrant.registration_time || apiRegistrant.create_time || new Date().toISOString(),
      status: apiRegistrant.registration_status || apiRegistrant.status || 'approved',
      join_url: apiRegistrant.join_url || null,
      occurrence_id: apiRegistrant.occurrence_id || null,
      source_id: apiRegistrant.source_id || null,
      tracking_source: apiRegistrant.tracking_source || null,
      language: apiRegistrant.language || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
  }
  
  /**
   * Transform participant with comprehensive engagement data
   */
  static transformEnhancedParticipant(apiParticipant: any, webinarDbId: string): any {
    const engagementData = this.calculateEngagementMetrics(apiParticipant);
    
    return {
      webinar_id: webinarDbId,
      participant_id: apiParticipant.id || apiParticipant.participant_id || apiParticipant.user_id,
      registrant_id: apiParticipant.registrant_id || null,
      participant_name: apiParticipant.name || apiParticipant.user_name || 'Unknown Participant',
      participant_email: apiParticipant.user_email || apiParticipant.email || null,
      participant_user_id: apiParticipant.user_id || null,
      participant_uuid: apiParticipant.participant_uuid || null,
      join_time: apiParticipant.join_time || null,
      leave_time: apiParticipant.leave_time || null,
      duration: apiParticipant.duration || 0,
      attentiveness_score: apiParticipant.attentiveness_score?.toString() || null,
      camera_on_duration: apiParticipant.camera_on_duration || 0,
      share_application_duration: apiParticipant.share_application_duration || 0,
      share_desktop_duration: apiParticipant.share_desktop_duration || 0,
      posted_chat: apiParticipant.posted_chat || false,
      raised_hand: apiParticipant.raised_hand || false,
      answered_polling: apiParticipant.answered_polling || false,
      asked_question: apiParticipant.asked_question || false,
      device_info: this.parseDeviceInfo(apiParticipant),
      user_location: this.parseLocationInfo(apiParticipant),
      connection_type: apiParticipant.connection_type || null,
      approval_type: apiParticipant.approval_type || null,
      data_source: apiParticipant.data_source || 'unknown',
      is_live_data: apiParticipant.is_live_data || false,
      occurrence_id: apiParticipant.occurrence_id || null,
      fetched_at: apiParticipant.fetched_at || new Date().toISOString(),
      // Engagement metrics
      engagement_score: engagementData.engagement_score,
      interaction_count: engagementData.interaction_count,
      participation_quality: engagementData.participation_quality,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
  }
  
  /**
   * Parse custom questions into structured format
   */
  private static parseCustomQuestions(customQuestions: any): any {
    if (!customQuestions) return null;
    
    if (typeof customQuestions === 'string') {
      try {
        return JSON.parse(customQuestions);
      } catch {
        return { raw: customQuestions };
      }
    }
    
    if (Array.isArray(customQuestions)) {
      return customQuestions.reduce((acc, question) => {
        if (question.title && question.value !== undefined) {
          acc[question.title] = question.value;
        }
        return acc;
      }, {});
    }
    
    return customQuestions;
  }
  
  /**
   * Parse device information into structured format
   */
  private static parseDeviceInfo(participant: any): any {
    return {
      device: participant.device || null,
      ip_address: participant.ip_address || null,
      version: participant.version || null,
      network_type: participant.network_type || null,
      microphone: participant.microphone || null,
      speaker: participant.speaker || null,
      camera: participant.camera || null
    };
  }
  
  /**
   * Parse location information into structured format
   */
  private static parseLocationInfo(participant: any): any {
    return {
      location: participant.location || null,
      country: participant.country || null,
      region: participant.region || null,
      city: participant.city || null,
      timezone: participant.timezone || null
    };
  }
  
  /**
   * Calculate comprehensive engagement metrics
   */
  private static calculateEngagementMetrics(participant: any): {
    engagement_score: number;
    interaction_count: number;
    participation_quality: string;
  } {
    let score = 0;
    let interactions = 0;
    
    // Duration-based scoring (0-40 points)
    const duration = participant.duration || 0;
    score += Math.min(40, duration / 30); // 1 point per 30 seconds, max 40
    
    // Interaction-based scoring (0-30 points)
    if (participant.posted_chat) { score += 10; interactions++; }
    if (participant.answered_polling) { score += 10; interactions++; }
    if (participant.asked_question) { score += 10; interactions++; }
    if (participant.raised_hand) { score += 5; interactions++; }
    
    // Attention-based scoring (0-20 points)
    const attentionScore = parseInt(participant.attentiveness_score) || 0;
    score += (attentionScore / 100) * 20;
    
    // Camera usage scoring (0-10 points)
    if (participant.camera_on_duration > 0) {
      const cameraRatio = participant.camera_on_duration / duration;
      score += cameraRatio * 10;
    }
    
    // Determine participation quality
    let quality = 'low';
    if (score >= 70) quality = 'high';
    else if (score >= 40) quality = 'medium';
    
    return {
      engagement_score: Math.round(score),
      interaction_count: interactions,
      participation_quality: quality
    };
  }
  
  /**
   * Match registrants with participants for data validation
   */
  static matchRegistrantsWithParticipants(registrants: any[], participants: any[]): {
    matched: Array<{ registrant: any; participant: any }>;
    unmatchedRegistrants: any[];
    unmatchedParticipants: any[];
  } {
    const matched: Array<{ registrant: any; participant: any }> = [];
    const unmatchedRegistrants: any[] = [];
    const unmatchedParticipants = [...participants];
    
    for (const registrant of registrants) {
      const participantIndex = unmatchedParticipants.findIndex(p => 
        (p.participant_email && p.participant_email.toLowerCase() === registrant.email.toLowerCase()) ||
        (p.registrant_id && p.registrant_id === registrant.registrant_id)
      );
      
      if (participantIndex !== -1) {
        const participant = unmatchedParticipants.splice(participantIndex, 1)[0];
        matched.push({ registrant, participant });
      } else {
        unmatchedRegistrants.push(registrant);
      }
    }
    
    return {
      matched,
      unmatchedRegistrants,
      unmatchedParticipants
    };
  }
}
