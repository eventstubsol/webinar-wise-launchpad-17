
/**
 * Enhanced webinar transformers for 100% Zoom API compliance
 */

export class EnhancedWebinarTransformers {
  /**
   * Transform enhanced registrant for database with all new fields
   */
  static transformEnhancedRegistrant(apiRegistrant: any, webinarDbId: string, additionalData?: {
    occurrenceId?: string;
    trackingSourceId?: string;
  }): any {
    if (!apiRegistrant) {
      throw new Error('Cannot transform null/undefined registrant');
    }
    
    if (!webinarDbId) {
      throw new Error('Cannot transform registrant without webinar DB ID');
    }
    
    // Enhanced status mapping
    const statusMap: { [key: string]: string } = {
      'approved': 'approved',
      'pending': 'pending', 
      'denied': 'denied',
      'cancelled': 'denied',
      'waiting': 'pending',
      'rejected': 'denied'
    };
    
    const normalizedStatus = statusMap[apiRegistrant.status?.toLowerCase()] || 'approved';

    return {
      webinar_id: webinarDbId,
      registrant_id: apiRegistrant.id || apiRegistrant.registrant_id,
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
      custom_questions: apiRegistrant.custom_questions ? JSON.stringify(apiRegistrant.custom_questions) : null,
      status: normalizedStatus,
      join_url: apiRegistrant.join_url || null,
      create_time: apiRegistrant.create_time || null,
      
      // Enhanced fields for full API compliance
      registration_time: apiRegistrant.create_time || new Date().toISOString(),
      occurrence_id: additionalData?.occurrenceId || null,
      tracking_source_id: additionalData?.trackingSourceId || null,
      source_id: apiRegistrant.source_id || null,
      tracking_source: apiRegistrant.tracking_source || null,
      language: apiRegistrant.language || null,
      
      // Attendance tracking (to be updated from participant data)
      join_time: null,
      leave_time: null,
      duration: null,
      attended: false
    };
  }

  /**
   * Transform Zoom API response to comply with exact API specification
   */
  static transformRegistrantsResponse(zoomResponse: any): any {
    return {
      next_page_token: zoomResponse.next_page_token || undefined,
      page_count: zoomResponse.page_count || 1,
      page_number: zoomResponse.page_number || 1,
      page_size: zoomResponse.page_size || 30,
      total_records: zoomResponse.total_records || 0,
      registrants: (zoomResponse.registrants || []).map((registrant: any) => ({
        id: registrant.id,
        email: registrant.email,
        first_name: registrant.first_name,
        last_name: registrant.last_name,
        address: registrant.address,
        city: registrant.city,
        state: registrant.state,
        zip: registrant.zip,
        country: registrant.country,
        phone: registrant.phone,
        industry: registrant.industry,
        org: registrant.org,
        job_title: registrant.job_title,
        purchasing_time_frame: registrant.purchasing_time_frame,
        role_in_purchase_process: registrant.role_in_purchase_process,
        no_of_employees: registrant.no_of_employees,
        comments: registrant.comments,
        custom_questions: registrant.custom_questions,
        status: registrant.status,
        create_time: registrant.create_time,
        join_url: registrant.join_url
      }))
    };
  }

  /**
   * Validate registrant data against Zoom API specification
   */
  static validateRegistrantData(registrant: any): boolean {
    // Required fields according to Zoom API
    if (!registrant.email || !registrant.first_name) {
      return false;
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(registrant.email)) {
      return false;
    }

    // Status validation
    const validStatuses = ['approved', 'denied', 'pending'];
    if (registrant.status && !validStatuses.includes(registrant.status)) {
      return false;
    }

    // String length validations per Zoom API spec
    if (registrant.email && registrant.email.length > 128) {
      return false;
    }

    if (registrant.first_name && registrant.first_name.length > 64) {
      return false;
    }

    if (registrant.last_name && registrant.last_name.length > 64) {
      return false;
    }

    return true;
  }
}
