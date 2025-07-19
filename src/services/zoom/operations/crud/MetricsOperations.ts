
import { supabase } from '@/integrations/supabase/client';

/**
 * Database operations for metrics calculations
 * ENHANCED: Now uses only primary columns to avoid duplicate column issues
 */
export class MetricsOperations {
  /**
   * Update webinar metrics after syncing all data
   * FIXED: Uses only primary columns, not duplicate ones
   */
  static async updateWebinarMetrics(webinarDbId: string): Promise<void> {
    try {
      console.log(`📊 Updating metrics for webinar: ${webinarDbId}`);
      
      // Calculate metrics from participants
      const { data: participants, error: participantsError } = await supabase
        .from('zoom_participants')
        .select('duration, join_time')
        .eq('webinar_id', webinarDbId);

      if (participantsError) {
        console.error('Failed to fetch participants for metrics:', participantsError);
        return;
      }

      console.log(`📊 Found ${participants?.length || 0} participants for metrics`);

      // Calculate metrics from registrants
      const { count: registrantCount, error: registrantsError } = await supabase
        .from('zoom_registrants')
        .select('*', { count: 'exact', head: true })
        .eq('webinar_id', webinarDbId);

      if (registrantsError) {
        console.error('Failed to fetch registrants for metrics:', registrantsError);
        return;
      }

      console.log(`📊 Found ${registrantCount || 0} registrants for metrics`);

      // Calculate comprehensive metrics
      const totalAttendees = participants?.length || 0;
      const totalRegistrants = registrantCount || 0;
      const totalMinutes = participants?.reduce((sum, p) => sum + (p.duration || 0), 0) || 0;
      const avgDuration = totalAttendees > 0 ? Math.round(totalMinutes / totalAttendees) : 0;
      const totalAbsentees = Math.max(0, totalRegistrants - totalAttendees);

      console.log(`📊 Calculated metrics:`, {
        totalAttendees,
        totalRegistrants,
        totalMinutes,
        avgDuration,
        totalAbsentees
      });

      // Update webinar with calculated metrics - ONLY use primary columns
      const { error: updateError } = await supabase
        .from('zoom_webinars')
        .update({
          total_registrants: totalRegistrants,
          total_attendees: totalAttendees,
          total_absentees: totalAbsentees,
          total_minutes: totalMinutes,
          avg_attendance_duration: avgDuration,
          // Remove duplicate columns - don't use attendees_count, registrants_count
          updated_at: new Date().toISOString()
        })
        .eq('id', webinarDbId);

      if (updateError) {
        console.error('Failed to update webinar metrics:', updateError);
        throw updateError;
      }

      console.log(`✅ Successfully updated metrics for webinar ${webinarDbId}: ${totalAttendees} attendees, ${totalRegistrants} registrants`);
    } catch (error) {
      console.error('Error updating webinar metrics:', error);
      throw error;
    }
  }

  /**
   * Batch update metrics for all webinars with missing data
   * ENHANCED: Better logging and error handling
   */
  static async batchUpdateMissingMetrics(connectionId?: string): Promise<number> {
    try {
      console.log('🔧 Starting batch metrics update for webinars with missing data...');

      // Find webinars with zero or null attendee counts
      let query = supabase
        .from('zoom_webinars')
        .select('id, zoom_webinar_id, topic')
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
      const errors: string[] = [];

      for (const webinar of webinars) {
        try {
          console.log(`🔧 Updating metrics for webinar: ${webinar.zoom_webinar_id} (${webinar.topic})`);
          await this.updateWebinarMetrics(webinar.id);
          updatedCount++;
          console.log(`✅ Updated metrics for webinar: ${webinar.zoom_webinar_id}`);
        } catch (error) {
          const errorMsg = `Failed to update metrics for webinar ${webinar.zoom_webinar_id}: ${error.message}`;
          console.error(`❌ ${errorMsg}`);
          errors.push(errorMsg);
        }
      }

      console.log(`🎉 Batch update completed: ${updatedCount}/${webinars.length} webinars updated`);
      
      if (errors.length > 0) {
        console.log(`❌ Errors encountered:`, errors);
      }

      return updatedCount;
    } catch (error) {
      console.error('Error in batch metrics update:', error);
      throw error;
    }
  }
}
