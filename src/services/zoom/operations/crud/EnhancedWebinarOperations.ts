import { supabase } from '@/integrations/supabase/client';
import { ZoomDataTransformers } from '../../utils/dataTransformers';
import { WebinarTransformers } from '../../utils/transformers/webinarTransformers';
import { WebinarStatusDetector } from '../../utils/WebinarStatusDetector';
import { RegistrantOperations } from './RegistrantOperations';
import { ParticipantOperations } from './ParticipantOperations';

/**
 * Enhanced database operations for webinars with complete data pipeline
 */
export class EnhancedWebinarOperations {
  /**
   * Upsert webinar with comprehensive field mapping including enhanced status detection
   */
  static async upsertWebinar(webinarData: any, connectionId: string): Promise<string> {
    const transformedWebinar = WebinarTransformers.transformWebinarForDatabase(webinarData, connectionId);
    
    console.log(`Upserting webinar ${webinarData.id} with status: ${transformedWebinar.status}`);
    
    const { data, error } = await supabase
      .from('zoom_webinars')
      .upsert(
        {
          ...transformedWebinar,
          updated_at: new Date().toISOString()
        },
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

    console.log(`Enhanced webinar upserted with smart status detection: ${data.id}`);
    return data.id;
  }

  /**
   * Update webinar status based on current timing if needed
   */
  static async updateWebinarStatusIfNeeded(webinarDbId: string, webinarData: any): Promise<void> {
    try {
      // Check if status needs update based on timing
      const needsUpdate = WebinarStatusDetector.needsStatusUpdate(
        {
          id: webinarData.id?.toString(),
          start_time: webinarData.start_time,
          duration: webinarData.duration,
          status: webinarData.status
        },
        webinarData.current_status
      );

      if (needsUpdate) {
        const newStatus = WebinarStatusDetector.calculateSmartStatus({
          id: webinarData.id?.toString(),
          start_time: webinarData.start_time,
          duration: webinarData.duration,
          status: webinarData.status
        });

        const { error } = await supabase
          .from('zoom_webinars')
          .update({
            status: newStatus,
            updated_at: new Date().toISOString()
          })
          .eq('id', webinarDbId);

        if (error) {
          console.error('Failed to update webinar status:', error);
        } else {
          console.log(`Updated webinar ${webinarDbId} status to: ${newStatus}`);
        }
      }
    } catch (error) {
      console.error('Error updating webinar status:', error);
    }
  }

  /**
   * Update webinar metrics after all related data is synced
   */
  static async updateWebinarMetrics(webinarDbId: string): Promise<void> {
    try {
      const registrantCount = await RegistrantOperations.getRegistrantCount(webinarDbId);
      const participantMetrics = await ParticipantOperations.getParticipantMetrics(webinarDbId);

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

    if (error && error.code !== 'PGRST116') {
      throw new Error(`Failed to fetch webinar: ${error.message}`);
    }

    return data;
  }
}
