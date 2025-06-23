
import { supabase } from '@/integrations/supabase/client';
import { MetricsTransformers } from '../../utils/transformers/metricsTransformers';

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
      .select('duration, join_time')
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

    const metrics = MetricsTransformers.calculateWebinarMetrics(participants || []);

    // FIXED: Update webinar with calculated metrics using correct field names
    const { error: updateError } = await supabase
      .from('zoom_webinars')
      .update({
        total_registrants: registrants?.length || 0,
        total_attendees: metrics.total_attendees, // FIXED: Use correct field name
        total_minutes: metrics.total_minutes, // FIXED: Use correct field name
        avg_attendance_duration: metrics.avg_attendance_duration, // FIXED: Use correct field name
        attendees_count: metrics.total_attendees,
        registrants_count: registrants?.length || 0,
        updated_at: new Date().toISOString()
      })
      .eq('id', webinarDbId);

    if (updateError) {
      console.error('Failed to update webinar metrics:', updateError);
    }
  }
}
