
import { ZoomWebinar, ZoomRegistrant } from '@/types/zoom';

/**
 * Data transformation utilities for webinars and registrants
 */
export class WebinarTransformers {
  /**
   * Transform Zoom API webinar to database format with comprehensive field mapping
   */
  static transformWebinarForDatabase(
    apiWebinar: any,
    connectionId: string
  ): Omit<ZoomWebinar, 'id' | 'created_at' | 'updated_at'> {
    // Extract settings for better field mapping
    const settings = apiWebinar.settings || {};
    
    return {
      connection_id: connectionId,
      webinar_id: apiWebinar.id?.toString() || apiWebinar.webinar_id?.toString(),
      webinar_uuid: apiWebinar.uuid,
      host_id: apiWebinar.host_id,
      host_email: apiWebinar.host_email || null,
      topic: apiWebinar.topic,
      agenda: apiWebinar.agenda || null,
      type: apiWebinar.type || 5,
      status: apiWebinar.status || 'available',
      start_time: apiWebinar.start_time || null,
      duration: apiWebinar.duration || null,
      timezone: apiWebinar.timezone || null,
      registration_required: !!apiWebinar.registration_url,
      registration_url: apiWebinar.registration_url || null,
      join_url: apiWebinar.join_url || null,
      approval_type: settings.approval_type || null,
      max_registrants: settings.registrants_restrict_number || null,
      attendees_count: null,
      registrants_count: null,
      synced_at: new Date().toISOString(),
      
      // Enhanced field mapping for missing data
      password: apiWebinar.password || null,
      settings: settings,
      tracking_fields: apiWebinar.tracking_fields || null,
      recurrence: apiWebinar.recurrence || null,
      occurrences: apiWebinar.occurrences || null,
      panelists: apiWebinar.panelists || null,
      
      // Participant sync status fields
      participant_sync_status: 'pending',
      participant_sync_attempted_at: null,
      participant_sync_error: null,
    };
  }

  /**
   * Transform Zoom API registrant to database format with correct field names
   */
  static transformRegistrant(
    apiRegistrant: any,
    webinarId: string
  ): Omit<ZoomRegistrant, 'id' | 'created_at' | 'updated_at'> {
    return {
      webinar_id: webinarId,
      registrant_id: apiRegistrant.id || apiRegistrant.registrant_id,
      registrant_uuid: apiRegistrant.uuid || null,
      registrant_email: apiRegistrant.email,
      first_name: apiRegistrant.first_name || null,
      last_name: apiRegistrant.last_name || null,
      address: apiRegistrant.address || null,
      city: apiRegistrant.city || null,
      state: apiRegistrant.state || null,
      zip: apiRegistrant.zip || null,
      country: apiRegistrant.country || null,
      phone: apiRegistrant.phone || null,
      comments: apiRegistrant.comments || null,
      custom_questions: apiRegistrant.custom_questions || null,
      create_time: apiRegistrant.create_time || apiRegistrant.registration_time || null,
      join_url: apiRegistrant.join_url || null,
      status: apiRegistrant.status || 'approved',
      job_title: apiRegistrant.job_title || null,
      purchasing_time_frame: apiRegistrant.purchasing_time_frame || null,
      role_in_purchase_process: apiRegistrant.role_in_purchase_process || null,
      no_of_employees: apiRegistrant.no_of_employees || null,
      industry: apiRegistrant.industry || null,
      org: apiRegistrant.org || null,
    };
  }
}
