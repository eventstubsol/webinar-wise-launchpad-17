
import { ZoomWebinar, WebinarStatus } from '@/types/zoom';

/**
 * Service for transforming Zoom API responses to database format
 * FIXED: Complete field mapping for all 39 database fields
 */
export class ZoomWebinarTransformService {
  /**
   * Transform Zoom API webinar response to database format with ALL required fields
   * ENHANCED: Time-based status derivation for accurate status calculation
   */
  static transformWebinarForDatabase(
    apiWebinar: any,
    connectionId: string
  ): Omit<ZoomWebinar, 'id' | 'created_at' | 'updated_at'> {
    console.log(`🔧 TRANSFORM SERVICE: Processing webinar ${apiWebinar.id} with time-based status calculation`);
    
    // ENHANCED: Time-based status derivation with fallback to API status
    const deriveWebinarStatus = (apiStatus: any, startTime: string | null, duration: number | null): WebinarStatus => {
      console.log(`🕒 STATUS DERIVATION: API status="${apiStatus}", start_time="${startTime}", duration=${duration}`);
      
      // If we have specific statuses from API, respect them (cancelled, deleted, etc.)
      if (apiStatus && ['cancelled', 'deleted', 'unavailable'].includes(apiStatus.toLowerCase())) {
        const result = apiStatus.toLowerCase() as WebinarStatus;
        console.log(`📊 Using API status for cancelled/deleted: ${result}`);
        return result;
      }
      
      // Apply time-based calculation for scheduled webinars or when API status is generic
      if (startTime && duration) {
        const start = new Date(startTime);
        const now = new Date();
        const end = new Date(start.getTime() + (duration * 60 * 1000));
        const bufferEnd = new Date(end.getTime() + (5 * 60 * 1000)); // 5 min buffer
        
        if (now < start) {
          console.log(`📊 Time-based status: upcoming (starts in future)`);
          return WebinarStatus.UPCOMING;
        } else if (now >= start && now <= bufferEnd) {
          console.log(`📊 Time-based status: live (currently in progress)`);
          return WebinarStatus.LIVE;
        } else {
          console.log(`📊 Time-based status: ended (past webinar)`);
          return WebinarStatus.ENDED;
        }
      }
      
      // Fallback: normalize API status or use default
      const statusMap: Record<string, WebinarStatus> = {
        'available': WebinarStatus.AVAILABLE,
        'scheduled': WebinarStatus.UPCOMING, // Map scheduled to upcoming for better clarity
        'started': WebinarStatus.LIVE,
        'ended': WebinarStatus.ENDED,
        'finished': WebinarStatus.ENDED
      };
      
      const fallbackStatus = statusMap[apiStatus?.toLowerCase()] || WebinarStatus.AVAILABLE;
      console.log(`📊 Fallback status: ${fallbackStatus}`);
      return fallbackStatus;
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
      status: deriveWebinarStatus(apiWebinar.status, apiWebinar.start_time, apiWebinar.duration), // ENHANCED: Time-based status derivation
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
