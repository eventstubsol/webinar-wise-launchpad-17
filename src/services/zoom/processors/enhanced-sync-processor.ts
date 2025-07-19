
/**
 * Enhanced sync processor with proper data fetching and validation
 */
import { ZoomRegistrantService } from '../api/ZoomRegistrantService';
import { ZoomParticipantService } from '../api/ZoomParticipantService';
import { DataValidationService } from '../validation/DataValidationService';
import { calculateWebinarStatus, determineParticipantSyncStatus } from '../utils/webinarStatusUtils';

export interface SyncResults {
  webinarsSynced: number;
  registrantsSynced: number;
  participantsSynced: number;
  errors: Array<{ webinarId: string; error: string; type: 'webinar' | 'registrant' | 'participant' }>;
  validationReport?: any;
}

export class EnhancedSyncProcessor {
  private validationService: DataValidationService;

  constructor() {
    this.validationService = new DataValidationService();
  }

  /**
   * ENHANCED: Process webinar with proper status detection and data fetching
   */
  async processWebinar(supabase: any, webinarData: any, connectionId: string): Promise<{
    success: boolean;
    registrants: number;
    participants: number;
    error?: string;
  }> {
    console.log(`🚀 ENHANCED PROCESSING webinar ${webinarData.id}: ${webinarData.topic}`);
    
    try {
      // Calculate proper webinar status
      const statusInfo = calculateWebinarStatus(webinarData);
      console.log(`📊 Webinar status info:`, statusInfo);

      // Update webinar data with calculated status
      webinarData.status = statusInfo.status;
      webinarData.participant_sync_status = determineParticipantSyncStatus(webinarData);

      // Store webinar in database first
      const { data: savedWebinar, error: webinarError } = await supabase
        .from('zoom_webinars')
        .upsert({
          connection_id: connectionId,
          zoom_webinar_id: webinarData.id.toString(),
          webinar_id: webinarData.id.toString(),
          topic: webinarData.topic,
          start_time: webinarData.start_time,
          duration: webinarData.duration,
          status: statusInfo.status,
          participant_sync_status: webinarData.participant_sync_status,
          settings: webinarData.settings || {},
          agenda: webinarData.agenda,
          join_url: webinarData.join_url,
          registration_url: webinarData.registration_url,
          host_id: webinarData.host_id,
          host_email: webinarData.host_email,
          type: webinarData.type,
          timezone: webinarData.timezone,
          synced_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'connection_id,zoom_webinar_id',
          ignoreDuplicates: false
        })
        .select('id')
        .single();

      if (webinarError) {
        console.error(`❌ Failed to save webinar:`, webinarError);
        throw new Error(`Failed to save webinar: ${webinarError.message}`);
      }

      const webinarDbId = savedWebinar.id;
      let registrantCount = 0;
      let participantCount = 0;

      // Fetch registrants for all webinars (they're always available)
      console.log(`📝 Fetching registrants for webinar ${webinarData.id}`);
      try {
        const registrantsResponse = await ZoomRegistrantService.getAllRegistrants(webinarData.id);
        const registrants = registrantsResponse.success ? registrantsResponse.data : [];
        console.log(`📊 Found ${registrants.length} registrants`);

        if (registrants.length > 0) {
          const transformedRegistrants = registrants.map(r => ({
            webinar_id: webinarDbId,
            registrant_id: r.id || r.registrant_id,
            email: r.email,
            first_name: r.first_name,
            last_name: r.last_name,
            registration_time: r.registration_time || r.created_at,
            status: r.status || 'approved',
            join_url: r.join_url,
            city: r.city,
            state: r.state,
            country: r.country,
            phone: r.phone,
            job_title: r.job_title,
            org: r.org,
            industry: r.industry,
            custom_questions: r.custom_questions,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }));

          const { error: registrantError } = await supabase
            .from('zoom_registrants')
            .upsert(transformedRegistrants, {
              onConflict: 'webinar_id,registrant_id',
              ignoreDuplicates: false
            });

          if (registrantError) {
            console.error(`❌ Failed to save registrants:`, registrantError);
          } else {
            registrantCount = registrants.length;
            console.log(`✅ Saved ${registrantCount} registrants`);
          }
        }
      } catch (registrantError) {
        console.error(`❌ Failed to fetch registrants:`, registrantError);
      }

      // Fetch participants only for past webinars
      if (statusInfo.isEligibleForParticipantSync) {
        console.log(`👥 Fetching participants for past webinar ${webinarData.id}`);
        try {
          const participantsResponse = await ZoomParticipantService.getAllParticipants(webinarData.id);
          const participants = participantsResponse.success ? participantsResponse.data : [];
          console.log(`📊 Found ${participants.length} participants`);

          if (participants.length > 0) {
            const transformedParticipants = participants.map(p => ({
              webinar_id: webinarDbId,
              participant_id: p.id || p.participant_id || p.user_id,
              participant_name: p.name || p.participant_name,
              participant_email: p.email || p.participant_email,
              join_time: p.join_time,
              leave_time: p.leave_time,
              duration: p.duration,
              attentiveness_score: p.attentiveness_score,
              device_info: p.device ? JSON.stringify(p.device) : null,
              user_location: p.location ? JSON.stringify(p.location) : null,
              participant_user_id: p.user_id,
              participant_uuid: p.participant_uuid,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            }));

            const { error: participantError } = await supabase
              .from('zoom_participants')
              .upsert(transformedParticipants, {
                onConflict: 'webinar_id,participant_id',
                ignoreDuplicates: false
              });

            if (participantError) {
              console.error(`❌ Failed to save participants:`, participantError);
            } else {
              participantCount = participants.length;
              console.log(`✅ Saved ${participantCount} participants`);
            }
          }

          // Update participant sync status
          await supabase
            .from('zoom_webinars')
            .update({
              participant_sync_status: participants.length > 0 ? 'completed' : 'failed',
              participant_sync_attempted_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .eq('id', webinarDbId);

        } catch (participantError) {
          console.error(`❌ Failed to fetch participants:`, participantError);
          
          // Update sync status to failed
          await supabase
            .from('zoom_webinars')
            .update({
              participant_sync_status: 'failed',
              participant_sync_attempted_at: new Date().toISOString(),
              participant_sync_error: participantError.message,
              updated_at: new Date().toISOString()
            })
            .eq('id', webinarDbId);
        }
      }

      // Update webinar counts
      await this.updateWebinarCounts(supabase, webinarDbId, registrantCount, participantCount);

      console.log(`✅ Successfully processed webinar ${webinarData.id}: ${registrantCount} registrants, ${participantCount} participants`);

      return {
        success: true,
        registrants: registrantCount,
        participants: participantCount
      };

    } catch (error) {
      console.error(`❌ Failed to process webinar ${webinarData.id}:`, error);
      return {
        success: false,
        registrants: 0,
        participants: 0,
        error: error.message
      };
    }
  }

  /**
   * FIXED: Update webinar counts using correct column names
   */
  private async updateWebinarCounts(supabase: any, webinarDbId: string, registrantCount: number, participantCount: number): Promise<void> {
    try {
      console.log(`📊 Updating webinar counts: ${registrantCount} registrants, ${participantCount} participants`);
      
      // Calculate additional metrics
      const totalAbsentees = Math.max(0, registrantCount - participantCount);
      
      const { error } = await supabase
        .from('zoom_webinars')
        .update({
          total_registrants: registrantCount,  // FIXED: Use correct column name
          total_attendees: participantCount,   // FIXED: Use correct column name
          total_absentees: totalAbsentees,
          updated_at: new Date().toISOString()
        })
        .eq('id', webinarDbId);

      if (error) {
        console.error(`❌ Failed to update webinar counts:`, error);
      } else {
        console.log(`✅ Updated webinar counts successfully`);
      }
    } catch (error) {
      console.error(`❌ Error updating webinar counts:`, error);
    }
  }

  /**
   * Backfill data for existing webinars that should have participants/registrants
   */
  async backfillHistoricalData(supabase: any, connectionId: string): Promise<SyncResults> {
    console.log(`🔄 Starting backfill for historical data`);
    
    // Get webinars that should have participant data but don't
    const { data: webinarsToBackfill, error } = await supabase
      .from('zoom_webinars')
      .select('*')
      .eq('connection_id', connectionId)
      .in('participant_sync_status', ['not_applicable', 'pending', 'failed'])
      .not('start_time', 'is', null);

    if (error) {
      console.error(`❌ Failed to fetch webinars for backfill:`, error);
      throw error;
    }

    console.log(`📊 Found ${webinarsToBackfill.length} webinars for backfill`);

    const results: SyncResults = {
      webinarsSynced: 0,
      registrantsSynced: 0,
      participantsSynced: 0,
      errors: []
    };

    for (const webinar of webinarsToBackfill) {
      console.log(`🔄 Backfilling webinar ${webinar.zoom_webinar_id}: ${webinar.topic}`);
      
      const result = await this.processWebinar(supabase, {
        id: webinar.zoom_webinar_id,
        topic: webinar.topic,
        start_time: webinar.start_time,
        duration: webinar.duration,
        status: webinar.status,
        settings: webinar.settings,
        agenda: webinar.agenda,
        join_url: webinar.join_url,
        registration_url: webinar.registration_url,
        host_id: webinar.host_id,
        host_email: webinar.host_email,
        type: webinar.type,
        timezone: webinar.timezone
      }, connectionId);

      if (result.success) {
        results.webinarsSynced++;
        results.registrantsSynced += result.registrants;
        results.participantsSynced += result.participants;
      } else {
        results.errors.push({
          webinarId: webinar.zoom_webinar_id,
          error: result.error || 'Unknown error',
          type: 'webinar'
        });
      }
    }

    console.log(`✅ Backfill completed:`, results);
    return results;
  }
}
