
import { ZoomWebinar, WebinarStatus } from '@/types/zoom';

/**
 * Service for transforming Zoom API responses to database format
 * FIXED: Complete field mapping for all 39 database fields
 */
export class ZoomWebinarTransformService {
  /**
   * Transform Zoom API webinar response to database format with ALL required fields
   */
  static transformWebinarForDatabase(
    apiWebinar: any,
    connectionId: string
  ): Omit<ZoomWebinar, 'id' | 'created_at' | 'updated_at'> {
    console.log(`🔧 TRANSFORM SERVICE: Processing webinar ${apiWebinar.id} with comprehensive field mapping`);
    
    // FIXED: Proper status conversion from string to WebinarStatus enum
    const normalizeStatus = (status: any): WebinarStatus => {
      if (!status) return 'available' as WebinarStatus;
      
      const statusMap: Record<string, WebinarStatus> = {
        'available': 'available' as WebinarStatus,
        'unavailable': 'unavailable' as WebinarStatus,
        'started': 'started' as WebinarStatus,
        'ended': 'ended' as WebinarStatus,
        'deleted': 'deleted' as WebinarStatus,
        'scheduled': 'scheduled' as WebinarStatus,
        'finished': 'finished' as WebinarStatus,
        'cancelled': 'cancelled' as WebinarStatus
      };
      
      return statusMap[status.toLowerCase()] || ('available' as WebinarStatus);
    };

    // FIXED: Complete mapping of ALL 39 database fields including missing ones
    return {
      // Core identification - FIXED: Added all missing fields
      connection_id: connectionId,
      zoom_webinar_id: apiWebinar.id?.toString() || apiWebinar.webinar_id?.toString(), // Correct field name
      uuid: apiWebinar.uuid || null,
      zoom_uuid: apiWebinar.zoom_uuid || null,
      occurrence_id: apiWebinar.occurrence_id || null,
      
      // Add missing required fields
      webinar_id: apiWebinar.id?.toString(),
      webinar_uuid: apiWebinar.uuid || null,
      webinar_type: apiWebinar.type || 5,
      
      // Basic webinar information
      host_id: apiWebinar.host_id || null,
      host_email: apiWebinar.host_email || null,
      topic: apiWebinar.topic || '',
      agenda: apiWebinar.agenda || null,
      status: normalizeStatus(apiWebinar.status),
      start_time: apiWebinar.start_time || null,
      duration: apiWebinar.duration || null,
      timezone: apiWebinar.timezone || null,
      
      // Missing computed fields
      total_absentees: null,
      avg_attendance_duration: null,
      
      // Missing creation tracking
      webinar_created_at: apiWebinar.created_at || null,
      creation_source: apiWebinar.creation_source || null,
      transition_to_live: apiWebinar.transition_to_live || false,
      
      // Access and registration - FIXED: Complete mapping
      // registrants_count: null, // Remove this field as it doesn't exist in database schema
      registrants_restrict_number: apiWebinar.settings?.registrants_restrict_number || null,
      registration_type: apiWebinar.registration_type || apiWebinar.settings?.registration_type || null,
      registration_url: apiWebinar.registration_url || null,
      join_url: apiWebinar.join_url || null,
      start_url: apiWebinar.start_url || null, // FIXED: Added missing field
      approval_type: apiWebinar.settings?.approval_type || null,
      
      // Security and access - FIXED: Correct field names
      password: apiWebinar.password || null,
      h323_passcode: apiWebinar.h323_passcode || null,
      // pstn_password: apiWebinar.pstn_password || null, // Remove this field as it doesn't exist in schema
      encrypted_passcode: apiWebinar.encrypted_passcode || null,
      
      // FIXED: Added missing computed metrics fields (only valid fields)
      total_registrants: null,
      total_attendees: null,
      total_minutes: null,
      
      // Simulive and recording fields
      is_simulive: apiWebinar.is_simulive || false,
      record_file_id: apiWebinar.record_file_id || null,
      
      // JSONB fields - FIXED: Complete extraction
      settings: apiWebinar.settings || null,
      recurrence: apiWebinar.recurrence || null, // FIXED: Added missing field
      occurrences: apiWebinar.occurrences || null, // FIXED: Added missing field
      tracking_fields: apiWebinar.tracking_fields || null,
      // panelists: apiWebinar.panelists || null, // Remove this field as it doesn't exist in schema
      
      // FIXED: Sync tracking fields
      synced_at: new Date().toISOString(),
      last_synced_at: new Date().toISOString(),
      participant_sync_status: 'pending' as const,
      participant_sync_attempted_at: null,
      participant_sync_completed_at: null, // FIXED: Added missing field
      participant_sync_error: null,
    };
  }
}
