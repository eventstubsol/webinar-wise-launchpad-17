
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
      registration_url: apiWebinar.registration_url || null,
      join_url: apiWebinar.join_url || null,
      approval_type: apiWebinar.settings?.approval_type || null,
      max_registrants: apiWebinar.settings?.registrants_restrict_number || null,
      attendees_count: null, // Will be calculated after participants sync
      registrants_count: null, // Will be calculated after registrants sync
      synced_at: new Date().toISOString(),
      
      // Updated field names to match Zoom API
      password: apiWebinar.password || null,
      h323_passcode: apiWebinar.h323_passcode || null, // Updated field name
      pstn_password: apiWebinar.pstn_password || null, // Updated field name  
      encrypted_passcode: apiWebinar.encrypted_passcode || null, // Updated field name
      
      // New Zoom API fields
      start_url: apiWebinar.start_url || null,
      registration_type: apiWebinar.registration_type || apiWebinar.settings?.registration_type || null,
      pmi: apiWebinar.pmi || null,
      webinar_passcode: apiWebinar.webinar_passcode || null,
      
      settings: apiWebinar.settings || null,
      tracking_fields: apiWebinar.tracking_fields || null,
      recurrence: apiWebinar.recurrence || null,
      occurrences: apiWebinar.occurrences || null,
      panelists: apiWebinar.panelists || null,
      participant_sync_status: 'pending',
      participant_sync_attempted_at: null,
      participant_sync_error: null,
    };
  }
}
