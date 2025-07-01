import { supabase } from '@/integrations/supabase/client';
import { ZoomDataTransformers } from '../../utils/dataTransformers';
import { RegistrantOperations } from './RegistrantOperations';
import { ParticipantOperations } from './ParticipantOperations';

/**
 * Enhanced database operations for webinars with comprehensive error handling
 */
export class EnhancedWebinarOperations {
  /**
   * Fetch existing webinar to preserve calculated fields
   */
  static async getExistingWebinar(zoomWebinarId: string, connectionId: string): Promise<any> {
    const { data, error } = await supabase
      .from('zoom_webinars')
      .select('*')
      .eq('zoom_webinar_id', zoomWebinarId)
      .eq('connection_id', connectionId)
      .maybeSingle();

    if (error && error.code !== 'PGRST116') { // PGRST116 is "not found"
      throw new Error(`Failed to fetch existing webinar: ${error.message}`);
    }

    return data;
  }

  /**
   * Merge JSONB fields intelligently
   */
  static mergeJSONBField(existingValue: any, newValue: any): any {
    if (newValue == null) {
      return existingValue;
    }
    
    if (existingValue == null) {
      return newValue;
    }
    
    if (typeof existingValue === 'object' && typeof newValue === 'object' && 
        !Array.isArray(existingValue) && !Array.isArray(newValue)) {
      return { ...existingValue, ...newValue };
    }
    
    return newValue;
  }

  /**
   * Validate and sanitize webinar data before database insertion
   */
  static validateWebinarData(data: any): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    // Required fields validation
    const requiredFields = [
      'connection_id',
      'zoom_webinar_id',
      'topic',
      'host_id',
      'host_email',
      'status',
      'start_time',
      'duration',
      'timezone',
      'join_url'
    ];
    
    requiredFields.forEach(field => {
      if (!data[field]) {
        errors.push(`Missing required field: ${field}`);
      }
    });
    
    // Validate data types
    if (data.duration && typeof data.duration !== 'number') {
      errors.push(`Invalid duration type: expected number, got ${typeof data.duration}`);
    }
    
    if (data.start_time && isNaN(Date.parse(data.start_time))) {
      errors.push(`Invalid start_time format: ${data.start_time}`);
    }
    
    // Validate status enum
    const validStatuses = ['waiting', 'started', 'ended', 'scheduled', 'upcoming', 'finished'];
    if (data.status && !validStatuses.includes(data.status)) {
      errors.push(`Invalid status: ${data.status}. Must be one of: ${validStatuses.join(', ')}`);
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Sanitize data to ensure database compatibility
   */
  static sanitizeWebinarData(data: any): any {
    const sanitized = { ...data };
    
    // Ensure all string fields are actually strings
    const stringFields = ['zoom_webinar_id', 'topic', 'host_id', 'host_email', 'timezone', 'join_url'];
    stringFields.forEach(field => {
      if (sanitized[field] !== null && sanitized[field] !== undefined) {
        sanitized[field] = String(sanitized[field]);
      }
    });
    
    // Ensure numeric fields are numbers
    if (sanitized.duration !== null && sanitized.duration !== undefined) {
      sanitized.duration = parseInt(sanitized.duration, 10) || 60;
    }
    
    // Ensure boolean fields are booleans
    const booleanFields = ['is_simulive', 'registration_required', 'on_demand'];
    booleanFields.forEach(field => {
      if (sanitized[field] !== null && sanitized[field] !== undefined) {
        sanitized[field] = Boolean(sanitized[field]);
      }
    });
    
    // Ensure timestamp fields are valid ISO strings
    const timestampFields = ['start_time', 'created_at', 'updated_at', 'synced_at', 'webinar_created_at'];
    timestampFields.forEach(field => {
      if (sanitized[field]) {
        try {
          sanitized[field] = new Date(sanitized[field]).toISOString();
        } catch (e) {
          console.warn(`Invalid timestamp for ${field}: ${sanitized[field]}`);
          if (field === 'start_time') {
            sanitized[field] = new Date().toISOString(); // Default to now if invalid
          } else {
            sanitized[field] = null;
          }
        }
      }
    });
    
    // Ensure JSONB fields are valid JSON
    const jsonbFields = ['settings', 'recurrence', 'occurrences', 'tracking_fields'];
    jsonbFields.forEach(field => {
      if (sanitized[field] !== null && sanitized[field] !== undefined) {
        try {
          // If it's a string, try to parse it
          if (typeof sanitized[field] === 'string') {
            sanitized[field] = JSON.parse(sanitized[field]);
          }
        } catch (e) {
          console.warn(`Invalid JSON for ${field}, setting to empty object`);
          sanitized[field] = {};
        }
      }
    });
    
    return sanitized;
  }

  /**
   * Merge new API data with existing database data
   */
  static mergeWebinarData(apiWebinar: any, existingWebinar: any | null, connectionId: string): any {
    // Start with transformed API data
    let newData;
    try {
      newData = ZoomDataTransformers.transformWebinarForDatabase(apiWebinar, connectionId);
    } catch (transformError) {
      console.error('Error transforming webinar data:', transformError);
      // Fallback to basic transformation
      newData = this.basicTransformWebinar(apiWebinar, connectionId);
    }
    
    // Sanitize the data
    newData = this.sanitizeWebinarData(newData);
    
    if (!existingWebinar) {
      console.log(`New webinar detected: ${apiWebinar.id} - will be inserted`);
      return newData;
    }

    console.log(`Existing webinar found: ${apiWebinar.id} - will be updated, preserving calculated fields`);

    // Create the merged data object with preserved fields
    const mergedData = {
      ...newData,
      // Preserve critical calculated fields that should never be overwritten during sync
      total_registrants: existingWebinar.total_registrants || 0,
      total_attendees: existingWebinar.total_attendees || 0,
      total_minutes: existingWebinar.total_minutes || 0,
      avg_attendance_duration: existingWebinar.avg_attendance_duration || 0,
      participant_sync_status: existingWebinar.participant_sync_status,
      participant_sync_attempted_at: existingWebinar.participant_sync_attempted_at,
      participant_sync_error: existingWebinar.participant_sync_error,
      created_at: existingWebinar.created_at, // Preserve original creation time
      
      // Merge JSONB fields instead of replacing them
      settings: this.mergeJSONBField(existingWebinar.settings, newData.settings),
      tracking_fields: this.mergeJSONBField(existingWebinar.tracking_fields, newData.tracking_fields),
      recurrence: this.mergeJSONBField(existingWebinar.recurrence, newData.recurrence),
      occurrences: this.mergeJSONBField(existingWebinar.occurrences, newData.occurrences),
    };

    return mergedData;
  }

  /**
   * Basic transformation when the main transformer fails
   */
  static basicTransformWebinar(apiWebinar: any, connectionId: string): any {
    return {
      connection_id: connectionId,
      zoom_webinar_id: String(apiWebinar.id || apiWebinar.webinar_id || ''),
      uuid: apiWebinar.uuid || null,
      topic: apiWebinar.topic || 'Untitled Webinar',
      agenda: apiWebinar.agenda || null,
      type: apiWebinar.type || 5,
      status: this.mapWebinarStatus(apiWebinar.status),
      start_time: apiWebinar.start_time || new Date().toISOString(),
      duration: parseInt(apiWebinar.duration || '60', 10),
      timezone: apiWebinar.timezone || 'UTC',
      host_id: String(apiWebinar.host_id || ''),
      host_email: String(apiWebinar.host_email || ''),
      join_url: apiWebinar.join_url || '',
      registration_url: apiWebinar.registration_url || null,
      password: apiWebinar.password || null,
      settings: apiWebinar.settings || {},
      recurrence: apiWebinar.recurrence || null,
      occurrences: apiWebinar.occurrences || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      synced_at: new Date().toISOString()
    };
  }

  /**
   * Map Zoom status to our enum
   */
  static mapWebinarStatus(status: string): string {
    const statusMap: Record<string, string> = {
      'waiting': 'waiting',
      'started': 'started',
      'ended': 'ended',
      'scheduled': 'scheduled',
      'upcoming': 'upcoming',
      'finished': 'finished'
    };
    
    return statusMap[status] || 'scheduled';
  }

  /**
   * Enhanced upsert with comprehensive error handling and data validation
   */
  static async upsertWebinar(webinarData: any, connectionId: string): Promise<string> {
    const startTime = Date.now();
    const zoomWebinarId = (webinarData.id || webinarData.webinar_id)?.toString();
    
    console.log(`🔄 Enhanced upsert for webinar ${zoomWebinarId}`);

    try {
      // Step 1: Get existing webinar data
      const existingWebinar = await this.getExistingWebinar(zoomWebinarId, connectionId);
      
      // Step 2: Merge with existing data to preserve calculated fields
      const mergedWebinar = this.mergeWebinarData(webinarData, existingWebinar, connectionId);
      
      // Step 3: Validate the data
      const validation = this.validateWebinarData(mergedWebinar);
      if (!validation.isValid) {
        console.error('❌ Webinar data validation failed:', validation.errors);
        throw new Error(`Data validation failed: ${validation.errors.join(', ')}`);
      }
      
      // Step 4: If existing webinar, preserve the database ID
      if (existingWebinar) {
        mergedWebinar.id = existingWebinar.id;
      } else {
        // For new webinars, ensure we don't have an undefined ID
        delete mergedWebinar.id;
      }

      // Step 5: Perform the upsert with detailed error handling
      const { data, error } = await supabase
        .from('zoom_webinars')
        .upsert(
          mergedWebinar,
          {
            onConflict: 'connection_id,zoom_webinar_id',
            ignoreDuplicates: false
          }
        )
        .select('id')
        .single();

      if (error) {
        console.error('❌ Enhanced webinar upsert failed:', {
          error: error,
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint,
          webinarId: zoomWebinarId,
          topic: mergedWebinar.topic
        });
        
        // Log the data that failed to help debug
        console.error('Failed data sample:', {
          zoom_webinar_id: mergedWebinar.zoom_webinar_id,
          connection_id: mergedWebinar.connection_id,
          topic: mergedWebinar.topic,
          status: mergedWebinar.status,
          start_time: mergedWebinar.start_time
        });
        
        throw new Error(`Failed to upsert webinar ${zoomWebinarId}: ${error.message}`);
      }

      const duration = Date.now() - startTime;
      const operationType = existingWebinar ? 'UPDATE' : 'INSERT';
      
      console.log(`✅ Enhanced webinar ${operationType} completed:`);
      console.log(`- Webinar ID: ${zoomWebinarId}`);
      console.log(`- Database ID: ${data.id}`);
      console.log(`- Topic: ${mergedWebinar.topic}`);
      console.log(`- Duration: ${duration}ms`);

      return data.id;
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`❌ Enhanced webinar upsert failed after ${duration}ms:`, error);
      
      // Re-throw with more context
      if (error instanceof Error) {
        throw new Error(`Webinar ${zoomWebinarId} sync failed: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Update webinar metrics after all related data is synced
   */
  static async updateWebinarMetrics(webinarDbId: string): Promise<void> {
    try {
      // Get registrant count
      const registrantCount = await RegistrantOperations.getRegistrantCount(webinarDbId);
      
      // Get participant metrics
      const participantMetrics = await ParticipantOperations.getParticipantMetrics(webinarDbId);

      // Update webinar with calculated metrics
      const { error: updateError } = await supabase
        .from('zoom_webinars')
        .update({
          total_registrants: registrantCount,
          total_attendees: participantMetrics.totalAttendees,
          total_minutes: participantMetrics.totalMinutes,
          avg_attendance_duration: participantMetrics.avgDuration,
          updated_at: new Date().toISOString()
        })
        .eq('id', webinarDbId);

      if (updateError) {
        console.error('Failed to update webinar metrics:', updateError);
        throw updateError;
      }

      console.log(`✅ Updated metrics for webinar ${webinarDbId}: ${registrantCount} registrants, ${participantMetrics.totalAttendees} attendees`);
    } catch (error) {
      console.error('Error updating webinar metrics:', error);
      // Don't throw here - metrics update failure shouldn't fail the whole sync
    }
  }

  /**
   * Get webinar by Zoom ID and connection
   */
  static async getWebinarByZoomId(zoomWebinarId: string, connectionId: string): Promise<any> {
    return this.getExistingWebinar(zoomWebinarId, connectionId);
  }
}
