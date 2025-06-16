
import { createZoomAPIClient } from './zoom-api-client.ts';
import { updateSyncLog, updateSyncStage, saveWebinarToDatabase } from './database-operations.ts';
import { EnhancedStatusDetector } from './enhanced-status-detector.ts';
import { SyncLogger } from './enhanced-logging.ts';

/**
 * Simplified webinar processor - ONLY handles webinars, registrants, and participants
 * WITH ENHANCED DEBUGGING AND LOGGING
 */
export class SimplifiedWebinarProcessor {
  private client: any;
  private supabase: any;
  private syncLogId: string;
  private connectionId: string;
  private syncResults = {
    webinarCount: 0,
    registrantCount: 0,
    participantCount: 0,
    errors: [] as string[]
  };

  constructor(client: any, supabase: any, syncLogId: string, connectionId: string) {
    this.client = client;
    this.supabase = supabase;
    this.syncLogId = syncLogId;
    this.connectionId = connectionId;
  }

  /**
   * Process a single webinar - SIMPLIFIED to only handle essential data
   */
  async processWebinar(webinarData: any, index: number, total: number): Promise<{
    registrantCount: number;
    participantCount: number;
  }> {
    const webinarId = webinarData.id;
    const webinarTitle = webinarData.topic || 'Unknown Title';
    
    // Enhanced logging for webinar details
    SyncLogger.logWebinarDetails(webinarData, index, total);
    
    const progress = Math.round(((index + 1) / total) * 30); // Reserve 70% for data fetching
    await updateSyncStage(this.supabase, this.syncLogId, webinarId, 'processing_webinar', progress);

    try {
      // Step 1: Process webinar metadata with enhanced status detection
      const finalStatus = await this.determineWebinarStatus(webinarData);
      const webinarWithStatus = { ...webinarData, status: finalStatus };
      
      await saveWebinarToDatabase(this.supabase, webinarWithStatus, this.connectionId);
      console.log(`✅ Step 1 Complete: Webinar metadata saved with status: ${finalStatus}`);
      this.syncResults.webinarCount++;

      // Get database webinar ID for related data
      const dbWebinarId = await this.getWebinarDatabaseId(webinarId);
      if (!dbWebinarId) {
        throw new Error(`Failed to get database ID for webinar ${webinarId}`);
      }
      console.log(`🔗 Database webinar ID: ${dbWebinarId}`);

      // Step 2: FORCE PROCESS REGISTRANTS (regardless of status)
      let registrantCount = 0;
      try {
        registrantCount = await this.forceProcessRegistrants(webinarId, dbWebinarId, index, total);
        this.syncResults.registrantCount += registrantCount;
      } catch (error) {
        const errorMsg = `Registrants failed for ${webinarId}: ${error.message}`;
        console.error(`❌ ${errorMsg}`);
        this.syncResults.errors.push(errorMsg);
      }

      // Step 3: FORCE PROCESS PARTICIPANTS (regardless of status)  
      let participantCount = 0;
      try {
        participantCount = await this.forceProcessParticipants(webinarId, dbWebinarId, index, total);
        this.syncResults.participantCount += participantCount;
      } catch (error) {
        const errorMsg = `Participants failed for ${webinarId}: ${error.message}`;
        console.error(`❌ ${errorMsg}`);
        this.syncResults.errors.push(errorMsg);
      }

      console.log(`🎉 WEBINAR ${index + 1} PROCESSING COMPLETE: ${webinarTitle}`);
      console.log(`📊 Summary: ${registrantCount} registrants, ${participantCount} participants`);
      
      return {
        registrantCount,
        participantCount
      };
      
    } catch (error) {
      const errorMsg = `WEBINAR ${index + 1} PROCESSING FAILED: ${webinarTitle} - ${error.message}`;
      console.error(`❌ ${errorMsg}`);
      this.syncResults.errors.push(errorMsg);
      throw error;
    }
  }

  private async determineWebinarStatus(webinarData: any): Promise<string> {
    console.log(`🔍 Determining status for webinar ${webinarData.id}`);
    
    let finalStatus: string;
    try {
      finalStatus = await this.client.getWebinarStatus(webinarData.id, webinarData);
      console.log(`✅ Status determined via API: ${finalStatus}`);
    } catch (statusError) {
      console.log(`⚠️ API status detection failed, using fallback: ${statusError.message}`);
      const statusResult = EnhancedStatusDetector.determineWebinarStatus(webinarData);
      finalStatus = statusResult.status;
      console.log(`✅ Fallback status determined: ${finalStatus} (confidence: ${statusResult.confidence})`);
    }
    
    return finalStatus;
  }

  private async getWebinarDatabaseId(zoomWebinarId: string): Promise<string | null> {
    console.log(`🔍 Looking up database ID for Zoom webinar ${zoomWebinarId}`);
    
    const { data, error } = await this.supabase
      .from('zoom_webinars')
      .select('id')
      .eq('connection_id', this.connectionId)
      .eq('webinar_id', zoomWebinarId)
      .single();
      
    if (error) {
      console.error(`❌ Failed to get database ID for webinar ${zoomWebinarId}:`, error);
      return null;
    }
    
    console.log(`✅ Database ID found: ${data.id}`);
    return data.id;
  }

  private async forceProcessRegistrants(webinarId: string, dbWebinarId: string, index: number, total: number): Promise<number> {
    console.log(`\n📝 === STEP 2: FORCE FETCH REGISTRANTS ===`);
    console.log(`📝 FORCING registrant fetch for webinar ${webinarId} (regardless of status)`);
    
    const progress = Math.round(((index + 1) / total) * 50);
    await updateSyncStage(this.supabase, this.syncLogId, webinarId, 'fetching_registrants', progress);
    
    try {
      SyncLogger.logAPICall('registrants', webinarId);
      const registrants = await this.client.getWebinarRegistrants(webinarId);
      SyncLogger.logAPIResponse('registrants', registrants, webinarId);
      
      if (registrants.length > 0) {
        console.log(`💾 Saving ${registrants.length} registrants to database...`);
        await this.saveRegistrantsToDatabase(registrants, webinarId, this.connectionId);
        SyncLogger.logDatabaseOperation('insert', 'zoom_registrants', registrants.length, webinarId);
        console.log(`✅ Step 2 Complete: ${registrants.length} registrants saved to database`);
        return registrants.length;
      } else {
        console.log(`ℹ️ Step 2 Complete: No registrants found (empty response)`);
        SyncLogger.logDatabaseOperation('insert', 'zoom_registrants', 0, webinarId);
        return 0;
      }
    } catch (error) {
      SyncLogger.logAPIError('registrants', error, webinarId);
      if (error.message?.includes('does not contain scopes')) {
        console.error(`🔐 SCOPE ERROR: Missing required scope for registrant data`);
      }
      throw error;
    }
  }

  private async forceProcessParticipants(webinarId: string, dbWebinarId: string, index: number, total: number): Promise<number> {
    console.log(`\n👥 === STEP 3: FORCE FETCH PARTICIPANTS ===`);
    console.log(`👥 FORCING participant fetch for webinar ${webinarId} (regardless of status)`);
    
    const progress = Math.round(((index + 1) / total) * 80);
    await updateSyncStage(this.supabase, this.syncLogId, webinarId, 'fetching_participants', progress);
    
    try {
      SyncLogger.logAPICall('participants', webinarId);
      const participants = await this.client.getWebinarParticipants(webinarId);
      SyncLogger.logAPIResponse('participants', participants, webinarId);
      
      if (participants.length > 0) {
        console.log(`💾 Saving ${participants.length} participants to database...`);
        await this.saveParticipantsToDatabase(participants, webinarId, this.connectionId);
        SyncLogger.logDatabaseOperation('insert', 'zoom_participants', participants.length, webinarId);
        console.log(`✅ Step 3 Complete: ${participants.length} participants saved to database`);
        return participants.length;
      } else {
        console.log(`ℹ️ Step 3 Complete: No participants found (empty response)`);
        SyncLogger.logDatabaseOperation('insert', 'zoom_participants', 0, webinarId);
        return 0;
      }
    } catch (error) {
      SyncLogger.logAPIError('participants', error, webinarId);
      
      if (error.message?.includes('does not contain scopes')) {
        console.error(`🔐 SCOPE ERROR: Missing required scope 'report:read:list_webinar_participants:admin' for participant data`);
      }
      throw error;
    }
  }

  /**
   * Save registrants to database with extensive logging and error handling
   */
  private async saveRegistrantsToDatabase(registrants: any[], webinarZoomId: string, connectionId: string): Promise<void> {
    console.log(`💾 === SAVING REGISTRANTS TO DATABASE ===`);
    console.log(`💾 Webinar Zoom ID: ${webinarZoomId}`);
    console.log(`💾 Connection ID: ${connectionId}`);
    console.log(`💾 Registrant count: ${registrants.length}`);
    
    try {
      // Get the database webinar ID
      const { data: webinarData, error: webinarError } = await this.supabase
        .from('zoom_webinars')
        .select('id')
        .eq('connection_id', connectionId)
        .eq('webinar_id', webinarZoomId)
        .single();
        
      if (webinarError || !webinarData) {
        SyncLogger.logDatabaseError('select', 'zoom_webinars', webinarError, webinarZoomId);
        throw new Error(`Could not find webinar in database for Zoom ID ${webinarZoomId}`);
      }
      
      const webinarDbId = webinarData.id;
      console.log(`🔗 Using database webinar ID: ${webinarDbId}`);
      
      // Transform registrants for database
      const transformedRegistrants = registrants.map((registrant, index) => {
        console.log(`🔄 Transforming registrant ${index + 1}: ${registrant.first_name} ${registrant.last_name} (${registrant.email})`);
        
        return {
          webinar_id: webinarDbId,
          registrant_id: registrant.id || registrant.registrant_id,
          email: registrant.email,
          first_name: registrant.first_name,
          last_name: registrant.last_name,
          address: registrant.address || null,
          city: registrant.city || null,
          country: registrant.country || null,
          zip: registrant.zip || null,
          state: registrant.state || null,
          phone: registrant.phone || null,
          industry: registrant.industry || null,
          org: registrant.org || null,
          job_title: registrant.job_title || null,
          purchasing_time_frame: registrant.purchasing_time_frame || null,
          role_in_purchase_process: registrant.role_in_purchase_process || null,
          no_of_employees: registrant.no_of_employees || null,
          comments: registrant.comments || null,
          custom_questions: registrant.custom_questions || null,
          status: registrant.status || null,
          create_time: registrant.create_time || null,
          join_url: registrant.join_url || null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
      });
      
      console.log(`💾 Attempting to upsert ${transformedRegistrants.length} transformed registrants`);
      
      const { error } = await this.supabase
        .from('zoom_registrants')
        .upsert(transformedRegistrants, {
          onConflict: 'webinar_id,registrant_id',
          ignoreDuplicates: false
        });
        
      if (error) {
        SyncLogger.logDatabaseError('upsert', 'zoom_registrants', error, webinarZoomId);
        throw new Error(`Failed to save registrants: ${error.message}`);
      }
      
      console.log(`✅ Successfully saved ${transformedRegistrants.length} registrants for webinar ${webinarZoomId}`);
    } catch (error) {
      SyncLogger.logDatabaseError('save', 'zoom_registrants', error, webinarZoomId);
      throw error;
    }
  }

  /**
   * Save participants to database with extensive logging and error handling
   */
  private async saveParticipantsToDatabase(participants: any[], webinarZoomId: string, connectionId: string): Promise<void> {
    console.log(`💾 === SAVING PARTICIPANTS TO DATABASE ===`);
    console.log(`💾 Webinar Zoom ID: ${webinarZoomId}`);
    console.log(`💾 Connection ID: ${connectionId}`);
    console.log(`💾 Participant count: ${participants.length}`);
    
    try {
      // Get the database webinar ID
      const { data: webinarData, error: webinarError } = await this.supabase
        .from('zoom_webinars')
        .select('id')
        .eq('connection_id', connectionId)
        .eq('webinar_id', webinarZoomId)
        .single();
        
      if (webinarError || !webinarData) {
        SyncLogger.logDatabaseError('select', 'zoom_webinars', webinarError, webinarZoomId);
        throw new Error(`Could not find webinar in database for Zoom ID ${webinarZoomId}`);
      }
      
      const webinarDbId = webinarData.id;
      console.log(`🔗 Using database webinar ID: ${webinarDbId}`);
      
      // Transform participants for database
      const transformedParticipants = participants.map((participant, index) => {
        const participantName = participant.name || participant.participant_name || 'Unknown';
        console.log(`🔄 Transforming participant ${index + 1}: ${participantName} (${participant.user_email || participant.participant_email || 'No email'})`);
        
        return {
          webinar_id: webinarDbId,
          participant_id: participant.id || participant.participant_id,
          registrant_id: participant.registrant_id || null,
          participant_name: participantName,
          participant_email: participant.user_email || participant.participant_email || null,
          participant_user_id: participant.user_id || null,
          join_time: participant.join_time || null,
          leave_time: participant.leave_time || null,
          duration: participant.duration || null,
          attentiveness_score: participant.attentiveness_score || null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
      });
      
      console.log(`💾 Attempting to upsert ${transformedParticipants.length} transformed participants`);
      
      const { error } = await this.supabase
        .from('zoom_participants')
        .upsert(transformedParticipants, {
          onConflict: 'webinar_id,participant_id',
          ignoreDuplicates: false
        });
        
      if (error) {
        SyncLogger.logDatabaseError('upsert', 'zoom_participants', error, webinarZoomId);
        throw new Error(`Failed to save participants: ${error.message}`);
      }
      
      console.log(`✅ Successfully saved ${transformedParticipants.length} participants for webinar ${webinarZoomId}`);
    } catch (error) {
      SyncLogger.logDatabaseError('save', 'zoom_participants', error, webinarZoomId);
      throw error;
    }
  }

  /**
   * Get final sync results summary
   */
  getSyncResults() {
    SyncLogger.logSyncSummary(this.syncResults);
    return this.syncResults;
  }
}
