
import { supabase } from '@/integrations/supabase/client';
import { MetricsOperations } from '../operations/crud/MetricsOperations';

/**
 * Service for updating webinar metrics comprehensively
 */
export class WebinarMetricsUpdateService {
  /**
   * Update metrics for a single webinar after sync
   */
  static async updateWebinarMetrics(webinarDbId: string): Promise<void> {
    try {
      console.log(`Updating metrics for webinar: ${webinarDbId}`);
      
      // Get participant metrics
      const { data: participants, error: participantsError } = await supabase
        .from('zoom_participants')
        .select('duration, join_time')
        .eq('webinar_id', webinarDbId);

      if (participantsError) {
        console.error('Failed to fetch participants for metrics:', participantsError);
        return;
      }

      // Get registrant count
      const { count: registrantCount, error: registrantsError } = await supabase
        .from('zoom_registrants')
        .select('*', { count: 'exact', head: true })
        .eq('webinar_id', webinarDbId);

      if (registrantsError) {
        console.error('Failed to fetch registrants count:', registrantsError);
        return;
      }

      // Calculate metrics
      const totalAttendees = participants?.length || 0;
      const totalRegistrants = registrantCount || 0;
      const totalMinutes = participants?.reduce((sum, p) => sum + (p.duration || 0), 0) || 0;
      const avgDuration = totalAttendees > 0 ? Math.round(totalMinutes / totalAttendees) : 0;
      const totalAbsentees = Math.max(0, totalRegistrants - totalAttendees);

      // Update webinar with calculated metrics
      const { error: updateError } = await supabase
        .from('zoom_webinars')
        .update({
          total_registrants: totalRegistrants,
          total_attendees: totalAttendees,
          total_absentees: totalAbsentees,
          total_minutes: totalMinutes,
          avg_attendance_duration: avgDuration,
          attendees_count: totalAttendees,
          registrants_count: totalRegistrants,
          updated_at: new Date().toISOString()
        })
        .eq('id', webinarDbId);

      if (updateError) {
        console.error('Failed to update webinar metrics:', updateError);
        throw updateError;
      }

      console.log(`Successfully updated metrics for webinar ${webinarDbId}: ${totalAttendees} attendees, ${totalRegistrants} registrants`);
    } catch (error) {
      console.error('Error updating webinar metrics:', error);
      throw error;
    }
  }

  /**
   * Batch update metrics for all webinars with missing or zero metrics
   */
  static async batchUpdateMissingMetrics(connectionId?: string): Promise<number> {
    try {
      console.log('Starting batch metrics update for webinars with missing data...');

      // Find webinars with zero or null attendee counts
      let query = supabase
        .from('zoom_webinars')
        .select('id')
        .or('total_attendees.is.null,total_attendees.eq.0');

      if (connectionId) {
        query = query.eq('connection_id', connectionId);
      }

      const { data: webinars, error } = await query;

      if (error) {
        console.error('Failed to fetch webinars for batch update:', error);
        throw error;
      }

      if (!webinars || webinars.length === 0) {
        console.log('No webinars found needing metrics updates');
        return 0;
      }

      console.log(`Found ${webinars.length} webinars needing metrics updates`);

      // Update metrics for each webinar
      let updatedCount = 0;
      for (const webinar of webinars) {
        try {
          await this.updateWebinarMetrics(webinar.id);
          updatedCount++;
        } catch (error) {
          console.error(`Failed to update metrics for webinar ${webinar.id}:`, error);
          // Continue with next webinar
        }
      }

      console.log(`Batch update completed: ${updatedCount}/${webinars.length} webinars updated`);
      return updatedCount;
    } catch (error) {
      console.error('Error in batch metrics update:', error);
      throw error;
    }
  }

  /**
   * Update metrics for all webinars in a connection
   */
  static async updateConnectionMetrics(connectionId: string): Promise<void> {
    try {
      console.log(`Updating all metrics for connection: ${connectionId}`);
      await this.batchUpdateMissingMetrics(connectionId);
    } catch (error) {
      console.error('Error updating connection metrics:', error);
      throw error;
    }
  }
}
