
import { supabase } from '@/integrations/supabase/client';
import { ZoomDataTransformers } from '../../utils/dataTransformers';
import { RegistrantOperations } from './RegistrantOperations';
import { ParticipantOperations } from './ParticipantOperations';

/**
 * Enhanced database operations for webinars with complete data pipeline
 */
export class EnhancedWebinarOperations {
  /**
   * Upsert webinar with comprehensive field mapping including new schema fields
   */
  static async upsertWebinar(webinarData: any, connectionId: string): Promise<string> {
    const transformedWebinar = ZoomDataTransformers.transformWebinarForDatabase(webinarData, connectionId);
    
    // Enhanced field mapping to capture all available Zoom API data
    const enhancedWebinar = {
      ...transformedWebinar,
      // Ensure status is properly mapped from API
      status: webinarData.status || 'available',
      
      // Map settings fields that were previously missing
      approval_type: webinarData.settings?.approval_type || null,
      registration_type: webinarData.settings?.registration_type || null,
      
      // New fields from schema update
      start_url: webinarData.start_url || null,
      encrypted_passcode: webinarData.encrypted_passcode || webinarData.encrypted_password || null,
      creation_source: webinarData.creation_source || null,
      is_simulive: webinarData.is_simulive || false,
      record_file_id: webinarData.record_file_id || null,
      transition_to_live: webinarData.transition_to_live || false,
      webinar_created_at: webinarData.created_at || null,
      
      // Enhanced password field mapping
      password: webinarData.password || null,
      h323_password: webinarData.h323_password || webinarData.h323_passcode || null,
      pstn_password: webinarData.pstn_password || null,
      encrypted_password: webinarData.encrypted_password || webinarData.encrypted_passcode || null,
      
      // Comprehensive settings and metadata
      settings: webinarData.settings ? JSON.stringify(webinarData.settings) : null,
      tracking_fields: webinarData.tracking_fields ? JSON.stringify(webinarData.tracking_fields) : null,
      recurrence: webinarData.recurrence ? JSON.stringify(webinarData.recurrence) : null,
      occurrences: webinarData.occurrences ? JSON.stringify(webinarData.occurrences) : null,
      
      updated_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('zoom_webinars')
      .upsert(
        enhancedWebinar,
        {
          onConflict: 'connection_id,webinar_id',
          ignoreDuplicates: false
        }
      )
      .select('id')
      .single();

    if (error) {
      console.error('Failed to upsert enhanced webinar:', error);
      throw new Error(`Failed to upsert webinar: ${error.message}`);
    }

    console.log(`Enhanced webinar upserted with comprehensive data mapping: ${data.id}`);
    return data.id;
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

      console.log(`Updated metrics for webinar ${webinarDbId}: ${registrantCount} registrants, ${participantMetrics.totalAttendees} attendees`);
    } catch (error) {
      console.error('Error updating webinar metrics:', error);
      throw error;
    }
  }

  /**
   * Get webinar by Zoom ID and connection
   */
  static async getWebinarByZoomId(zoomWebinarId: string, connectionId: string): Promise<any> {
    const { data, error } = await supabase
      .from('zoom_webinars')
      .select('id, webinar_id, updated_at')
      .eq('webinar_id', zoomWebinarId)
      .eq('connection_id', connectionId)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 is "not found"
      throw new Error(`Failed to fetch webinar: ${error.message}`);
    }

    return data;
  }
}
