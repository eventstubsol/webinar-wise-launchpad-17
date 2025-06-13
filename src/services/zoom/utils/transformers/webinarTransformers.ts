
import { ZoomWebinar, ZoomRegistrant } from '@/types/zoom';

/**
 * Data transformation utilities for webinars and registrants
 */
export class WebinarTransformers {
  /**
   * Transform Zoom API webinar to database format
   */
  static transformWebinarForDatabase(
    apiWebinar: any,
    connectionId: string
  ): Omit<ZoomWebinar, 'id' | 'created_at' | 'updated_at'> {
    return {
      connection_id: connectionId,
      webinar_id: apiWebinar.id,
      webinar_uuid: apiWebinar.uuid,
      host_id: apiWebinar.host_id,
      host_email: apiWebinar.host_email || null,
      topic: apiWebinar.topic,
      agenda: apiWebinar.agenda || null,
      type: apiWebinar.type,
      status: apiWebinar.status,
      start_time: apiWebinar.start_time || null,
      duration: apiWebinar.duration || null,
      timezone: apiWebinar.timezone || null,
      registration_required: !!apiWebinar.registration_url,
      registration_type: apiWebinar.settings?.registration_type || null,
      registration_url: apiWebinar.registration_url || null,
      join_url: apiWebinar.join_url || null,
      approval_type: apiWebinar.settings?.approval_type || null,
      alternative_hosts: apiWebinar.settings?.alternative_hosts ? 
        apiWebinar.settings.alternative_hosts.split(',').map(h => h.trim()) : null,
      max_registrants: null,
      max_attendees: null,
      occurrence_id: apiWebinar.occurrences?.[0]?.occurrence_id || null,
      total_registrants: null,
      total_attendees: null,
      total_minutes: null,
      avg_attendance_duration: null,
      synced_at: new Date().toISOString(),
    };
  }

  /**
   * Transform Zoom API registrant to database format
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
    };
  }
}
