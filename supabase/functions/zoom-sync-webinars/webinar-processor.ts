
import { createZoomAPIClient } from './zoom-api-client.ts';
import { updateSyncLog, updateSyncStage, saveWebinarToDatabase } from './database-operations.ts';
import { EnhancedStatusDetector } from './enhanced-status-detector.ts';
import { ParticipantDataProcessor } from './participant-data-processor.ts';

/**
 * Sequential webinar processor - handles one webinar at a time with complete data fetching
 */
export class SequentialWebinarProcessor {
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
   * Process a single webinar completely before moving to the next
   */
  async processWebinar(webinarData: any, index: number, total: number): Promise<void> {
    const webinarId = webinarData.id;
    const webinarTitle = webinarData.topic || 'Unknown Title';
    
    console.log(`\n=== PROCESSING WEBINAR ${index + 1} of ${total} ===`);
    console.log(`Webinar ID: ${webinarId}`);
    console.log(`Title: ${webinarTitle}`);
    console.log(`Start Time: ${webinarData.start_time || 'Not specified'}`);
    
    const progress = Math.round(((index + 1) / total) * 90); // Leave 10% for final cleanup
    await updateSyncStage(this.supabase, this.syncLogId, webinarId, 'processing_webinar', progress);

    try {
      // Step 1: Process webinar metadata with enhanced status detection
      console.log(`📋 Step 1: Processing webinar metadata for ${webinarId}`);
      const finalStatus = await this.determineWebinarStatus(webinarData);
      const webinarWithStatus = { ...webinarData, status: finalStatus };
      
      await saveWebinarToDatabase(this.supabase, webinarWithStatus, this.connectionId);
      console.log(`✅ Step 1 Complete: Webinar metadata saved with status: ${finalStatus}`);

      // Get database webinar ID for related data
      const dbWebinarId = await this.getWebinarDatabaseId(webinarId);
      if (!dbWebinarId) {
        throw new Error(`Failed to get database ID for webinar ${webinarId}`);
      }

      // Step 2: Process registrants
      await this.processRegistrants(webinarId, dbWebinarId);

      // Step 3: Process participants (attendees) - only for eligible webinars
      await this.processParticipants(webinarId, dbWebinarId, finalStatus, webinarWithStatus);

      // Step 4: Process polls
      await this.processPolls(webinarId, dbWebinarId);

      // Step 5: Process Q&A
      await this.processQA(webinarId, dbWebinarId);

      console.log(`🎉 WEBINAR ${index + 1} PROCESSING COMPLETE: ${webinarTitle}`);
      console.log(`Status: ${finalStatus}, Database ID: ${dbWebinarId}`);
      
    } catch (error) {
      console.error(`❌ WEBINAR ${index + 1} PROCESSING FAILED: ${webinarTitle}`);
      console.error(`Error: ${error.message}`);
      console.error(`Stack: ${error.stack}`);
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

  private async processRegistrants(webinarId: string, dbWebinarId: string): Promise<void> {
    console.log(`📝 Step 2: Processing registrants for webinar ${webinarId}`);
    
    try {
      const registrants = await this.client.getWebinarRegistrants(webinarId);
      console.log(`📊 Fetched ${registrants.length} registrants for webinar ${webinarId}`);
      
      if (registrants.length > 0) {
        await ParticipantDataProcessor.saveRegistrantsToDatabase(
          this.supabase, registrants, webinarId, this.connectionId
        );
        console.log(`✅ Step 2 Complete: ${registrants.length} registrants saved`);
      } else {
        console.log(`ℹ️ Step 2 Complete: No registrants to save`);
      }
    } catch (error) {
      console.error(`❌ Step 2 Failed: Registrants processing failed for ${webinarId}:`, error.message);
      // Don't throw - continue with other data types
    }
  }

  private async processParticipants(webinarId: string, dbWebinarId: string, status: string, webinarData: any): Promise<void> {
    console.log(`👥 Step 3: Processing participants for webinar ${webinarId}`);
    
    const shouldFetchParticipants = this.canWebinarHaveParticipantData(webinarData, status);
    
    if (!shouldFetchParticipants) {
      console.log(`ℹ️ Step 3 Skipped: Webinar ${webinarId} (status: ${status}) - participant data not available for this webinar type`);
      return;
    }
    
    console.log(`🎯 Step 3: Fetching participant data for webinar ${webinarId} (status: ${status})`);
    
    try {
      const participants = await this.client.getWebinarParticipants(webinarId);
      console.log(`📊 Fetched ${participants.length} participants for webinar ${webinarId}`);
      
      if (participants.length > 0) {
        await ParticipantDataProcessor.saveParticipantsToDatabase(
          this.supabase, participants, webinarId, this.connectionId
        );
        console.log(`✅ Step 3 Complete: ${participants.length} participants saved`);
      } else {
        console.log(`ℹ️ Step 3 Complete: No participants to save`);
      }
    } catch (error) {
      console.error(`❌ Step 3 Failed: Participants processing failed for ${webinarId}:`, error.message);
      
      if (error.message?.includes('does not contain scopes')) {
        console.error(`🔐 SCOPE ERROR: Missing required scope 'report:read:list_webinar_participants:admin' for participant data`);
      }
      // Don't throw - continue with other data types
    }
  }

  private async processPolls(webinarId: string, dbWebinarId: string): Promise<void> {
    console.log(`📊 Step 4: Processing polls for webinar ${webinarId}`);
    
    try {
      const polls = await this.client.getWebinarPolls(webinarId);
      console.log(`📊 Fetched ${polls.length} polls for webinar ${webinarId}`);
      
      if (polls.length > 0) {
        await ParticipantDataProcessor.savePollsToDatabase(
          this.supabase, polls, webinarId, this.connectionId
        );
        console.log(`✅ Step 4 Complete: ${polls.length} polls saved`);
      } else {
        console.log(`ℹ️ Step 4 Complete: No polls to save`);
      }
    } catch (error) {
      console.error(`❌ Step 4 Failed: Polls processing failed for ${webinarId}:`, error.message);
      // Don't throw - continue with other data types
    }
  }

  private async processQA(webinarId: string, dbWebinarId: string): Promise<void> {
    console.log(`❓ Step 5: Processing Q&A for webinar ${webinarId}`);
    
    try {
      const qa = await this.client.getWebinarQA(webinarId);
      console.log(`📊 Fetched ${qa.length} Q&A items for webinar ${webinarId}`);
      
      if (qa.length > 0) {
        await ParticipantDataProcessor.saveQAToDatabase(
          this.supabase, qa, webinarId, this.connectionId
        );
        console.log(`✅ Step 5 Complete: ${qa.length} Q&A items saved`);
      } else {
        console.log(`ℹ️ Step 5 Complete: No Q&A items to save`);
      }
    } catch (error) {
      console.error(`❌ Step 5 Failed: Q&A processing failed for ${webinarId}:`, error.message);
      // Don't throw - continue processing
    }
  }

  /**
   * Determine if a webinar can have participant data based on its status and timing
   */
  private canWebinarHaveParticipantData(webinar: any, status: string): boolean {
    // Only past/completed webinars can have participant data
    if (status === 'ended' || status === 'aborted') {
      return true;
    }
    
    // For webinars with timing info, check if they're in the past
    if (webinar.start_time) {
      const startTime = new Date(webinar.start_time);
      const now = new Date();
      const duration = webinar.duration || 60; // Default 60 minutes
      const endTime = new Date(startTime.getTime() + (duration * 60 * 1000));
      
      // If the webinar should have ended, try to get participant data
      if (endTime < now) {
        return true;
      }
    }
    
    return false;
  }
}
