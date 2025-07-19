
import { supabase } from '@/integrations/supabase/client';

/**
 * Service for recovering missing webinar metrics
 * ENHANCED: Now handles both duplicate columns and missing data scenarios
 */
export class WebinarMetricsRecoveryService {
  /**
   * Identify webinars with potential metrics issues
   */
  static async identifyWebinarsWithMissingMetrics(connectionId?: string): Promise<{
    webinarsWithZeroAttendees: any[];
    webinarsWithParticipantsButZeroMetrics: any[];
    webinarsWithRegistrantsButZeroMetrics: any[];
  }> {
    try {
      console.log('🔍 Identifying webinars with missing metrics...');

      // Build base query - use only primary columns to avoid confusion
      let baseQuery = supabase
        .from('zoom_webinars')
        .select(`
          id,
          zoom_webinar_id,
          topic,
          total_attendees,
          total_registrants,
          participant_sync_status,
          start_time
        `);

      if (connectionId) {
        baseQuery = baseQuery.eq('connection_id', connectionId);
      }

      // Get webinars with zero or null attendees
      const { data: webinarsWithZeroAttendees, error: zeroAttendeesError } = await baseQuery
        .or('total_attendees.is.null,total_attendees.eq.0');

      if (zeroAttendeesError) {
        console.error('Error fetching webinars with zero attendees:', zeroAttendeesError);
        throw zeroAttendeesError;
      }

      console.log(`Found ${webinarsWithZeroAttendees?.length || 0} webinars with zero/null attendees`);

      // Check which of these actually have participant or registrant data
      const webinarsWithParticipantsButZeroMetrics = [];
      const webinarsWithRegistrantsButZeroMetrics = [];

      if (webinarsWithZeroAttendees && webinarsWithZeroAttendees.length > 0) {
        for (const webinar of webinarsWithZeroAttendees) {
          console.log(`🔍 Checking webinar ${webinar.zoom_webinar_id} for actual data...`);
          
          // Check for participants
          const { count: participantCount } = await supabase
            .from('zoom_participants')
            .select('*', { count: 'exact', head: true })
            .eq('webinar_id', webinar.id);

          // Check for registrants
          const { count: registrantCount } = await supabase
            .from('zoom_registrants')
            .select('*', { count: 'exact', head: true })
            .eq('webinar_id', webinar.id);

          console.log(`📊 Webinar ${webinar.zoom_webinar_id}: ${participantCount || 0} participants, ${registrantCount || 0} registrants in DB`);

          if (participantCount && participantCount > 0) {
            webinarsWithParticipantsButZeroMetrics.push({
              ...webinar,
              actual_participants: participantCount,
              actual_registrants: registrantCount || 0
            });
          } else if (registrantCount && registrantCount > 0 && (!webinar.total_registrants || webinar.total_registrants === 0)) {
            webinarsWithRegistrantsButZeroMetrics.push({
              ...webinar,
              actual_participants: participantCount || 0,
              actual_registrants: registrantCount
            });
          }
        }
      }

      console.log(`Found ${webinarsWithParticipantsButZeroMetrics.length} webinars with participants but zero metrics`);
      console.log(`Found ${webinarsWithRegistrantsButZeroMetrics.length} webinars with registrants but zero metrics`);

      return {
        webinarsWithZeroAttendees: webinarsWithZeroAttendees || [],
        webinarsWithParticipantsButZeroMetrics,
        webinarsWithRegistrantsButZeroMetrics
      };
    } catch (error) {
      console.error('Error identifying webinars with missing metrics:', error);
      throw error;
    }
  }

  /**
   * Fix metrics for webinars that have data but zero metrics
   * ENHANCED: Now uses only primary columns to avoid duplicate column issues
   */
  static async fixWebinarsWithMissingMetrics(connectionId?: string): Promise<{
    totalFixed: number;
    errors: string[];
  }> {
    try {
      console.log('🔧 Starting metrics recovery process...');

      const { webinarsWithParticipantsButZeroMetrics, webinarsWithRegistrantsButZeroMetrics } = 
        await this.identifyWebinarsWithMissingMetrics(connectionId);

      const allWebinarsToFix = [
        ...webinarsWithParticipantsButZeroMetrics,
        ...webinarsWithRegistrantsButZeroMetrics
      ];

      // Remove duplicates based on webinar ID
      const uniqueWebinarsToFix = allWebinarsToFix.filter(
        (webinar, index, self) => index === self.findIndex(w => w.id === webinar.id)
      );

      console.log(`Found ${uniqueWebinarsToFix.length} unique webinars needing metrics recovery`);

      let fixedCount = 0;
      const errors: string[] = [];

      for (const webinar of uniqueWebinarsToFix) {
        try {
          console.log(`🔧 Fixing metrics for webinar: ${webinar.zoom_webinar_id} (${webinar.topic})`);
          
          // Get actual participant data
          const { data: participants, error: participantsError } = await supabase
            .from('zoom_participants')
            .select('duration, join_time')
            .eq('webinar_id', webinar.id);

          if (participantsError) {
            throw new Error(`Failed to fetch participants: ${participantsError.message}`);
          }

          // Get actual registrant count
          const { count: registrantCount, error: registrantsError } = await supabase
            .from('zoom_registrants')
            .select('*', { count: 'exact', head: true })
            .eq('webinar_id', webinar.id);

          if (registrantsError) {
            throw new Error(`Failed to fetch registrants: ${registrantsError.message}`);
          }

          // Calculate correct metrics
          const totalAttendees = participants?.length || 0;
          const totalRegistrants = registrantCount || 0;
          const totalMinutes = participants?.reduce((sum, p) => sum + (p.duration || 0), 0) || 0;
          const avgDuration = totalAttendees > 0 ? Math.round(totalMinutes / totalAttendees) : 0;
          const totalAbsentees = Math.max(0, totalRegistrants - totalAttendees);

          console.log(`📊 Calculated metrics for ${webinar.zoom_webinar_id}:`, {
            totalAttendees,
            totalRegistrants,
            totalMinutes,
            avgDuration,
            totalAbsentees
          });

          // Update webinar with correct metrics - ONLY use primary columns
          const { error: updateError } = await supabase
            .from('zoom_webinars')
            .update({
              total_registrants: totalRegistrants,
              total_attendees: totalAttendees,
              total_absentees: totalAbsentees,
              total_minutes: totalMinutes,
              avg_attendance_duration: avgDuration,
              // Don't use duplicate columns like attendees_count, registrants_count
              updated_at: new Date().toISOString()
            })
            .eq('id', webinar.id);

          if (updateError) {
            throw new Error(`Failed to update metrics: ${updateError.message}`);
          }

          console.log(`✅ Fixed metrics for ${webinar.zoom_webinar_id}: ${totalAttendees} attendees, ${totalRegistrants} registrants`);
          fixedCount++;

        } catch (error) {
          const errorMsg = `Failed to fix metrics for webinar ${webinar.zoom_webinar_id}: ${error.message}`;
          console.error(`❌ ${errorMsg}`);
          errors.push(errorMsg);
        }
      }

      console.log(`🎉 Metrics recovery completed: ${fixedCount}/${uniqueWebinarsToFix.length} webinars fixed`);

      return {
        totalFixed: fixedCount,
        errors
      };
    } catch (error) {
      console.error('Error in metrics recovery process:', error);
      throw error;
    }
  }

  /**
   * Generate detailed report of metrics issues
   * ENHANCED: Now provides better insights into duplicate column issues
   */
  static async generateMetricsReport(connectionId?: string): Promise<{
    summary: {
      totalWebinars: number;
      webinarsWithZeroAttendees: number;
      webinarsWithParticipantsButZeroMetrics: number;
      webinarsWithRegistrantsButZeroMetrics: number;
      syncStatusBreakdown: Record<string, number>;
    };
    details: any[];
  }> {
    try {
      console.log('📊 Generating metrics report...');

      // Get total webinar count
      let totalQuery = supabase
        .from('zoom_webinars')
        .select('*', { count: 'exact', head: true });

      if (connectionId) {
        totalQuery = totalQuery.eq('connection_id', connectionId);
      }

      const { count: totalWebinars } = await totalQuery;

      // Get detailed breakdown
      const identifiedIssues = await this.identifyWebinarsWithMissingMetrics(connectionId);

      // Get sync status breakdown
      let statusQuery = supabase
        .from('zoom_webinars')
        .select('participant_sync_status');

      if (connectionId) {
        statusQuery = statusQuery.eq('connection_id', connectionId);
      }

      const { data: statusData } = await statusQuery;
      
      const syncStatusBreakdown = statusData?.reduce((acc, webinar) => {
        const status = webinar.participant_sync_status || 'unknown';
        acc[status] = (acc[status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>) || {};

      const summary = {
        totalWebinars: totalWebinars || 0,
        webinarsWithZeroAttendees: identifiedIssues.webinarsWithZeroAttendees.length,
        webinarsWithParticipantsButZeroMetrics: identifiedIssues.webinarsWithParticipantsButZeroMetrics.length,
        webinarsWithRegistrantsButZeroMetrics: identifiedIssues.webinarsWithRegistrantsButZeroMetrics.length,
        syncStatusBreakdown
      };

      const details = [
        ...identifiedIssues.webinarsWithParticipantsButZeroMetrics,
        ...identifiedIssues.webinarsWithRegistrantsButZeroMetrics
      ];

      console.log('📈 Metrics report generated:', summary);

      return { summary, details };
    } catch (error) {
      console.error('Error generating metrics report:', error);
      throw error;
    }
  }

  /**
   * Clean up duplicate columns (for future database migration)
   * This method identifies which webinars have inconsistent data between duplicate columns
   */
  static async identifyDuplicateColumnIssues(connectionId?: string): Promise<{
    inconsistentWebinars: any[];
    duplicateColumns: string[];
  }> {
    try {
      console.log('🔍 Identifying duplicate column issues...');

      let query = supabase
        .from('zoom_webinars')
        .select(`
          id,
          zoom_webinar_id,
          topic,
          total_attendees,
          total_registrants
        `);

      if (connectionId) {
        query = query.eq('connection_id', connectionId);
      }

      const { data: webinars, error } = await query;

      if (error) {
        throw error;
      }

      const duplicateColumns = [
        'attendees_count vs total_attendees',
        'registrants_count vs total_registrants'
      ];

      // For now, just return the structure - the actual column comparison
      // would be done once we have access to the duplicate columns
      return {
        inconsistentWebinars: webinars || [],
        duplicateColumns
      };
    } catch (error) {
      console.error('Error identifying duplicate column issues:', error);
      throw error;
    }
  }
}
