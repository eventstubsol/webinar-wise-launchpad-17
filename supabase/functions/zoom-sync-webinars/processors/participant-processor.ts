
import { updateSyncStage, updateWebinarParticipantSyncStatus } from '../database-operations.ts';
import { isWebinarEligibleForParticipantSync } from './participant-eligibility.ts';
import { transformParticipantForDatabase } from './participant-transformer.ts';
import { saveParticipantsToDatabase } from './participant-database.ts';

/**
 * Update webinar metrics after participant sync
 */
async function updateWebinarMetricsAfterParticipantSync(supabase: any, webinarDbId: string): Promise<void> {
  try {
    console.log(`📊 UPDATING METRICS after participant sync for webinar: ${webinarDbId}`);
    
    // Get participant metrics
    const { data: participants, error: participantsError } = await supabase
      .from('zoom_participants')
      .select('duration, join_time')
      .eq('webinar_id', webinarDbId);

    if (participantsError) {
      console.error('❌ Failed to fetch participants for metrics:', participantsError);
      return;
    }

    // Get registrant count
    const { count: registrantCount, error: registrantsError } = await supabase
      .from('zoom_registrants')
      .select('*', { count: 'exact', head: true })
      .eq('webinar_id', webinarDbId);

    if (registrantsError) {
      console.error('❌ Failed to fetch registrants count:', registrantsError);
      return;
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
        attendees_count: totalAttendees,
        registrants_count: totalRegistrants,
        updated_at: new Date().toISOString()
      })
      .eq('id', webinarDbId);

    if (updateError) {
      console.error('❌ Failed to update webinar metrics:', updateError);
      throw updateError;
    }

    console.log(`✅ METRICS UPDATED after participant sync for webinar ${webinarDbId}:`);
    console.log(`  👥 Attendees: ${totalAttendees}`);
    console.log(`  📝 Registrants: ${totalRegistrants}`);
    console.log(`  ⏱️ Total Minutes: ${totalMinutes}`);
    console.log(`  📊 Avg Duration: ${avgDuration}m`);
    console.log(`  ❌ Absentees: ${totalAbsentees}`);
  } catch (error) {
    console.error('❌ Error updating webinar metrics after participant sync:', error);
    // Don't throw - metrics update failure shouldn't fail the sync
  }
}

/**
 * Sync participants for a specific webinar with enhanced logging and eligibility checks
 * UPDATED: Now triggers metrics update after successful participant sync
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

    // Update status to indicate sync attempt is starting
    await updateWebinarParticipantSyncStatus(supabase, webinarDbId, 'pending');

    // Check if webinar is eligible for participant sync
    if (webinarData) {
      const eligibility = isWebinarEligibleForParticipantSync(webinarData, debugMode);
      
      if (!eligibility.eligible) {
        console.log(`SKIPPING participant sync for webinar ${webinarId}: ${eligibility.reason}`);
        
        // Update status to not_applicable for ineligible webinars
        await updateWebinarParticipantSyncStatus(supabase, webinarDbId, 'not_applicable', eligibility.reason);
        
        // Still update metrics for ineligible webinars (they might have registrants)
        await updateWebinarMetricsAfterParticipantSync(supabase, webinarDbId);
        
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
      
      // Update status to no_participants for webinars with no participants
      await updateWebinarParticipantSyncStatus(supabase, webinarDbId, 'no_participants', 'No participants found in API response');
      
      // Update metrics even if no participants (might have registrants)
      await updateWebinarMetricsAfterParticipantSync(supabase, webinarDbId);
      
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
      // Update status to failed if database save fails
      await updateWebinarParticipantSyncStatus(supabase, webinarDbId, 'failed', `Failed to save participants: ${saveResult.error?.message}`);
      throw new Error(`Failed to upsert participants: ${saveResult.error?.message}`);
    }

    const insertTime = Date.now() - startTime - fetchTime - transformTime;
    const totalTime = Date.now() - startTime;

    // Update status to synced on successful completion
    await updateWebinarParticipantSyncStatus(supabase, webinarDbId, 'synced');

    // CRITICAL FIX: Update metrics AFTER successful participant sync
    await updateWebinarMetricsAfterParticipantSync(supabase, webinarDbId);

    // Enhanced success logging
    console.log(`ENHANCED: Participant sync completed successfully for webinar ${webinarId}:`);
    console.log(`  - Participants processed: ${participants.length}`);
    console.log(`  - Database records affected: ${saveResult.data?.length || 'unknown'}`);
    console.log(`  - Fetch time: ${fetchTime}ms`);
    console.log(`  - Transform time: ${transformTime}ms`);
    console.log(`  - Insert time: ${insertTime}ms`);
    console.log(`  - Total time: ${totalTime}ms`);
    console.log(`  - Metrics updated: YES`);

    if (debugMode) {
      console.log(`DEBUG: Sync performance metrics:`);
      console.log(`  - Avg transform time per participant: ${(transformTime / participants.length).toFixed(2)}ms`);
      console.log(`  - Records per second: ${(participants.length / (totalTime / 1000)).toFixed(2)}`);
    }

    return { count: participants.length, skipped: false };
    
  } catch (error) {
    const totalTime = Date.now() - startTime;
    
    // Update status to failed on any error
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    await updateWebinarParticipantSyncStatus(supabase, webinarDbId, 'failed', errorMessage);
    
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
