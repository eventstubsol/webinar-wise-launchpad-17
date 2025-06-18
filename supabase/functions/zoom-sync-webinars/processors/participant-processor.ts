import { updateSyncStage, updateWebinarParticipantSyncStatus } from '../database-operations.ts';
import { isWebinarEligibleForParticipantSync } from './participant-eligibility.ts';
import { transformParticipantForDatabase } from './participant-transformer.ts';
import { saveParticipantsToDatabase } from './participant-database.ts';

/**
 * FIXED: Status-aware participant sync with proper eligibility handling
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
  console.log(`🎯 FIXED: Starting participant sync for webinar ${webinarId}`);
  
  try {
    // Update status to indicate sync attempt is starting
    await updateWebinarParticipantSyncStatus(supabase, webinarDbId, 'pending');

    // FIXED: Status-aware eligibility check
    if (webinarData) {
      const eligibility = isWebinarEligibleForParticipantSync(webinarData, debugMode);
      
      if (!eligibility.eligible) {
        console.log(`❌ SKIPPING participant sync for webinar ${webinarId}: ${eligibility.reason}`);
        
        // FIXED: Better status mapping based on eligibility source
        let statusToSet = 'not_applicable';
        const eligibilitySource = eligibility.diagnostics?.eligibilitySource;
        
        if (eligibilitySource === 'status') {
          // Status-based decisions are definitive
          if (eligibility.diagnostics?.isFutureEvent) {
            statusToSet = 'not_applicable';
          }
        } else if (eligibilitySource === 'time') {
          // Time-based decisions may change
          if (eligibility.diagnostics?.isFutureWebinar) {
            statusToSet = 'not_applicable';
          } else if (eligibility.diagnostics?.isRecentWebinar) {
            statusToSet = 'pending'; // Will become eligible soon
          }
        }
        
        await updateWebinarParticipantSyncStatus(supabase, webinarDbId, statusToSet, eligibility.reason);
        
        if (debugMode) {
          console.log(`DEBUG: Webinar eligibility check failed:`);
          console.log(`  - Reason: ${eligibility.reason}`);
          console.log(`  - Diagnostics:`, eligibility.diagnostics);
        }
        
        return { count: 0, skipped: true, reason: eligibility.reason };
      } else {
        console.log(`✅ PROCEEDING with participant sync for webinar ${webinarId} - eligibility confirmed`);
        console.log(`  - Eligibility source: ${eligibility.diagnostics?.eligibilitySource}`);
        
        if (debugMode) {
          console.log(`DEBUG: Webinar passed eligibility check`);
          console.log(`  - Diagnostics:`, eligibility.diagnostics);
        }
      }
    } else {
      console.log(`⚠️ WARNING: No webinar data provided for eligibility check, proceeding with participant sync for webinar ${webinarId}`);
    }

    // ENHANCED: Fetch participants using past_webinars endpoint
    console.log(`🎯 ENHANCED: Initiating participants fetch for webinar ${webinarId} using past_webinars endpoint`);
    const participants = await client.getWebinarParticipants(webinarId, debugMode);
    
    const fetchTime = Date.now() - startTime;
    console.log(`✅ ENHANCED: Participants fetch completed in ${fetchTime}ms`);
    
    if (!participants || participants.length === 0) {
      console.log(`📭 ENHANCED: No participants found for webinar ${webinarId} (${participants ? 'empty array' : 'null/undefined result'})`);
      
      // FIXED: Distinguish between "no participants" vs "not eligible"
      const webinarStatus = webinarData?.status?.toLowerCase();
      if (['finished', 'ended', 'completed'].includes(webinarStatus)) {
        // Finished webinar with no participants - this is valid data
        await updateWebinarParticipantSyncStatus(supabase, webinarDbId, 'no_participants', 'Webinar completed but no participants found in API response');
      } else {
        // Other cases might be eligibility issues
        await updateWebinarParticipantSyncStatus(supabase, webinarDbId, 'failed', 'No participants found - webinar may not be eligible for participant sync yet');
      }
      
      if (debugMode) {
        console.log(`DEBUG: Participants result type: ${typeof participants}`);
        console.log(`DEBUG: Participants value: ${JSON.stringify(participants)}`);
        console.log(`DEBUG: Webinar status: ${webinarStatus}`);
      }
      
      return { count: 0, skipped: false, reason: 'No participants found in API response' };
    }
    
    console.log(`✅ ENHANCED: Processing ${participants.length} participants for webinar ${webinarId}`);
    
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
    console.log(`✅ ENHANCED: Participant transformation completed in ${transformTime}ms`);

    // Save to database
    const saveResult = await saveParticipantsToDatabase(supabase, transformedParticipants, webinarId, debugMode);
    
    if (!saveResult.success) {
      // Update status to failed if database save fails
      await updateWebinarParticipantSyncStatus(supabase, webinarDbId, 'failed', `Failed to save participants: ${saveResult.error?.message}`);
      throw new Error(`Failed to upsert participants: ${saveResult.error?.message}`);
    }

    const insertTime = Date.now() - startTime - fetchTime - transformTime;
    const totalTime = Date.now() - startTime;

    // Update status to synced on successful completion
    await updateWebinarParticipantSyncStatus(supabase, webinarDbId, 'synced');

    // Enhanced success logging
    console.log(`✅ ENHANCED: Participant sync completed successfully for webinar ${webinarId}:`);
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
    
    // ENHANCED: Better error categorization for status updates
    let errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    let statusToSet = 'failed';
    
    // Check if it's an authentication/scope error
    if (errorMessage.includes('Scope Error') || errorMessage.includes('Authentication expired')) {
      statusToSet = 'failed';
      errorMessage = `API Access Error: ${errorMessage}`;
    } else if (errorMessage.includes('404') || errorMessage.includes('not found')) {
      // 404 could mean webinar not available for participant sync yet
      statusToSet = 'failed';
      errorMessage = `Webinar not found for participant sync: ${errorMessage}`;
    }
    
    await updateWebinarParticipantSyncStatus(supabase, webinarDbId, statusToSet, errorMessage);
    
    console.error(`❌ ENHANCED: Participant sync failed for webinar ${webinarId}:`);
    console.error(`  - Error type: ${error.constructor.name}`);
    console.error(`  - Error message: ${errorMessage}`);
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
