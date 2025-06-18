
import { ZoomWebinar } from '@/types/zoom';
import { WebinarTransformers } from '../utils/transformers/webinarTransformers';

/**
 * Enhanced service for transforming Zoom API responses to database format
 */
export class ZoomWebinarTransformService {
  /**
   * Transform Zoom API webinar response to database format
   * Now uses the enhanced WebinarTransformers with all field mappings
   */
  static transformWebinarForDatabase(
    apiWebinar: any,
    connectionId: string
  ): Omit<ZoomWebinar, 'id' | 'created_at' | 'updated_at'> {
    return WebinarTransformers.transformWebinarForDatabase(apiWebinar, connectionId);
  }

  /**
   * Validate transformed webinar data
   */
  static validateTransformedData(transformedData: any): string[] {
    const errors: string[] = [];
    
    if (!transformedData.connection_id) {
      errors.push('Missing connection_id');
    }
    
    if (!transformedData.webinar_id) {
      errors.push('Missing webinar_id');
    }
    
    if (!transformedData.topic) {
      errors.push('Missing topic');
    }
    
    // Validate type is one of the allowed values
    if (![5, 6, 9].includes(transformedData.type)) {
      errors.push(`Invalid webinar type: ${transformedData.type}`);
    }
    
    // Validate status
    const validStatuses = ['available', 'unavailable', 'deleted', 'started', 'ended', 'scheduled'];
    if (!validStatuses.includes(transformedData.status)) {
      errors.push(`Invalid status: ${transformedData.status}`);
    }
    
    return errors;
  }
  
  /**
   * Get field mapping report for debugging
   */
  static getFieldMappingReport(apiWebinar: any): {
    mapped: string[];
    unmapped: string[];
    enhanced: string[];
  } {
    const apiFields = Object.keys(apiWebinar);
    const settings = apiWebinar.settings || {};
    const settingsFields = Object.keys(settings).map(key => `settings.${key}`);
    
    const mapped = [
      'id', 'uuid', 'host_id', 'host_email', 'topic', 'agenda', 'type', 'status',
      'start_time', 'duration', 'timezone', 'join_url', 'registration_url',
      'password', 'settings', 'occurrences', 'recurrence', 'tracking_fields', 'panelists'
    ];
    
    const enhanced = [
      'start_url', 'encrypted_passcode', 'h323_password', 'h323_passcode', 'pstn_password',
      'created_at', 'creation_source', 'is_simulive', 'record_file_id', 'transition_to_live',
      'occurrence_id', 'alternative_hosts'
    ];
    
    const allMappedFields = [...mapped, ...enhanced];
    const unmapped = apiFields.filter(field => !allMappedFields.includes(field));
    
    return {
      mapped,
      unmapped,
      enhanced
    };
  }
}
