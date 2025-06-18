
/**
 * Enhanced webinar data transformers with improved registrant support
 */
export class WebinarTransformers {
  /**
   * ENHANCED: Transform Zoom API registrant to database format with new uuid field
   */
  static transformRegistrant(apiRegistrant: any, webinarDbId: string): any {
    if (!apiRegistrant) {
      throw new Error('Cannot transform null/undefined registrant');
    }
    
    if (!webinarDbId) {
      throw new Error('Cannot transform registrant without webinar DB ID');
    }
    
    // Enhanced status mapping
    let normalizedStatus = 'approved';
    if (apiRegistrant.status) {
      const statusMap: { [key: string]: string } = {
        'approved': 'approved',
        'pending': 'pending', 
        'denied': 'denied',
        'cancelled': 'cancelled',
        'waiting': 'pending',
        'rejected': 'denied'
      };
      normalizedStatus = statusMap[apiRegistrant.status.toLowerCase()] || 'approved';
    }

    // Determine the best registration timestamp - prefer registration_time over create_time
    const registrationTime = apiRegistrant.registration_time || 
                            apiRegistrant.create_time || 
                            new Date().toISOString();

    return {
      webinar_id: webinarDbId,
      registrant_id: apiRegistrant.id || apiRegistrant.registrant_id,
      registrant_uuid: apiRegistrant.uuid || null, // NEW: Support for uuid field
      registrant_email: apiRegistrant.email,
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
      custom_questions: apiRegistrant.custom_questions || null,
      registration_time: registrationTime, // Enhanced: Use best available timestamp
      source_id: apiRegistrant.source_id || null,
      tracking_source: apiRegistrant.tracking_source || null,
      status: normalizedStatus,
      join_url: apiRegistrant.join_url || null,
      create_time: apiRegistrant.create_time || null, // Keep original create_time for reference
      language: apiRegistrant.language || null,
      // Participant attendance fields (will be updated during participant sync)
      join_time: null,
      leave_time: null,
      duration: null,
      attended: false
    };
  }

  /**
   * Transform Zoom API webinar to database format
   */
  static transformWebinarForDatabase(apiWebinar: any, connectionId: string): any {
    if (!apiWebinar) {
      throw new Error('Cannot transform null/undefined webinar');
    }

    // Enhanced webinar transformation logic
    return {
      connection_id: connectionId,
      zoom_webinar_id: apiWebinar.id,
      zoom_uuid: apiWebinar.uuid || null,
      title: apiWebinar.topic || 'Untitled Webinar',
      description: apiWebinar.agenda || null,
      start_time: apiWebinar.start_time || null,
      duration: apiWebinar.duration || 0,
      timezone: apiWebinar.timezone || 'UTC',
      status: this.normalizeWebinarStatus(apiWebinar.status),
      host_email: apiWebinar.host_email || null,
      host_name: this.extractHostName(apiWebinar),
      password_required: apiWebinar.password ? true : false,
      approval_type: apiWebinar.settings?.approval_type || 2,
      join_url: apiWebinar.join_url || null,
      registration_url: apiWebinar.registration_url || null,
      // Registration metrics (will be updated during registrant sync)
      registrant_count: 0,
      attendee_count: 0,
      // Sync tracking
      synced_at: new Date().toISOString(),
      participant_sync_status: 'pending',
      last_participant_sync_at: null,
      participant_sync_error: null
    };
  }

  /**
   * Normalize webinar status for database consistency
   */
  private static normalizeWebinarStatus(apiStatus: string): string {
    if (!apiStatus) return 'unknown';
    
    const statusMap: { [key: string]: string } = {
      'waiting': 'scheduled',
      'started': 'live', 
      'finished': 'ended',
      'ended': 'ended',
      'available': 'available',
      'unavailable': 'unavailable'
    };
    
    return statusMap[apiStatus.toLowerCase()] || apiStatus.toLowerCase();
  }

  /**
   * Extract host name from webinar data
   */
  private static extractHostName(apiWebinar: any): string | null {
    if (apiWebinar.host_name) return apiWebinar.host_name;
    if (apiWebinar.host_email) {
      return apiWebinar.host_email.split('@')[0];
    }
    return null;
  }

  /**
   * Transform participant data for database storage
   */
  static transformParticipant(apiParticipant: any, webinarDbId: string): any {
    if (!apiParticipant || !webinarDbId) {
      throw new Error('Invalid participant data or webinar ID');
    }

    return {
      webinar_id: webinarDbId,
      participant_id: apiParticipant.id || apiParticipant.participant_id,
      participant_uuid: apiParticipant.uuid || null,
      participant_name: apiParticipant.name || apiParticipant.participant_name,
      participant_email: apiParticipant.email || apiParticipant.participant_email,
      join_time: apiParticipant.join_time || null,
      leave_time: apiParticipant.leave_time || null,
      duration: apiParticipant.duration || 0,
      attentiveness_score: apiParticipant.attentiveness_score || null,
      failover: apiParticipant.failover || false,
      status: apiParticipant.status || 'attended'
    };
  }
}
