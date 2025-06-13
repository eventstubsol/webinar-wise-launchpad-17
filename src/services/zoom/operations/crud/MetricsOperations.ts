
import { supabase } from '@/integrations/supabase/client';
import { ZoomDataTransformers } from '../../utils/dataTransformers';

/**
 * Database operations for metrics calculations
 */
export class MetricsOperations {
  /**
   * Update webinar metrics after syncing all data
   */
  static async updateWebinarMetrics(webinarDbId: string): Promise<void> {
    // Calculate metrics from participants
    const { data: participants, error: participantsError } = await supabase
      .from('zoom_participants')
      .select('duration')
      .eq('webinar_id', webinarDbId);

    if (participantsError) {
      console.error('Failed to fetch participants for metrics:', participantsError);
      return;
    }

    // Calculate metrics from registrants
    const { data: registrants, error: registrantsError } = await supabase
      .from('zoom_registrants')
      .select('id')
      .eq('webinar_id', webinarDbId);

    if (registrantsError) {
      console.error('Failed to fetch registrants for metrics:', registrantsError);
      return;
    }

    const metrics = ZoomDataTransformers.calculateWebinarMetrics(participants || []);

    // Update webinar with calculated metrics
    const { error: updateError } = await supabase
      .from('zoom_webinars')
      .update({
        total_registrants: registrants?.length || 0,
        total_attendees: metrics.total_attendees,
        total_minutes: metrics.total_minutes,
        avg_attendance_duration: metrics.avg_attendance_duration,
        updated_at: new Date().toISOString()
      })
      .eq('id', webinarDbId);

    if (updateError) {
      console.error('Failed to update webinar metrics:', updateError);
    }
  }
}
