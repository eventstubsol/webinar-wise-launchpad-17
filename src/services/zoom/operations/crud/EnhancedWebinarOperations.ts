
import { supabase } from '@/integrations/supabase/client';
import { ZoomDataTransformers } from '../../utils/dataTransformers';
import { RegistrantOperations } from './RegistrantOperations';
import { ParticipantOperations } from './ParticipantOperations';

/**
 * Enhanced database operations for webinars with data preservation
 */
export class EnhancedWebinarOperations {
  /**
   * Fetch existing webinar to preserve calculated fields
   */
  static async getExistingWebinar(zoomWebinarId: string, connectionId: string): Promise<any> {
    const { data, error } = await supabase
      .from('zoom_webinars')
      .select('*')
      .eq('webinar_id', zoomWebinarId)
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
   * Merge new API data with existing database data
   */
  static mergeWebinarData(apiWebinar: any, existingWebinar: any | null, connectionId: string): any {
    // Start with transformed API data
    const newData = ZoomDataTransformers.transformWebinarForDatabase(apiWebinar, connectionId);
    
    if (!existingWebinar) {
      console.log(`New webinar detected: ${apiWebinar.id} - will be inserted`);
      return newData;
    }

    console.log(`Existing webinar found: ${apiWebinar.id} - will be updated, preserving calculated fields`);

    // Create the merged data object with preserved fields
    const mergedData = {
      ...newData,
      // Preserve critical calculated fields that should never be overwritten during sync
      total_registrants: existingWebinar.total_registrants,
      total_attendees: existingWebinar.total_attendees,
      total_minutes: existingWebinar.total_minutes,
      avg_attendance_duration: existingWebinar.avg_attendance_duration,
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

    // Log what's being preserved vs updated
    console.log(`Webinar ${apiWebinar.id} merge summary:`);
    console.log(`- Preserved calculated metrics: registrants=${existingWebinar.total_registrants}, attendees=${existingWebinar.total_attendees}`);
    console.log(`- Preserved participant sync status: ${existingWebinar.participant_sync_status}`);
    console.log(`- Merged JSONB fields: settings, tracking_fields, recurrence, occurrences`);
    console.log(`- Updated API fields: topic, start_time, duration, status, etc.`);

    return mergedData;
  }

  /**
   * Enhanced upsert with data preservation
   */
  static async upsertWebinar(webinarData: any, connectionId: string): Promise<string> {
    const startTime = Date.now();
    console.log(`🔄 Enhanced upsert for webinar ${webinarData.id || webinarData.webinar_id}`);

    try {
      // Step 1: Get existing webinar data
      const zoomWebinarId = (webinarData.id || webinarData.webinar_id)?.toString();
      const existingWebinar = await this.getExistingWebinar(zoomWebinarId, connectionId);
      
      // Step 2: Merge with existing data to preserve calculated fields
      const mergedWebinar = this.mergeWebinarData(webinarData, existingWebinar, connectionId);
      
      // Step 3: If existing webinar, preserve the database ID by adding it to the merged data
      if (existingWebinar) {
        mergedWebinar.id = existingWebinar.id;
      }

      // Step 4: Perform the upsert
      const { data, error } = await supabase
        .from('zoom_webinars')
        .upsert(
          mergedWebinar,
          {
            onConflict: 'connection_id,webinar_id',
            ignoreDuplicates: false
          }
        )
        .select('id')
        .single();

      if (error) {
        console.error('Enhanced webinar upsert failed:', error);
        throw new Error(`Failed to upsert webinar: ${error.message}`);
      }

      const duration = Date.now() - startTime;
      const operationType = existingWebinar ? 'UPDATE' : 'INSERT';
      
      console.log(`✅ Enhanced webinar ${operationType} completed:`);
      console.log(`- Webinar ID: ${zoomWebinarId}`);
      console.log(`- Database ID: ${data.id}`);
      console.log(`- Duration: ${duration}ms`);
      console.log(`- Data preserved: ${existingWebinar ? 'YES' : 'N/A (new record)'}`);

      return data.id;
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`❌ Enhanced webinar upsert failed after ${duration}ms:`, error);
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
      throw error;
    }
  }

  /**
   * Get webinar by Zoom ID and connection
   */
  static async getWebinarByZoomId(zoomWebinarId: string, connectionId: string): Promise<any> {
    return this.getExistingWebinar(zoomWebinarId, connectionId);
  }
}
