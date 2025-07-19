
/**
 * Utility to fix webinar statuses for existing records
 */
import { calculateWebinarStatus, determineParticipantSyncStatus } from '../utils/webinarStatusUtils';

export class WebinarStatusFixer {
  
  /**
   * Fix all webinar statuses in the database
   */
  static async fixAllWebinarStatuses(supabase: any): Promise<{
    totalProcessed: number;
    statusesUpdated: number;
    participantSyncUpdated: number;
    errors: string[];
  }> {
    console.log(`🔧 Starting webinar status fix process`);
    
    const { data: webinars, error } = await supabase
      .from('zoom_webinars')
      .select('*')
      .not('start_time', 'is', null);

    if (error) {
      console.error(`❌ Failed to fetch webinars:`, error);
      throw error;
    }

    console.log(`📊 Found ${webinars.length} webinars to process`);

    let statusesUpdated = 0;
    let participantSyncUpdated = 0;
    const errors: string[] = [];

    for (const webinar of webinars) {
      try {
        const statusInfo = calculateWebinarStatus({
          id: webinar.zoom_webinar_id,
          start_time: webinar.start_time,
          duration: webinar.duration,
          status: webinar.status
        });

        const newParticipantSyncStatus = determineParticipantSyncStatus({
          id: webinar.zoom_webinar_id,
          start_time: webinar.start_time,
          duration: webinar.duration,
          total_attendees: webinar.total_attendees
        });

        let needsUpdate = false;
        const updates: any = {};

        if (webinar.status !== statusInfo.status) {
          updates.status = statusInfo.status;
          needsUpdate = true;
          statusesUpdated++;
        }

        if (webinar.participant_sync_status !== newParticipantSyncStatus) {
          updates.participant_sync_status = newParticipantSyncStatus;
          needsUpdate = true;
          participantSyncUpdated++;
        }

        if (needsUpdate) {
          updates.updated_at = new Date().toISOString();
          
          const { error: updateError } = await supabase
            .from('zoom_webinars')
            .update(updates)
            .eq('id', webinar.id);

          if (updateError) {
            console.error(`❌ Failed to update webinar ${webinar.zoom_webinar_id}:`, updateError);
            errors.push(`Failed to update ${webinar.zoom_webinar_id}: ${updateError.message}`);
          } else {
            console.log(`✅ Updated webinar ${webinar.zoom_webinar_id}: status=${statusInfo.status}, sync_status=${newParticipantSyncStatus}`);
          }
        }

      } catch (error) {
        console.error(`❌ Error processing webinar ${webinar.zoom_webinar_id}:`, error);
        errors.push(`Error processing ${webinar.zoom_webinar_id}: ${error.message}`);
      }
    }

    const results = {
      totalProcessed: webinars.length,
      statusesUpdated,
      participantSyncUpdated,
      errors
    };

    console.log(`✅ Webinar status fix completed:`, results);
    return results;
  }

  /**
   * Get webinars that need participant data but don't have it
   */
  static async getWebinarsNeedingParticipantData(supabase: any, connectionId: string): Promise<any[]> {
    const { data: webinars, error } = await supabase
      .from('zoom_webinars')
      .select('*')
      .eq('connection_id', connectionId)
      .eq('status', 'ended')
      .or('participant_sync_status.eq.pending,participant_sync_status.eq.not_applicable,participant_sync_status.eq.failed')
      .not('start_time', 'is', null);

    if (error) {
      console.error(`❌ Failed to fetch webinars needing participant data:`, error);
      throw error;
    }

    return webinars || [];
  }
}
