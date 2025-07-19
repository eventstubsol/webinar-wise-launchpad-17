
import { ZoomWebinar, ZoomRegistrant, WebinarStatus } from '@/types/zoom';

/**
 * Enhanced data transformation utilities for webinars and registrants
 * FIXED: Complete field mapping and type safety
 */
export class WebinarTransformers {
  /**
   * Transform Zoom API webinar to database format with ALL 39 database fields
   * ENHANCED: Time-based status derivation for accurate status calculation
   */
  static transformWebinarForDatabase(
    apiWebinar: any,
    connectionId: string
  ): Omit<ZoomWebinar, 'id' | 'created_at' | 'updated_at'> {
    console.log(`🔧 ENHANCED TRANSFORMER: Processing webinar ${apiWebinar.id} with complete field mapping and time-based status`);
    
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
      status: deriveWebinarStatus(apiWebinar.status, apiWebinar.start_time, apiWebinar.duration), // ENHANCED: Time-based status derivation
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
