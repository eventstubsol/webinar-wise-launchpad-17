
import { ZoomWebinar } from '@/types/zoom';
import type { ZoomWebinarApiResponse } from './ZoomWebinarDataService';

/**
 * Service for transforming Zoom API responses to database format
 */
export class ZoomWebinarTransformService {
  /**
   * Transform Zoom API webinar response to database format
   */
  static transformWebinarForDatabase(
    apiWebinar: any, // Using any as ZoomWebinarApiResponse is not available here
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
      status: apiWebinar.status as any,
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
      max_registrants: null, // Not provided in basic API response
      max_attendees: null, // Not provided in basic API response
      occurrence_id: apiWebinar.occurrences?.[0]?.occurrence_id || null,
      total_registrants: null, // Will be calculated after registrants sync
      total_attendees: null, // Will be calculated after participants sync
      total_minutes: null, // Will be calculated after participants sync
      avg_attendance_duration: null, // Will be calculated after participants sync
      synced_at: new Date().toISOString(),
      password: apiWebinar.password || null,
      h323_password: apiWebinar.h323_password || null,
      pstn_password: apiWebinar.pstn_password || null,
      encrypted_password: apiWebinar.encrypted_password || null,
      settings: apiWebinar.settings || null,
      tracking_fields: apiWebinar.tracking_fields || null,
      recurrence: apiWebinar.recurrence || null,
      occurrences: apiWebinar.occurrences || null,
    };
  }
}
