
import { updateSyncStage } from '../database-operations.ts';
import { isWebinarEligibleForParticipantSync } from './participant-eligibility.ts';
import { transformParticipantForDatabase } from './participant-transformer.ts';
import { saveParticipantsToDatabase } from './participant-database.ts';

/**
 * Sync participants for a specific webinar with enhanced logging and eligibility checks
 */
export async function syncWebinarParticipants(
  supabase: any,
  client: any,
  webinarId: string,
  webinarDbId: string,
  webinarData?: any,
  debugMode = false
): Promise<{ count: number; skipped: boolean; reason?: string }> {
  const startTime = Date.now();
  console.log(`${debugMode ? 'DEBUG: ' : ''}Starting participant sync for webinar ${webinarId}`);
  
  try {
    // Enhanced logging: Log sync initiation
    if (debugMode) {
      console.log(`DEBUG: Sync parameters:`);
      console.log(`  - webinarId: ${webinarId}`);
      console.log(`  - webinarDbId: ${webinarDbId}`);
      console.log(`  - debugMode: ${debugMode}`);
      console.log(`  - API client type: ${client.constructor.name}`);
      console.log(`  - Webinar data provided: ${!!webinarData}`);
    }

    // Check if webinar is eligible for participant sync
    if (webinarData) {
      const eligibility = isWebinarEligibleForParticipantSync(webinarData, debugMode);
      
      if (!eligibility.eligible) {
        console.log(`SKIPPING participant sync for webinar ${webinarId}: ${eligibility.reason}`);
        
        if (debugMode) {
          console.log(`DEBUG: Webinar eligibility check failed:`);
          console.log(`  - Reason: ${eligibility.reason}`);
          console.log(`  - Webinar data:`, JSON.stringify(webinarData, null, 2));
        }
        
        return { count: 0, skipped: true, reason: eligibility.reason };
      } else {
        console.log(`PROCEEDING with participant sync for webinar ${webinarId} - eligibility confirmed`);
        
        if (debugMode) {
          console.log(`DEBUG: Webinar passed eligibility check`);
        }
      }
    } else {
      console.log(`WARNING: No webinar data provided for eligibility check, proceeding with participant sync for webinar ${webinarId}`);
    }

    // Fetch participants from Zoom API with debug mode
    console.log(`ENHANCED: Initiating participants fetch for webinar ${webinarId}`);
    const participants = await client.getWebinarParticipants(webinarId, debugMode);
    
    const fetchTime = Date.now() - startTime;
    console.log(`ENHANCED: Participants fetch completed in ${fetchTime}ms`);
    
    if (!participants || participants.length === 0) {
      console.log(`ENHANCED: No participants found for webinar ${webinarId} (${participants ? 'empty array' : 'null/undefined result'})`);
      
      if (debugMode) {
        console.log(`DEBUG: Participants result type: ${typeof participants}`);
        console.log(`DEBUG: Participants value: ${JSON.stringify(participants)}`);
      }
      
      return { count: 0, skipped: false, reason: 'No participants found in API response' };
    }
    
    console.log(`ENHANCED: Processing ${participants.length} participants for webinar ${webinarId}`);
    
    // Enhanced logging: Log raw API response structure
    if (debugMode) {
      console.log(`DEBUG: Raw participants API response analysis:`);
      console.log(`  - Total participants: ${participants.length}`);
      console.log(`  - First participant keys: [${Object.keys(participants[0] || {}).join(', ')}]`);
      console.log(`  - Sample participant data:`, JSON.stringify(participants[0], null, 2));
    }

    // Log detailed transformation for each participant
    const transformedParticipants = participants.map((participant, index) => {
      if (debugMode && index < 3) { // Log first 3 participants in debug mode
        console.log(`DEBUG: Transforming participant ${index + 1}/${participants.length}:`);
        console.log(`  - Raw data:`, JSON.stringify(participant, null, 2));
      }

      const transformed = transformParticipantForDatabase(participant, webinarDbId, debugMode);
      
      if (debugMode && index < 3) {
        console.log(`  - Transformed data:`, JSON.stringify(transformed, null, 2));
      }

      const final = {
        ...transformed,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      if (debugMode && index < 3) {
        console.log(`  - Final database payload:`, JSON.stringify(final, null, 2));
      }

      return final;
    });
    
    const transformTime = Date.now() - startTime - fetchTime;
    console.log(`ENHANCED: Participant transformation completed in ${transformTime}ms`);

    // Save to database
    const saveResult = await saveParticipantsToDatabase(supabase, transformedParticipants, webinarId, debugMode);
    
    if (!saveResult.success) {
      throw new Error(`Failed to upsert participants: ${saveResult.error?.message}`);
    }

    const insertTime = Date.now() - startTime - fetchTime - transformTime;
    const totalTime = Date.now() - startTime;

    // Enhanced success logging
    console.log(`ENHANCED: Participant sync completed successfully for webinar ${webinarId}:`);
    console.log(`  - Participants processed: ${participants.length}`);
    console.log(`  - Database records affected: ${saveResult.data?.length || 'unknown'}`);
    console.log(`  - Fetch time: ${fetchTime}ms`);
    console.log(`  - Transform time: ${transformTime}ms`);
    console.log(`  - Insert time: ${insertTime}ms`);
    console.log(`  - Total time: ${totalTime}ms`);

    if (debugMode) {
      console.log(`DEBUG: Sync performance metrics:`);
      console.log(`  - Avg transform time per participant: ${(transformTime / participants.length).toFixed(2)}ms`);
      console.log(`  - Records per second: ${(participants.length / (totalTime / 1000)).toFixed(2)}`);
    }

    return { count: participants.length, skipped: false };
    
  } catch (error) {
    const totalTime = Date.now() - startTime;
    
    console.error(`ENHANCED: Participant sync failed for webinar ${webinarId}:`);
    console.error(`  - Error type: ${error.constructor.name}`);
    console.error(`  - Error message: ${error.message}`);
    console.error(`  - Time spent: ${totalTime}ms`);
    console.error(`  - Full error:`, {
      name: error.name,
      message: error.message,
      stack: error.stack,
      type: error.type,
      status: error.status,
      details: error.details
    });
    
    if (debugMode) {
      console.log(`DEBUG: Exception caught in syncWebinarParticipants`);
      console.log(`DEBUG: Error occurred after ${totalTime}ms`);
      console.log(`DEBUG: Error object properties:`, Object.getOwnPropertyNames(error));
    }
    
    throw error;
  }
}
