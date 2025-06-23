
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
      webinar_id: apiWebinar.id?.toString() || apiWebinar.webinar_id?.toString(),
      uuid: apiWebinar.uuid || null, // FIXED: Added missing uuid field
      webinar_uuid: apiWebinar.uuid || null, // Keep for backward compatibility
      occurrence_id: apiWebinar.occurrence_id || null, // FIXED: Added missing field
      
      // Basic webinar information
      host_id: apiWebinar.host_id || null,
      host_email: apiWebinar.host_email || null,
      topic: apiWebinar.topic || '',
      agenda: apiWebinar.agenda || null,
      type: apiWebinar.type || 5,
      status: normalizeStatus(apiWebinar.status), // FIXED: Proper enum conversion
      start_time: apiWebinar.start_time || null,
      duration: apiWebinar.duration || null,
      timezone: apiWebinar.timezone || null,
      
      // FIXED: Added missing creation tracking fields
      webinar_created_at: apiWebinar.created_at || null,
      created_at_db: null, // Will be set by database
      updated_at_db: null, // Will be set by database
      
      // Access and registration - FIXED: Complete mapping
      registration_required: !!apiWebinar.registration_url,
      registration_type: apiWebinar.registration_type || apiWebinar.settings?.registration_type || null,
      registration_url: apiWebinar.registration_url || null,
      join_url: apiWebinar.join_url || null,
      start_url: apiWebinar.start_url || null, // FIXED: Added missing field
      approval_type: apiWebinar.settings?.approval_type || null,
      max_registrants: apiWebinar.settings?.registrants_restrict_number || null,
      max_attendees: apiWebinar.settings?.max_attendees || null, // FIXED: Added missing field
      
      // Security and access - FIXED: Correct field names
      password: apiWebinar.password || null,
      h323_passcode: apiWebinar.h323_passcode || null,
      pstn_password: apiWebinar.pstn_password || null,
      encrypted_passcode: apiWebinar.encrypted_passcode || null,
      webinar_passcode: apiWebinar.webinar_passcode || null, // FIXED: Added missing field
      pmi: apiWebinar.pmi || null,
      
      // FIXED: Added missing simulive fields
      is_simulive: apiWebinar.is_simulive || false,
      simulive_webinar_id: apiWebinar.record_file_id || null,
      
      // FIXED: Added missing computed metrics fields (including attendees_count and registrants_count)
      total_registrants: null,
      total_attendees: null,
      total_absentees: null,
      total_minutes: null,
      avg_attendance_duration: null,
      attendees_count: null, // FIXED: Added missing field
      registrants_count: null, // FIXED: Added missing field
      
      // JSONB fields - FIXED: Complete extraction
      settings: apiWebinar.settings || null,
      recurrence: apiWebinar.recurrence || null, // FIXED: Added missing field
      occurrences: apiWebinar.occurrences || null, // FIXED: Added missing field
      tracking_fields: apiWebinar.tracking_fields || null,
      panelists: apiWebinar.panelists || null, // FIXED: Added missing field
      
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
