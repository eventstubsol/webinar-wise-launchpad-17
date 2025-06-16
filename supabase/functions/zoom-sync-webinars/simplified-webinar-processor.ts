
import { SyncLogger } from './enhanced-logging.ts';

export class SimplifiedWebinarProcessor {
  private client: any;
  private supabase: any;
  private syncLogId: string;
  private connectionId: string;

  constructor(client: any, supabase: any, syncLogId: string, connectionId: string) {
    this.client = client;
    this.supabase = supabase;
    this.syncLogId = syncLogId;
    this.connectionId = connectionId;
  }

  async processWebinar(webinarData: any, index: number, total: number) {
    SyncLogger.logWebinarDetails(webinarData, index, total);
    
    let registrantCount = 0;
    let participantCount = 0;
    const errors: string[] = [];

    try {
      // Save webinar to database first
      await this.saveWebinarToDatabase(webinarData);
      console.log(`✅ Webinar ${webinarData.id} saved to database`);

      // Fetch and save registrants
      try {
        SyncLogger.logAPICall('registrants', webinarData.id);
        const registrantsData = await this.client.fetchRegistrants(webinarData.id);
        SyncLogger.logAPIResponse('registrants', registrantsData, webinarData.id);
        
        if (registrantsData && registrantsData.registrants) {
          registrantCount = registrantsData.registrants.length;
          if (registrantCount > 0) {
            await this.saveRegistrantsToDatabase(webinarData.id, registrantsData.registrants);
            SyncLogger.logDatabaseOperation('insert', 'zoom_registrants', registrantCount, webinarData.id);
          }
        }
      } catch (error) {
        const errorMsg = `Failed to process registrants for webinar ${webinarData.id}: ${error.message}`;
        errors.push(errorMsg);
        SyncLogger.logAPIError('registrants', error, webinarData.id);
        console.error(`❌ ${errorMsg}`);
      }

      // Fetch and save participants (only for past webinars)
      if (this.isWebinarCompleted(webinarData)) {
        try {
          SyncLogger.logAPICall('participants', webinarData.id);
          const participantsData = await this.client.fetchParticipants(webinarData.id);
          SyncLogger.logAPIResponse('participants', participantsData, webinarData.id);
          
          if (participantsData && participantsData.participants) {
            participantCount = participantsData.participants.length;
            if (participantCount > 0) {
              await this.saveParticipantsToDatabase(webinarData.id, participantsData.participants);
              SyncLogger.logDatabaseOperation('insert', 'zoom_participants', participantCount, webinarData.id);
            }
          }
        } catch (error) {
          const errorMsg = `Failed to process participants for webinar ${webinarData.id}: ${error.message}`;
          errors.push(errorMsg);
          SyncLogger.logAPIError('participants', error, webinarData.id);
          console.error(`❌ ${errorMsg}`);
        }
      } else {
        console.log(`⏭️ Skipping participants for future webinar ${webinarData.id}`);
      }

      return {
        success: true,
        registrantCount,
        participantCount,
        errors
      };

    } catch (error) {
      const errorMsg = `Critical error processing webinar ${webinarData.id}: ${error.message}`;
      errors.push(errorMsg);
      console.error(`💥 ${errorMsg}`);
      
      return {
        success: false,
        registrantCount: 0,
        participantCount: 0,
        errors: [errorMsg]
      };
    }
  }

  private async saveWebinarToDatabase(webinarData: any) {
    const webinarInsert = {
      connection_id: this.connectionId,
      webinar_id: webinarData.id.toString(),
      webinar_uuid: webinarData.uuid,
      topic: webinarData.topic,
      start_time: webinarData.start_time,
      duration: webinarData.duration,
      timezone: webinarData.timezone,
      host_id: webinarData.host_id,
      host_email: webinarData.host_email,
      status: this.normalizeWebinarStatus(webinarData.status),
      agenda: webinarData.agenda,
      type: webinarData.type,
      settings: webinarData.settings,
      synced_at: new Date().toISOString(),
    };

    const { error } = await this.supabase
      .from('zoom_webinars')
      .upsert(webinarInsert, { onConflict: 'connection_id,webinar_id' });

    if (error) {
      throw new Error(`Database error saving webinar: ${error.message}`);
    }
  }

  private async saveRegistrantsToDatabase(webinarId: string, registrants: any[]) {
    const registrantInserts = registrants.map(reg => ({
      webinar_id: webinarId,
      registrant_id: reg.id || reg.registrant_id,
      registrant_email: reg.email,
      first_name: reg.first_name,
      last_name: reg.last_name,
      address: reg.address,
      city: reg.city,
      state: reg.state,
      zip: reg.zip,
      country: reg.country,
      phone: reg.phone,
      comments: reg.comments,
      custom_questions: reg.custom_questions,
      registration_time: reg.registration_time,
      source_id: reg.source_id,
      tracking_source: reg.tracking_source,
      status: reg.status,
      job_title: reg.job_title,
      purchasing_time_frame: reg.purchasing_time_frame,
      role_in_purchase_process: reg.role_in_purchase_process,
      no_of_employees: reg.no_of_employees,
      industry: reg.industry,
      org: reg.org,
      language: reg.language,
      join_url: reg.join_url,
      create_time: reg.create_time
    }));

    const { error } = await this.supabase
      .from('zoom_registrants')
      .upsert(registrantInserts, { onConflict: 'webinar_id,registrant_id' });

    if (error) {
      SyncLogger.logDatabaseError('insert', 'zoom_registrants', error, webinarId);
      throw new Error(`Database error saving registrants: ${error.message}`);
    }
  }

  private async saveParticipantsToDatabase(webinarId: string, participants: any[]) {
    const participantInserts = participants.map(part => ({
      webinar_id: webinarId,
      participant_id: part.id || part.participant_id,
      registrant_id: part.registrant_id,
      participant_name: part.name || part.user_name,
      participant_email: part.email || part.user_email,
      participant_user_id: part.user_id,
      join_time: part.join_time,
      leave_time: part.leave_time,
      duration: part.duration,
      attentiveness_score: part.attentiveness_score,
      camera_on_duration: part.details?.camera_duration,
      share_application_duration: part.details?.share_application_duration,
      share_desktop_duration: part.details?.share_desktop_duration,
      posted_chat: part.posted_chat,
      raised_hand: part.raised_hand,
      answered_polling: part.answered_polling,
      asked_question: part.asked_question,
      device: part.device,
      ip_address: part.ip_address,
      location: part.location,
      network_type: part.network_type,
      version: part.version,
      customer_key: part.customer_key,
      failover: part.failover,
      status: part.status,
      internal_user: part.internal_user
    }));

    const { error } = await this.supabase
      .from('zoom_participants')
      .upsert(participantInserts, { onConflict: 'webinar_id,participant_id' });

    if (error) {
      SyncLogger.logDatabaseError('insert', 'zoom_participants', error, webinarId);
      throw new Error(`Database error saving participants: ${error.message}`);
    }
  }

  private normalizeWebinarStatus(zoomStatus: string): string {
    switch (zoomStatus?.toLowerCase()) {
      case 'available':
      case 'waiting':
        return 'available';
      case 'started':
      case 'live':
        return 'started';
      case 'ended':
      case 'finished':
        return 'ended';
      case 'aborted':
      case 'cancelled':
        return 'aborted';
      case 'deleted':
        return 'deleted';
      case 'unavailable':
        return 'unavailable';
      default:
        console.log(`Unknown status '${zoomStatus}', defaulting to 'unavailable'`);
        return 'unavailable';
    }
  }

  private isWebinarCompleted(webinarData: any): boolean {
    if (!webinarData.start_time) return false;
    
    const startTime = new Date(webinarData.start_time);
    const now = new Date();
    const duration = webinarData.duration || 60; // Default to 60 minutes if not specified
    const estimatedEndTime = new Date(startTime.getTime() + (duration * 60 * 1000));
    
    // Add 30 minutes buffer after estimated end time for Zoom to process data
    const dataAvailableTime = new Date(estimatedEndTime.getTime() + (30 * 60 * 1000));
    
    return now > dataAvailableTime;
  }
}
