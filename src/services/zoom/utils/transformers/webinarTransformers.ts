
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
      registration_type: settings.registration_type || null,
      registration_url: apiWebinar.registration_url || null,
      join_url: apiWebinar.join_url || null,
      approval_type: settings.approval_type || null,
      alternative_hosts: settings.alternative_hosts ? 
        settings.alternative_hosts.split(',').map((h: string) => h.trim()) : null,
      max_registrants: settings.registrants_restrict_number || null,
      max_attendees: null,
      occurrence_id: apiWebinar.occurrences?.[0]?.occurrence_id || apiWebinar.occurrence_id || null,
      total_registrants: null,
      total_attendees: null,
      total_minutes: null,
      avg_attendance_duration: null,
      synced_at: new Date().toISOString(),
      
      // Enhanced field mapping for missing data
      password: apiWebinar.password || null,
      h323_password: apiWebinar.h323_password || apiWebinar.h323_passcode || null,
      pstn_password: apiWebinar.pstn_password || null,
      encrypted_password: apiWebinar.encrypted_password || apiWebinar.encrypted_passcode || null,
      settings: settings,
      tracking_fields: apiWebinar.tracking_fields || null,
      recurrence: apiWebinar.recurrence || null,
      occurrences: apiWebinar.occurrences || null,
      
      // New fields from Zoom API schema
      start_url: apiWebinar.start_url || null,
      encrypted_passcode: apiWebinar.encrypted_passcode || apiWebinar.encrypted_password || null,
      creation_source: apiWebinar.creation_source || null,
      is_simulive: apiWebinar.is_simulive || false,
      record_file_id: apiWebinar.record_file_id || null,
      transition_to_live: apiWebinar.transition_to_live || false,
      webinar_created_at: apiWebinar.created_at || null,
    };
  }

  /**
   * Transform Zoom API registrant to database format with new fields
   */
  static transformRegistrant(
    apiRegistrant: any,
    webinarId: string
  ): Omit<ZoomRegistrant, 'id' | 'created_at' | 'updated_at'> {
    return {
      webinar_id: webinarId,
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
      comments: apiRegistrant.comments || null,
      custom_questions: apiRegistrant.custom_questions || null,
      registration_time: apiRegistrant.registration_time,
      source_id: apiRegistrant.source_id || null,
      tracking_source: apiRegistrant.tracking_source || null,
      status: apiRegistrant.status || 'approved',
      join_time: apiRegistrant.join_time || null,
      leave_time: apiRegistrant.leave_time || null,
      duration: apiRegistrant.duration || null,
      attended: !!apiRegistrant.join_time,
      job_title: apiRegistrant.job_title || null,
      purchasing_time_frame: apiRegistrant.purchasing_time_frame || null,
      role_in_purchase_process: apiRegistrant.role_in_purchase_process || null,
      no_of_employees: apiRegistrant.no_of_employees || null,
      industry: apiRegistrant.industry || null,
      org: apiRegistrant.org || null,
      language: apiRegistrant.language || null,
      // New fields from API alignment
      join_url: apiRegistrant.join_url || null,
      create_time: apiRegistrant.create_time || apiRegistrant.registration_time || null,
    };
  }
}
