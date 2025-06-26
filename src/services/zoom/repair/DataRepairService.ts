
import { supabase } from '@/integrations/supabase/client';

interface RepairPhaseResult {
  completed: boolean;
  issuesFixed?: number;
  message?: string;
  webinarsAnalyzed?: number;
  webinarsNeedingRepair?: number;
  totalWebinars?: number;
  errors?: string[];
}

interface ValidationResult {
  webinar_id: string;
  zoom_webinar_id: string;
  participants_in_table: number;
  total_attendees_field: number;
  sync_status: string;
  needs_repair: boolean;
}

/**
 * Service for comprehensive webinar data repair and recovery
 * Implements all phases of the repair plan
 */
export class DataRepairService {
  /**
   * Run comprehensive data repair process
   * Executes all phases of the repair plan in sequence
   */
  static async runComprehensiveRepair(connectionId?: string): Promise<{
    success: boolean;
    phases: Record<string, RepairPhaseResult>;
    totalIssuesFixed: number;
    errors: string[];
  }> {
    const results = {
      success: true,
      phases: {} as Record<string, RepairPhaseResult>,
      totalIssuesFixed: 0,
      errors: [] as string[]
    };

    try {
      console.log('🔧 Starting comprehensive data repair process...');

      // Phase 1: Database Schema Validation (already done via SQL migration)
      results.phases.schemaValidation = { completed: true, message: 'Schema fixes applied via migration' };

      // Phase 2: Data Validation and Cleanup
      try {
        const validationResult = await this.validateAndCleanupData(connectionId);
        results.phases.dataValidation = validationResult;
        results.totalIssuesFixed += validationResult.issuesFixed || 0;
      } catch (error: any) {
        results.errors.push(`Data validation phase failed: ${error.message}`);
        results.success = false;
      }

      // Phase 3: Sync Status Repair
      try {
        const syncRepairResult = await this.repairSyncStatuses(connectionId);
        results.phases.syncRepair = syncRepairResult;
        results.totalIssuesFixed += syncRepairResult.issuesFixed || 0;
      } catch (error: any) {
        results.errors.push(`Sync status repair phase failed: ${error.message}`);
        results.success = false;
      }

      // Phase 4: Metrics Recalculation
      try {
        const metricsResult = await this.recalculateAllMetrics(connectionId);
        results.phases.metricsRecalculation = metricsResult;
        results.totalIssuesFixed += metricsResult.issuesFixed || 0;
      } catch (error: any) {
        results.errors.push(`Metrics recalculation phase failed: ${error.message}`);
        results.success = false;
      }

      console.log(`✅ Comprehensive repair completed. Fixed ${results.totalIssuesFixed} issues.`);
      return results;

    } catch (error: any) {
      console.error('❌ Comprehensive repair failed:', error);
      results.success = false;
      results.errors.push(`Overall process failed: ${error.message}`);
      return results;
    }
  }

  /**
   * Phase 2: Validate and cleanup data inconsistencies
   */
  private static async validateAndCleanupData(connectionId?: string): Promise<RepairPhaseResult> {
    console.log('🔍 Phase 2: Validating and cleaning up data...');

    try {
      // Get validation results using direct queries instead of RPC
      let webinarsQuery = supabase
        .from('zoom_webinars')
        .select('id, zoom_webinar_id, total_attendees, participant_sync_status');

      if (connectionId) {
        webinarsQuery = webinarsQuery.eq('connection_id', connectionId);
      }

      const { data: webinars, error: webinarsError } = await webinarsQuery;

      if (webinarsError) {
        throw webinarsError;
      }

      const validationData: ValidationResult[] = [];
      
      if (webinars) {
        for (const webinar of webinars) {
          const { count: participantCount } = await supabase
            .from('zoom_participants')
            .select('*', { count: 'exact', head: true })
            .eq('webinar_id', webinar.id);

          const participantsInTable = participantCount || 0;
          const totalAttendeesField = webinar.total_attendees || 0;
          const needsRepair = participantsInTable !== totalAttendeesField || 
                             webinar.participant_sync_status === 'pending';

          validationData.push({
            webinar_id: webinar.id,
            zoom_webinar_id: webinar.zoom_webinar_id,
            participants_in_table: participantsInTable,
            total_attendees_field: totalAttendeesField,
            sync_status: webinar.participant_sync_status || 'unknown',
            needs_repair: needsRepair
          });
        }
      }

      const webinarsNeedingRepair = validationData.filter(w => w.needs_repair);
      
      console.log(`Found ${webinarsNeedingRepair.length} webinars needing data repair`);

      return {
        completed: true,
        webinarsAnalyzed: validationData.length,
        webinarsNeedingRepair: webinarsNeedingRepair.length,
        issuesFixed: 0 // Will be fixed in subsequent phases
      };
    } catch (error: any) {
      console.error('❌ Data validation failed:', error);
      throw error;
    }
  }

  /**
   * Phase 3: Repair sync statuses for webinars stuck in incorrect states
   */
  private static async repairSyncStatuses(connectionId?: string): Promise<RepairPhaseResult> {
    console.log('🔄 Phase 3: Repairing sync statuses...');

    try {
      let query = supabase
        .from('zoom_webinars')
        .select('id, zoom_webinar_id, participant_sync_status, total_attendees')
        .in('participant_sync_status', ['not_applicable', 'pending']);

      if (connectionId) {
        query = query.eq('connection_id', connectionId);
      }

      const { data: webinarsToRepair, error } = await query;

      if (error) {
        throw error;
      }

      if (!webinarsToRepair || webinarsToRepair.length === 0) {
        return { completed: true, issuesFixed: 0, message: 'No sync statuses need repair' };
      }

      // Reset sync statuses to pending for re-processing
      const { error: updateError } = await supabase
        .from('zoom_webinars')
        .update({
          participant_sync_status: 'pending',
          participant_sync_attempted_at: null,
          participant_sync_error: null,
          updated_at: new Date().toISOString()
        })
        .in('id', webinarsToRepair.map(w => w.id));

      if (updateError) {
        throw updateError;
      }

      console.log(`✅ Reset sync status for ${webinarsToRepair.length} webinars`);

      return {
        completed: true,
        issuesFixed: webinarsToRepair.length,
        message: `Reset sync status for ${webinarsToRepair.length} webinars`
      };
    } catch (error: any) {
      console.error('❌ Sync status repair failed:', error);
      throw error;
    }
  }

  /**
   * Phase 4: Recalculate metrics for all webinars with participant/registrant data
   */
  private static async recalculateAllMetrics(connectionId?: string): Promise<RepairPhaseResult> {
    console.log('📊 Phase 4: Recalculating all metrics...');

    try {
      // Get webinars that have participant or registrant data but incorrect metrics
      let webinarsQuery = supabase
        .from('zoom_webinars')
        .select('id, zoom_webinar_id, total_attendees, total_registrants');

      if (connectionId) {
        webinarsQuery = webinarsQuery.eq('connection_id', connectionId);
      }

      const { data: webinars, error: webinarsError } = await webinarsQuery;

      if (webinarsError) {
        throw webinarsError;
      }

      if (!webinars || webinars.length === 0) {
        return { completed: true, issuesFixed: 0, message: 'No webinars found' };
      }

      let metricsFixed = 0;
      const errors: string[] = [];

      // Process webinars in batches
      for (const webinar of webinars) {
        try {
          await this.recalculateWebinarMetrics(webinar.id);
          metricsFixed++;
        } catch (error: any) {
          errors.push(`Failed to recalculate metrics for ${webinar.zoom_webinar_id}: ${error.message}`);
        }
      }

      console.log(`✅ Recalculated metrics for ${metricsFixed}/${webinars.length} webinars`);

      return {
        completed: true,
        issuesFixed: metricsFixed,
        totalWebinars: webinars.length,
        errors: errors,
        message: `Recalculated metrics for ${metricsFixed} webinars`
      };
    } catch (error: any) {
      console.error('❌ Metrics recalculation failed:', error);
      throw error;
    }
  }

  /**
   * Recalculate metrics for a single webinar
   */
  private static async recalculateWebinarMetrics(webinarDbId: string): Promise<void> {
    // Get participant count and metrics
    const { data: participants, error: participantsError } = await supabase
      .from('zoom_participants')
      .select('duration, join_time')
      .eq('webinar_id', webinarDbId);

    if (participantsError) {
      throw participantsError;
    }

    // Get registrant count
    const { count: registrantCount, error: registrantsError } = await supabase
      .from('zoom_registrants')
      .select('*', { count: 'exact', head: true })
      .eq('webinar_id', webinarDbId);

    if (registrantsError) {
      throw registrantsError;
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
        updated_at: new Date().toISOString()
      })
      .eq('id', webinarDbId);

    if (updateError) {
      throw updateError;
    }
  }

  /**
   * Get repair status and recommendations
   */
  static async getRepairStatus(connectionId?: string): Promise<{
    needsRepair: boolean;
    issues: ValidationResult[];
    recommendations: string[];
  }> {
    try {
      // Use direct queries instead of RPC
      let webinarsQuery = supabase
        .from('zoom_webinars')
        .select('id, zoom_webinar_id, total_attendees, participant_sync_status');

      if (connectionId) {
        webinarsQuery = webinarsQuery.eq('connection_id', connectionId);
      }

      const { data: webinars, error } = await webinarsQuery;

      if (error) {
        throw error;
      }

      const validationData: ValidationResult[] = [];
      
      if (webinars) {
        for (const webinar of webinars) {
          const { count: participantCount } = await supabase
            .from('zoom_participants')
            .select('*', { count: 'exact', head: true })
            .eq('webinar_id', webinar.id);

          const participantsInTable = participantCount || 0;
          const totalAttendeesField = webinar.total_attendees || 0;
          const needsRepair = participantsInTable !== totalAttendeesField || 
                             webinar.participant_sync_status === 'pending';

          validationData.push({
            webinar_id: webinar.id,
            zoom_webinar_id: webinar.zoom_webinar_id,
            participants_in_table: participantsInTable,
            total_attendees_field: totalAttendeesField,
            sync_status: webinar.participant_sync_status || 'unknown',
            needs_repair: needsRepair
          });
        }
      }

      const issues = validationData.filter(w => w.needs_repair);
      const needsRepair = issues.length > 0;

      const recommendations = [];
      if (needsRepair) {
        recommendations.push('Run comprehensive data repair to fix participant-webinar relationships');
        recommendations.push('Recalculate metrics for webinars with inconsistent data');
        recommendations.push('Reset sync statuses for failed or stuck webinars');
      }

      return {
        needsRepair,
        issues,
        recommendations
      };
    } catch (error: any) {
      console.error('Error getting repair status:', error);
      throw error;
    }
  }
}
