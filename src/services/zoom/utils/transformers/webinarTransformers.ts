
import { ZoomWebinar, ZoomRegistrant } from '@/types/zoom';

/**
 * Enhanced data transformation utilities for webinars and registrants
 * with comprehensive field mapping and validation logging
 */
export class WebinarTransformers {
  /**
   * Transform Zoom API webinar to database format with comprehensive field mapping
   * Maps all 39 database fields with proper validation and logging
   */
  static transformWebinarForDatabase(
    apiWebinar: any,
    connectionId: string
  ): Omit<ZoomWebinar, 'id' | 'created_at' | 'updated_at'> {
    // Extract settings for comprehensive field mapping
    const settings = apiWebinar.settings || {};
    
    // Log API fields received for debugging
    const apiFields = Object.keys(apiWebinar);
    console.log(`🔍 FIELD EXTRACTION: Webinar ${apiWebinar.id} - API fields received:`, apiFields);
    
    // Core webinar data with comprehensive mapping
    const transformedData = {
      // Connection and identification
      connection_id: connectionId,
      webinar_id: apiWebinar.id?.toString() || apiWebinar.webinar_id?.toString(),
      uuid: apiWebinar.uuid || null, // Map to database 'uuid' field
      webinar_uuid: apiWebinar.uuid || null, // Keep for backward compatibility
      occurrence_id: apiWebinar.occurrence_id || apiWebinar.occurrences?.[0]?.occurrence_id || null,
      
      // Basic webinar information
      host_id: apiWebinar.host_id || null,
      host_email: apiWebinar.host_email || null,
      topic: apiWebinar.topic || '',
      agenda: apiWebinar.agenda || null,
      type: apiWebinar.type || 5,
      status: this.normalizeWebinarStatus(apiWebinar.status),
      start_time: apiWebinar.start_time || null,
      duration: apiWebinar.duration || null,
      timezone: apiWebinar.timezone || null,
      
      // Creation and update tracking
      webinar_created_at: apiWebinar.created_at || null,
      created_at_db: null, // Will be set by database
      updated_at_db: null, // Will be set by database
      
      // Access and registration
      registration_required: !!apiWebinar.registration_url,
      registration_url: apiWebinar.registration_url || null,
      join_url: apiWebinar.join_url || null,
      start_url: apiWebinar.start_url || null,
      password: apiWebinar.password || null,
      approval_type: settings.approval_type || null,
      max_registrants: settings.registrants_restrict_number || null,
      max_attendees: settings.max_attendees || null,
      
      // Updated field names to match Zoom API and database schema
      h323_passcode: apiWebinar.h323_passcode || null,
      pstn_password: apiWebinar.pstn_password || null,
      encrypted_passcode: apiWebinar.encrypted_passcode || null,
      
      // New Zoom API fields
      registration_type: apiWebinar.registration_type || settings.registration_type || null,
      pmi: apiWebinar.pmi || null,
      webinar_passcode: apiWebinar.webinar_passcode || null,
      
      // Computed metrics (will be calculated separately)
      attendees_count: null,
      registrants_count: null,
      total_registrants: null,
      total_attendees: null,
      total_absentees: null,
      total_minutes: null,
      avg_attendance_duration: null,
      
      // JSONB fields with comprehensive extraction
      settings: this.extractSettingsData(apiWebinar.settings, apiWebinar),
      recurrence: apiWebinar.recurrence || null,
      occurrences: apiWebinar.occurrences || null,
      tracking_fields: apiWebinar.tracking_fields || null,
      panelists: apiWebinar.panelists || null,
      
      // Simulive and recording
      is_simulive: apiWebinar.is_simulive || false,
      simulive_webinar_id: apiWebinar.record_file_id || null, // Map to correct field
      
      // Sync tracking
      synced_at: new Date().toISOString(),
      last_synced_at: new Date().toISOString(),
      participant_sync_status: 'pending' as const,
      participant_sync_attempted_at: null,
      participant_sync_completed_at: null,
      participant_sync_error: null,
    };
    
    // Log field mapping success/failure
    const mappedFields = Object.keys(transformedData).filter(key => transformedData[key as keyof typeof transformedData] !== null);
    const unmappedFields = Object.keys(transformedData).filter(key => transformedData[key as keyof typeof transformedData] === null);
    
    console.log(`📊 FIELD MAPPING STATS: Webinar ${apiWebinar.id}`);
    console.log(`  ✅ Mapped fields (${mappedFields.length}):`, mappedFields);
    console.log(`  ❌ Unmapped fields (${unmappedFields.length}):`, unmappedFields);
    console.log(`  📈 Success rate: ${((mappedFields.length / Object.keys(transformedData).length) * 100).toFixed(1)}%`);
    
    return transformedData;
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
   */
  private static extractSettingsData(apiSettings: any, fullApiResponse: any): any {
    if (!apiSettings && !fullApiResponse) {
      return {};
    }
    
    const settings = apiSettings || {};
    
    // FIXED: Properly handle alternative_hosts without array conversion
    // Alternative hosts should be stored as a comma-separated string in settings
    if (settings.alternative_hosts) {
      console.log(`🔧 ALTERNATIVE HOSTS: Found in settings: ${settings.alternative_hosts}`);
    } else if (fullApiResponse.alternative_hosts) {
      // If it's an array, convert to comma-separated string
      if (Array.isArray(fullApiResponse.alternative_hosts)) {
        settings.alternative_hosts = fullApiResponse.alternative_hosts.join(',');
      } else {
        settings.alternative_hosts = String(fullApiResponse.alternative_hosts);
      }
      console.log(`🔧 ALTERNATIVE HOSTS: Extracted from API: ${settings.alternative_hosts}`);
    }
    
    // Extract additional settings fields that might be at the root level
    const additionalSettings = {
      host_video: fullApiResponse.host_video,
      panelists_video: fullApiResponse.panelists_video,
      practice_session: fullApiResponse.practice_session,
      hd_video: fullApiResponse.hd_video,
      auto_recording: fullApiResponse.auto_recording,
      enforce_login: fullApiResponse.enforce_login,
      // Add more settings as needed
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
