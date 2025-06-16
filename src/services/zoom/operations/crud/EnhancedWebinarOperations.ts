
import { supabase } from '@/integrations/supabase/client';
import { ZoomDataTransformers } from '../../utils/dataTransformers';
import { RegistrantOperations } from './RegistrantOperations';
import { ParticipantOperations } from './ParticipantOperations';

/**
 * Enhanced database operations for webinars with complete data pipeline
 */
export class EnhancedWebinarOperations {
  /**
   * Upsert webinar with enhanced field mapping
   */
  static async upsertWebinar(webinarData: any, connectionId: string): Promise<string> {
    const transformedWebinar = ZoomDataTransformers.transformWebinarForDatabase(webinarData, connectionId);
    
    // Enhanced field mapping to fix missing data
    const enhancedWebinar = {
      ...transformedWebinar,
      // Fix missing basic fields
      status: webinarData.status || 'available',
      join_url: webinarData.join_url || null,
      registration_url: webinarData.registration_url || null,
      password: webinarData.password || null,
      h323_password: webinarData.h323_password || webinarData.h323_passcode || null,
      pstn_password: webinarData.pstn_password || null,
      encrypted_password: webinarData.encrypted_password || webinarData.encrypted_passcode || null,
      settings: webinarData.settings || null,
      tracking_fields: webinarData.tracking_fields || null,
      recurrence: webinarData.recurrence || null,
      occurrences: webinarData.occurrences || null,
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
      throw new Error(`Failed to upsert webinar: ${error.message}`);
    }

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
