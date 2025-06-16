
import { createZoomAPIClient } from './zoom-api-client.ts';
import { updateSyncLog, updateSyncStage, saveWebinarToDatabase } from './database-operations.ts';
import { EnhancedStatusDetector } from './enhanced-status-detector.ts';

/**
 * Simplified webinar processor - ONLY handles webinars, registrants, and participants
 */
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

  /**
   * Process a single webinar - SIMPLIFIED to only handle essential data
   */
  async processWebinar(webinarData: any, index: number, total: number): Promise<{
    registrantCount: number;
    participantCount: number;
  }> {
    const webinarId = webinarData.id;
    const webinarTitle = webinarData.topic || 'Unknown Title';
    
    console.log(`\n📋 === STEP 1: WEBINAR METADATA ===`);
    console.log(`📋 Processing webinar metadata for ${webinarId}`);
    
    const progress = Math.round(((index + 1) / total) * 30); // Reserve 70% for data fetching
    await updateSyncStage(this.supabase, this.syncLogId, webinarId, 'processing_webinar', progress);

    try {
      // Step 1: Process webinar metadata with enhanced status detection
      const finalStatus = await this.determineWebinarStatus(webinarData);
      const webinarWithStatus = { ...webinarData, status: finalStatus };
      
      await saveWebinarToDatabase(this.supabase, webinarWithStatus, this.connectionId);
      console.log(`✅ Step 1 Complete: Webinar metadata saved with status: ${finalStatus}`);

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
      } catch (error) {
        console.error(`❌ Registrants failed for ${webinarId}:`, error.message);
      }

      // Step 3: FORCE PROCESS PARTICIPANTS (regardless of status)  
      let participantCount = 0;
      try {
        participantCount = await this.forceProcessParticipants(webinarId, dbWebinarId, index, total);
      } catch (error) {
        console.error(`❌ Participants failed for ${webinarId}:`, error.message);
      }

      console.log(`🎉 WEBINAR ${index + 1} PROCESSING COMPLETE: ${webinarTitle}`);
      console.log(`📊 Summary: ${registrantCount} registrants, ${participantCount} participants`);
      
      return {
        registrantCount,
        participantCount
      };
      
    } catch (error) {
      console.error(`❌ WEBINAR ${index + 1} PROCESSING FAILED: ${webinarTitle}`);
      console.error(`Error: ${error.message}`);
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
      console.log(`🌐 API Call: getWebinarRegistrants(${webinarId})`);
      const registrants = await this.client.getWebinarRegistrants(webinarId);
      console.log(`📊 API Response: ${registrants.length} registrants received`);
      
      if (registrants.length > 0) {
        console.log(`💾 Saving ${registrants.length} registrants to database...`);
        await this.saveRegistrantsToDatabase(registrants, webinarId, this.connectionId);
        console.log(`✅ Step 2 Complete: ${registrants.length} registrants saved to database`);
        return registrants.length;
      } else {
        console.log(`ℹ️ Step 2 Complete: No registrants found (empty response)`);
        return 0;
      }
    } catch (error) {
      console.error(`❌ Step 2 Failed: Registrants processing failed for ${webinarId}:`, error.message);
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
      console.log(`🌐 API Call: getWebinarParticipants(${webinarId})`);
      const participants = await this.client.getWebinarParticipants(webinarId);
      console.log(`📊 API Response: ${participants.length} participants received`);
      
      if (participants.length > 0) {
        console.log(`💾 Saving ${participants.length} participants to database...`);
        await this.saveParticipantsToDatabase(participants, webinarId, this.connectionId);
        console.log(`✅ Step 3 Complete: ${participants.length} participants saved to database`);
        return participants.length;
      } else {
        console.log(`ℹ️ Step 3 Complete: No participants found (empty response)`);
        return 0;
      }
    } catch (error) {
      console.error(`❌ Step 3 Failed: Participants processing failed for ${webinarId}:`, error.message);
      
      if (error.message?.includes('does not contain scopes')) {
        console.error(`🔐 SCOPE ERROR: Missing required scope 'report:read:list_webinar_participants:admin' for participant data`);
      }
      throw error;
    }
  }

  /**
   * Save registrants to database with extensive logging
   */
  private async saveRegistrantsToDatabase(registrants: any[], webinarZoomId: string, connectionId: string): Promise<void> {
    console.log(`💾 === SAVING REGISTRANTS TO DATABASE ===`);
    console.log(`💾 Webinar Zoom ID: ${webinarZoomId}`);
    console.log(`💾 Connection ID: ${connectionId}`);
    console.log(`💾 Registrant count: ${registrants.length}`);
    
    // Get the database webinar ID
    const { data: webinarData, error: webinarError } = await this.supabase
      .from('zoom_webinars')
      .select('id')
      .eq('connection_id', connectionId)
      .eq('webinar_id', webinarZoomId)
      .single();
      
    if (webinarError || !webinarData) {
      console.error(`❌ Could not find webinar in database for Zoom ID ${webinarZoomId}:`, webinarError);
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
      console.error(`❌ Failed to save registrants to database:`, error);
      throw new Error(`Failed to save registrants: ${error.message}`);
    }
    
    console.log(`✅ Successfully saved ${transformedRegistrants.length} registrants for webinar ${webinarZoomId}`);
  }

  /**
   * Save participants to database with extensive logging
   */
  private async saveParticipantsToDatabase(participants: any[], webinarZoomId: string, connectionId: string): Promise<void> {
    console.log(`💾 === SAVING PARTICIPANTS TO DATABASE ===`);
    console.log(`💾 Webinar Zoom ID: ${webinarZoomId}`);
    console.log(`💾 Connection ID: ${connectionId}`);
    console.log(`💾 Participant count: ${participants.length}`);
    
    // Get the database webinar ID
    const { data: webinarData, error: webinarError } = await this.supabase
      .from('zoom_webinars')
      .select('id')
      .eq('connection_id', connectionId)
      .eq('webinar_id', webinarZoomId)
      .single();
      
    if (webinarError || !webinarData) {
      console.error(`❌ Could not find webinar in database for Zoom ID ${webinarZoomId}:`, webinarError);
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
      console.error(`❌ Failed to save participants to database:`, error);
      throw new Error(`Failed to save participants: ${error.message}`);
    }
    
    console.log(`✅ Successfully saved ${transformedParticipants.length} participants for webinar ${webinarZoomId}`);
  }
}
