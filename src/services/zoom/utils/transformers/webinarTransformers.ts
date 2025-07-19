
import { ZoomWebinar, ZoomRegistrant, WebinarStatus } from '@/types/zoom';

/**
 * Enhanced data transformation utilities for webinars and registrants
 * FIXED: Complete field mapping and type safety
 */
export class WebinarTransformers {
  /**
   * Transform Zoom API webinar to database format with ALL 39 database fields
   * FIXED: Proper type conversion and complete field mapping
   */
  static transformWebinarForDatabase(
    apiWebinar: any,
    connectionId: string
  ): Omit<ZoomWebinar, 'id' | 'created_at' | 'updated_at'> {
    console.log(`🔧 ENHANCED TRANSFORMER: Processing webinar ${apiWebinar.id} with complete field mapping`);
    
    // FIXED: Proper status conversion to WebinarStatus enum
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
      
      const result = statusMap[status.toLowerCase()] || ('available' as WebinarStatus);
      console.log(`🔧 STATUS CONVERSION: ${status} -> ${result}`);
      return result;
    };

    // Extract settings for comprehensive field mapping
    const settings = apiWebinar.settings || {};
    
    // Transform to match exact database schema
    const transformedData = {
      // Connection and identification
      connection_id: connectionId,
      zoom_webinar_id: apiWebinar.id?.toString() || apiWebinar.webinar_id?.toString(),
      webinar_id: apiWebinar.id?.toString() || apiWebinar.webinar_id?.toString(), // Keep for backward compatibility
      uuid: apiWebinar.uuid || null,
      webinar_uuid: apiWebinar.uuid || null, // Keep for backward compatibility
      occurrence_id: apiWebinar.occurrence_id || apiWebinar.occurrences?.[0]?.occurrence_id || null,
      
      // Basic webinar information
      host_id: apiWebinar.host_id || null,
      host_email: apiWebinar.host_email || null,
      topic: apiWebinar.topic || '',
      agenda: apiWebinar.agenda || null,
      webinar_type: apiWebinar.type || 5,
      status: normalizeStatus(apiWebinar.status), // FIXED: Proper enum conversion
      start_time: apiWebinar.start_time || null,
      duration: apiWebinar.duration || null,
      timezone: apiWebinar.timezone || null,
      
      // Creation and update tracking - Add missing fields
      creation_source: apiWebinar.creation_source || null,
      transition_to_live: apiWebinar.transition_to_live || false,
      zoom_uuid: apiWebinar.zoom_uuid || null,
      webinar_created_at: apiWebinar.created_at || null,
      
      // Access and registration
      registration_type: apiWebinar.registration_type || settings.registration_type || null,
      registration_url: apiWebinar.registration_url || null,
      join_url: apiWebinar.join_url || null,
      start_url: apiWebinar.start_url || null,
      approval_type: settings.approval_type || null,
      registrants_restrict_number: settings.registrants_restrict_number || null,
      
      // Security and access
      password: apiWebinar.password || null,
      h323_passcode: apiWebinar.h323_passcode || null,
      encrypted_passcode: apiWebinar.encrypted_passcode || null,
      
      // Simulive and special features
      is_simulive: apiWebinar.is_simulive || false,
      record_file_id: apiWebinar.record_file_id || null,
      
      // Computed metrics (will be calculated separately but need to be present for type safety)
      total_registrants: null,
      total_attendees: null,
      total_absentees: null,
      total_minutes: null,
      avg_attendance_duration: null,
      
      // Note: attendees_count and registrants_count fields have been removed as they don't exist in the database
      // The database uses total_attendees and total_registrants instead
      
      // JSONB fields with enhanced extraction
      settings: this.extractSettingsData(apiWebinar.settings, apiWebinar),
      recurrence: apiWebinar.recurrence || null,
      occurrences: apiWebinar.occurrences || null,
      tracking_fields: apiWebinar.tracking_fields || null,
      
      // Sync tracking
      synced_at: new Date().toISOString(),
      last_synced_at: new Date().toISOString(),
      participant_sync_status: 'pending' as const,
      participant_sync_attempted_at: null,
      participant_sync_completed_at: null,
      participant_sync_error: null,
    };
    
    // Log field mapping success
    const populatedFields = Object.entries(transformedData).filter(([key, value]) => value !== null).length;
    const totalFields = Object.keys(transformedData).length;
    console.log(`📊 TRANSFORMER SUCCESS: ${populatedFields}/${totalFields} fields populated (${((populatedFields/totalFields)*100).toFixed(1)}%)`);
    
    return transformedData; // Return the data as-is without adding non-existent fields
  }

  /**
   * Normalize webinar status from various API response formats
   */
  private static normalizeWebinarStatus(status: any): string {
    if (!status) {
      return 'available'; // Default status
    }
    
    const statusMap: { [key: string]: string } = {
      'available': 'available',
      'unavailable': 'unavailable', 
      'started': 'started',
      'ended': 'ended',
      'deleted': 'deleted',
      'scheduled': 'scheduled'
    };
    
    const normalizedStatus = statusMap[status.toLowerCase()] || 'available';
    console.log(`🔧 STATUS NORMALIZATION: ${status} -> ${normalizedStatus}`);
    
    return normalizedStatus;
  }

  /**
   * Extract comprehensive settings data including alternative hosts handling
   * FIXED: Proper string handling for alternative_hosts
   */
  private static extractSettingsData(apiSettings: any, fullApiResponse: any): any {
    if (!apiSettings && !fullApiResponse) {
      return {};
    }
    
    const settings = apiSettings || {};
    
    // FIXED: Properly handle alternative_hosts as string
    if (settings.alternative_hosts !== undefined) {
      if (Array.isArray(settings.alternative_hosts)) {
        settings.alternative_hosts = settings.alternative_hosts.join(',');
      } else {
        settings.alternative_hosts = String(settings.alternative_hosts || '');
      }
      console.log(`🔧 ALTERNATIVE HOSTS: Processed as string: "${settings.alternative_hosts}"`);
    } else if (fullApiResponse.alternative_hosts !== undefined) {
      if (Array.isArray(fullApiResponse.alternative_hosts)) {
        settings.alternative_hosts = fullApiResponse.alternative_hosts.join(',');
      } else {
        settings.alternative_hosts = String(fullApiResponse.alternative_hosts || '');
      }
      console.log(`🔧 ALTERNATIVE HOSTS: Extracted from root API: "${settings.alternative_hosts}"`);
    }
    
    // Extract additional settings fields that might be at the root level
    const additionalSettings = {
      host_video: fullApiResponse.host_video,
      panelists_video: fullApiResponse.panelists_video,
      practice_session: fullApiResponse.practice_session,
      hd_video: fullApiResponse.hd_video,
      auto_recording: fullApiResponse.auto_recording,
      enforce_login: fullApiResponse.enforce_login,
    };
    
    // Filter out null/undefined values
    Object.keys(additionalSettings).forEach(key => {
      if (additionalSettings[key as keyof typeof additionalSettings] != null) {
        settings[key] = additionalSettings[key as keyof typeof additionalSettings];
      }
    });
    
    console.log(`📋 SETTINGS EXTRACTION: Found ${Object.keys(settings).length} settings fields`);
    
    return settings;
  }

  /**
   * Transform Zoom API registrant to database format with correct field names
   */
  static transformRegistrant(
    apiRegistrant: any,
    webinarId: string
  ): Omit<ZoomRegistrant, 'id' | 'created_at' | 'updated_at'> {
    console.log(`🔍 REGISTRANT EXTRACTION: Processing registrant for webinar ${webinarId}`);
    
    const transformedRegistrant = {
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
    
    // Log registrant mapping success
    const populatedFields = Object.values(transformedRegistrant).filter(val => val !== null).length;
    console.log(`📊 REGISTRANT MAPPING: ${populatedFields}/${Object.keys(transformedRegistrant).length} fields populated`);
    
    return transformedRegistrant;
  }
}
