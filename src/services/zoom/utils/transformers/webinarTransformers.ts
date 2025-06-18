
import { ZoomWebinar, ZoomRegistrant } from '@/types/zoom';
import { WebinarStatus } from '@/types/zoom/enums';
import { ZoomDataValidator } from './validationUtils';

/**
 * Enhanced data transformation utilities for webinars and registrants
 */
export class WebinarTransformers {
  /**
   * Transform Zoom API webinar to database format with comprehensive field mapping
   * FIXES: Registration logic, missing fields, hardcoded defaults, validation
   */
  static transformWebinarForDatabase(
    apiWebinar: any,
    connectionId: string
  ): Omit<ZoomWebinar, 'id' | 'created_at' | 'updated_at'> {
    // Extract settings for comprehensive field mapping
    const settings = apiWebinar.settings || {};
    
    // FIX CRITICAL: Correct registration logic
    // approval_type: 0=auto, 1=manual, 2=no registration required
    const registrationRequired = settings.approval_type !== 2;
    
    // Status mapping with proper WebinarStatus enum values
    const statusMap: { [key: string]: WebinarStatus } = {
      'available': WebinarStatus.SCHEDULED,
      'unavailable': WebinarStatus.CANCELLED,
      'started': WebinarStatus.STARTED,
      'ended': WebinarStatus.FINISHED,
      'deleted': WebinarStatus.CANCELLED,
      'scheduled': WebinarStatus.SCHEDULED
    };
    const normalizedStatus = statusMap[apiWebinar.status?.toLowerCase()] || WebinarStatus.SCHEDULED;
    
    // Process alternative hosts properly
    const alternativeHosts = settings.alternative_hosts ? 
      settings.alternative_hosts.split(',').map((host: string) => host.trim()) : null;
    
    const transformedData = {
      connection_id: connectionId,
      webinar_id: apiWebinar.id?.toString() || apiWebinar.webinar_id?.toString(),
      webinar_uuid: apiWebinar.uuid,
      host_id: apiWebinar.host_id,
      host_email: apiWebinar.host_email || null,
      topic: apiWebinar.topic,
      agenda: apiWebinar.agenda || null,
      
      // FIX: Don't use hardcoded defaults - use actual API data
      type: apiWebinar.type, // Don't default to 5
      status: normalizedStatus, // Use mapped WebinarStatus enum
      
      start_time: apiWebinar.start_time || null,
      duration: apiWebinar.duration || null,
      timezone: apiWebinar.timezone || null,
      
      // FIX CRITICAL: Correct registration logic
      registration_required: registrationRequired,
      registration_type: settings.registration_type || null,
      registration_url: apiWebinar.registration_url || null,
      join_url: apiWebinar.join_url || null,
      
      // ADD MISSING: Start URL and access fields
      start_url: apiWebinar.start_url || null,
      
      // ADD MISSING: Password and passcode fields
      password: apiWebinar.password || null,
      encrypted_passcode: apiWebinar.encrypted_passcode || apiWebinar.encrypted_password || null,
      h323_password: apiWebinar.h323_password || null,
      h323_passcode: apiWebinar.h323_passcode || null,
      pstn_password: apiWebinar.pstn_password || null,
      
      // Registration and approval settings
      approval_type: settings.approval_type || null,
      max_registrants: settings.registrants_restrict_number || null,
      
      // ADD MISSING: Alternative hosts array
      alternative_hosts: alternativeHosts,
      
      // ADD MISSING: Simulive fields (for on-demand webinars)
      is_simulive: apiWebinar.is_simulive || false,
      record_file_id: apiWebinar.record_file_id || null,
      transition_to_live: apiWebinar.transition_to_live || false,
      
      // ADD MISSING: Creation metadata
      creation_source: apiWebinar.creation_source || null,
      webinar_created_at: apiWebinar.created_at || null,
      
      // ADD MISSING: Occurrence handling for recurring webinars
      occurrence_id: apiWebinar.occurrence_id || apiWebinar.occurrences?.[0]?.occurrence_id || null,
      
      // Calculated fields (preserve existing logic)
      attendees_count: null,
      registrants_count: null,
      synced_at: new Date().toISOString(),
      
      // Enhanced JSONB fields with better data preservation
      settings: settings,
      tracking_fields: apiWebinar.tracking_fields || null,
      recurrence: apiWebinar.recurrence || null,
      occurrences: apiWebinar.occurrences || null,
      panelists: apiWebinar.panelists || null,
      
      // Participant sync status fields
      participant_sync_status: 'pending' as const,
      participant_sync_attempted_at: null,
      participant_sync_error: null,
    };

    // Validate transformed data
    const validation = ZoomDataValidator.validateWebinarData(transformedData);
    
    if (!validation.isValid) {
      console.warn('Webinar transformation validation failed:', {
        webinarId: transformedData.webinar_id,
        errors: validation.errors,
        warnings: validation.warnings
      });
    }
    
    if (validation.warnings.length > 0) {
      console.info('Webinar transformation warnings:', {
        webinarId: transformedData.webinar_id,
        warnings: validation.warnings
      });
    }

    return transformedData;
  }

  /**
   * Transform Zoom API registrant to database format with correct field names
   */
  static transformRegistrant(
    apiRegistrant: any,
    webinarId: string
  ): Omit<ZoomRegistrant, 'id' | 'created_at' | 'updated_at'> {
    return {
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
  }
}
