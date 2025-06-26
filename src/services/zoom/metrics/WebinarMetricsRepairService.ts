
import { supabase } from '@/integrations/supabase/client';

/**
 * Service for repairing and updating webinar metrics
 */
export class WebinarMetricsRepairService {
  /**
   * Fix metrics for a single webinar
   */
  static async repairWebinarMetrics(webinarDbId: string): Promise<void> {
    try {
      console.log(`🔧 Repairing metrics for webinar: ${webinarDbId}`);
      
      // Get participant metrics
      const { data: participants, error: participantsError } = await supabase
        .from('zoom_participants')
        .select('duration, join_time, participant_id')
        .eq('webinar_id', webinarDbId);

      if (participantsError) {
        console.error('Failed to fetch participants for metrics repair:', participantsError);
        throw participantsError;
      }

      // Get registrant count
      const { count: registrantCount, error: registrantsError } = await supabase
        .from('zoom_registrants')
        .select('*', { count: 'exact', head: true })
        .eq('webinar_id', webinarDbId);

      if (registrantsError) {
        console.error('Failed to fetch registrants for metrics repair:', registrantsError);
        throw registrantsError;
      }

      // Calculate comprehensive metrics
      const totalAttendees = participants?.length || 0;
      const totalRegistrants = registrantCount || 0;
      const totalMinutes = participants?.reduce((sum, p) => sum + (p.duration || 0), 0) || 0;
      const avgDuration = totalAttendees > 0 ? Math.round(totalMinutes / totalAttendees) : 0;
      const totalAbsentees = Math.max(0, totalRegistrants - totalAttendees);

      console.log(`🔧 Calculated metrics for ${webinarDbId}:`, {
        totalAttendees,
        totalRegistrants,
        totalMinutes,
        avgDuration,
        totalAbsentees
      });

      // Update webinar with calculated metrics and fix sync status
      const updates: any = {
        total_registrants: totalRegistrants,
        total_attendees: totalAttendees,
        total_absentees: totalAbsentees,
        total_minutes: totalMinutes,
        avg_attendance_duration: avgDuration,
        updated_at: new Date().toISOString()
      };

      // Fix participant sync status if there are participants
      if (totalAttendees > 0) {
        updates.participant_sync_status = 'completed';
        updates.participant_sync_completed_at = new Date().toISOString();
        updates.participant_sync_error = null;
      } else if (totalRegistrants > 0 && totalAttendees === 0) {
        updates.participant_sync_status = 'no_participants';
        updates.participant_sync_error = 'No participants found for this webinar';
      }

      const { error: updateError } = await supabase
        .from('zoom_webinars')
        .update(updates)
        .eq('id', webinarDbId);

      if (updateError) {
        console.error('Failed to update webinar metrics:', updateError);
        throw updateError;
      }

      console.log(`✅ Successfully repaired metrics for webinar ${webinarDbId}`);
    } catch (error) {
      console.error('Error repairing webinar metrics:', error);
      throw error;
    }
  }

  /**
   * Batch repair all webinars with missing or incorrect metrics
   */
  static async batchRepairMetrics(connectionId?: string): Promise<{
    totalProcessed: number;
    successCount: number;
    errorCount: number;
    errors: string[];
  }> {
    try {
      console.log('🔧 Starting batch metrics repair...');

      // Find webinars that need metrics repair
      let query = supabase
        .from('zoom_webinars')
        .select('id, zoom_webinar_id, topic, total_attendees, participant_sync_status')
        .or('total_attendees.is.null,total_attendees.eq.0,participant_sync_status.eq.pending,participant_sync_status.eq.failed');

      if (connectionId) {
        query = query.eq('connection_id', connectionId);
      }

      const { data: webinars, error } = await query;

      if (error) {
        console.error('Failed to fetch webinars for batch repair:', error);
        throw error;
      }

      if (!webinars || webinars.length === 0) {
        console.log('No webinars found needing metrics repair');
        return { totalProcessed: 0, successCount: 0, errorCount: 0, errors: [] };
      }

      console.log(`Found ${webinars.length} webinars needing metrics repair`);

      let successCount = 0;
      let errorCount = 0;
      const errors: string[] = [];

      // Process each webinar
      for (const webinar of webinars) {
        try {
          console.log(`🔧 Processing webinar: ${webinar.zoom_webinar_id} (${webinar.topic})`);
          await this.repairWebinarMetrics(webinar.id);
          successCount++;
        } catch (error) {
          errorCount++;
          const errorMsg = `Failed to repair webinar ${webinar.zoom_webinar_id}: ${error.message}`;
          console.error(`❌ ${errorMsg}`);
          errors.push(errorMsg);
        }
      }

      console.log(`🎉 Batch repair completed: ${successCount}/${webinars.length} webinars repaired`);
      
      return {
        totalProcessed: webinars.length,
        successCount,
        errorCount,
        errors
      };
    } catch (error) {
      console.error('Error in batch metrics repair:', error);
      throw error;
    }
  }

  /**
   * Generate a repair report without making changes
   */
  static async generateRepairReport(connectionId?: string): Promise<{
    webinarsNeedingRepair: number;
    webinarsWithZeroAttendees: number;
    webinarsWithPendingSync: number;
    webinarsWithFailedSync: number;
    webinarsWithParticipantsButZeroMetrics: number;
  }> {
    try {
      console.log('📊 Generating metrics repair report...');

      let baseQuery = supabase.from('zoom_webinars').select('id, total_attendees, participant_sync_status');
      
      if (connectionId) {
        baseQuery = baseQuery.eq('connection_id', connectionId);
      }

      // Get webinars needing repair
      const { data: needingRepair } = await baseQuery
        .or('total_attendees.is.null,total_attendees.eq.0,participant_sync_status.eq.pending,participant_sync_status.eq.failed');

      // Get webinars with zero attendees
      const { data: zeroAttendees } = await baseQuery
        .eq('total_attendees', 0);

      // Get webinars with pending sync
      const { data: pendingSync } = await baseQuery
        .eq('participant_sync_status', 'pending');

      // Get webinars with failed sync
      const { data: failedSync } = await baseQuery
        .eq('participant_sync_status', 'failed');

      // Get webinars that have participants but zero metrics
      const { data: webinarsWithParticipants } = await supabase
        .from('zoom_webinars')
        .select(`
          id,
          total_attendees,
          zoom_participants!inner(count)
        `)
        .eq('total_attendees', 0);

      const report = {
        webinarsNeedingRepair: needingRepair?.length || 0,
        webinarsWithZeroAttendees: zeroAttendees?.length || 0,
        webinarsWithPendingSync: pendingSync?.length || 0,
        webinarsWithFailedSync: failedSync?.length || 0,
        webinarsWithParticipantsButZeroMetrics: webinarsWithParticipants?.length || 0
      };

      console.log('📊 Repair report generated:', report);
      return report;
    } catch (error) {
      console.error('Error generating repair report:', error);
      throw error;
    }
  }
}
