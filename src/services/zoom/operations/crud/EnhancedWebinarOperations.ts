
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
   * Enhanced upsert with data preservation
   */
  static async upsertWebinar(webinarData: any, connectionId: string): Promise<string> {
    const startTime = Date.now();
    console.log(`🔄 Enhanced upsert for webinar ${webinarData.id || webinarData.webinar_id}`);

    try {
      // Step 1: Get existing webinar data
      const zoomWebinarId = (webinarData.id || webinarData.webinar_id)?.toString();
      const existingWebinar = await this.getExistingWebinar(zoomWebinarId, connectionId);
      
      // Step 2: Transform new data
      const transformedWebinar = ZoomDataTransformers.transformWebinarForDatabase(webinarData, connectionId);
      
      // Step 3: Merge with existing data to preserve calculated fields
      let finalWebinar = transformedWebinar;
      
      if (existingWebinar) {
        console.log(`Existing webinar found - preserving calculated fields and merging JSONB data`);
        
        // Preserve critical calculated fields
        finalWebinar = {
          ...transformedWebinar,
          id: existingWebinar.id, // Preserve database ID
          total_registrants: existingWebinar.total_registrants,
          total_attendees: existingWebinar.total_attendees,
          total_minutes: existingWebinar.total_minutes,
          avg_attendance_duration: existingWebinar.avg_attendance_duration,
          participant_sync_status: existingWebinar.participant_sync_status,
          participant_sync_attempted_at: existingWebinar.participant_sync_attempted_at,
          participant_sync_error: existingWebinar.participant_sync_error,
          created_at: existingWebinar.created_at,
          
          // Merge JSONB fields
          settings: this.mergeJSONBField(existingWebinar.settings, transformedWebinar.settings),
          tracking_fields: this.mergeJSONBField(existingWebinar.tracking_fields, transformedWebinar.tracking_fields),
          recurrence: this.mergeJSONBField(existingWebinar.recurrence, transformedWebinar.recurrence),
          occurrences: this.mergeJSONBField(existingWebinar.occurrences, transformedWebinar.occurrences),
        };
      }

      // Step 4: Perform the upsert
      const { data, error } = await supabase
        .from('zoom_webinars')
        .upsert(
          finalWebinar,
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
