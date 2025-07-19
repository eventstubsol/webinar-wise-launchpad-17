
import { supabase } from '@/integrations/supabase/client';
import { WebinarEngagementSummary } from './types';

/**
 * Database operations for analytics
 */
export class DatabaseOperations {
  /**
   * Update webinar metrics in database
   */
  static async updateWebinarMetrics(webinarId: string, summary: WebinarEngagementSummary) {
    try {
      await supabase
        .from('zoom_webinars')
        .update({
          total_attendees: summary.totalParticipants,
          avg_attendance_duration: summary.averageAttendanceDuration,
          updated_at: new Date().toISOString()
        })
        .eq('id', webinarId);
    } catch (error) {
      console.error('Error updating webinar metrics:', error);
    }
  }

  /**
   * Flag highly engaged participants
   */
  static async flagHighlyEngagedParticipants(connectionId: string, threshold: number = 70) {
    try {
      // This could be implemented to flag participants in a separate table
      // or add metadata to existing participant records
      console.log(`Flagging highly engaged participants with threshold ${threshold} for connection ${connectionId}`);
    } catch (error) {
      console.error('Error flagging highly engaged participants:', error);
    }
  }
}
