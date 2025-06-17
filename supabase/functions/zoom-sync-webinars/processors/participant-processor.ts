
import { updateSyncStage } from '../database-operations.ts';

/**
 * Sync participants for a specific webinar with enhanced logging
 */
export async function syncWebinarParticipants(
  supabase: any,
  client: any,
  webinarId: string,
  webinarDbId: string,
  debugMode = false
): Promise<number> {
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
      
      return 0;
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

    // Enhanced logging: Log database insertion details
    console.log(`ENHANCED: Preparing database insertion for ${transformedParticipants.length} participants`);
    
    if (debugMode) {
      console.log(`DEBUG: Database insertion details:`);
      console.log(`  - Table: zoom_participants`);
      console.log(`  - Conflict resolution: webinar_id,participant_id`);
      console.log(`  - Operation: upsert`);
      console.log(`  - Sample payload structure:`, Object.keys(transformedParticipants[0] || {}));
    }

    // Upsert participants to database
    const { error, data } = await supabase
      .from('zoom_participants')
      .upsert(
        transformedParticipants,
        {
          onConflict: 'webinar_id,participant_id',
          ignoreDuplicates: false
        }
      )
      .select('id');

    const insertTime = Date.now() - startTime - fetchTime - transformTime;
    const totalTime = Date.now() - startTime;

    if (error) {
      console.error('ENHANCED: Database insertion failed for participants:', {
        error: error,
        webinarId: webinarId,
        participantCount: transformedParticipants.length,
        timeSpent: totalTime
      });
      
      if (debugMode) {
        console.log(`DEBUG: Database error details:`, JSON.stringify(error, null, 2));
        console.log(`DEBUG: Failed payload sample:`, JSON.stringify(transformedParticipants[0], null, 2));
      }
      
      throw new Error(`Failed to upsert participants: ${error.message}`);
    }

    // Enhanced success logging
    console.log(`ENHANCED: Participant sync completed successfully for webinar ${webinarId}:`);
    console.log(`  - Participants processed: ${participants.length}`);
    console.log(`  - Database records affected: ${data?.length || 'unknown'}`);
    console.log(`  - Fetch time: ${fetchTime}ms`);
    console.log(`  - Transform time: ${transformTime}ms`);
    console.log(`  - Insert time: ${insertTime}ms`);
    console.log(`  - Total time: ${totalTime}ms`);

    if (debugMode) {
      console.log(`DEBUG: Sync performance metrics:`);
      console.log(`  - Avg transform time per participant: ${(transformTime / participants.length).toFixed(2)}ms`);
      console.log(`  - Records per second: ${(participants.length / (totalTime / 1000)).toFixed(2)}`);
    }

    return participants.length;
    
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

/**
 * Transform Zoom API participant to database format with enhanced logging
 */
function transformParticipantForDatabase(apiParticipant: any, webinarDbId: string, debugMode = false): any {
  if (debugMode) {
    console.log(`DEBUG: Starting participant transformation:`);
    console.log(`  - Input participant ID: ${apiParticipant.id || apiParticipant.participant_id || 'MISSING'}`);
    console.log(`  - Input participant name: ${apiParticipant.name || apiParticipant.participant_name || 'MISSING'}`);
    console.log(`  - Input participant email: ${apiParticipant.user_email || apiParticipant.participant_email || apiParticipant.email || 'MISSING'}`);
  }

  // Map Zoom API status to database participant_status enum
  let participantStatus = 'in_meeting'; // Default status
  
  if (debugMode) {
    console.log(`  - Original status: ${apiParticipant.status || 'MISSING'}`);
  }
  
  // If participant has join_time but no leave_time, they might still be in meeting
  // If they have both join_time and leave_time, they were in meeting and left
  // For simplicity in this sync, we'll mark all as 'in_meeting' since they participated
  if (apiParticipant.status) {
    const statusMap: { [key: string]: string } = {
      'in_meeting': 'in_meeting',
      'in_waiting_room': 'in_waiting_room',
      'left': 'in_meeting', // They were in meeting but left
      'joined': 'in_meeting'
    };
    participantStatus = statusMap[apiParticipant.status.toLowerCase()] || 'in_meeting';
  }

  // Enhanced timing logic
  const hasJoinTime = !!apiParticipant.join_time;
  const hasLeaveTime = !!apiParticipant.leave_time;
  
  if (debugMode) {
    console.log(`  - Timing data: join=${hasJoinTime}, leave=${hasLeaveTime}`);
    console.log(`  - Join time: ${apiParticipant.join_time || 'MISSING'}`);
    console.log(`  - Leave time: ${apiParticipant.leave_time || 'MISSING'}`);
    console.log(`  - Duration: ${apiParticipant.duration || 'MISSING'}`);
  }

  // If participant has timing data, they were definitely in the meeting
  if (hasJoinTime && hasLeaveTime) {
    participantStatus = 'in_meeting';
  }

  const transformed = {
    webinar_id: webinarDbId,
    participant_id: apiParticipant.id || apiParticipant.participant_id,
    registrant_id: apiParticipant.registrant_id || null,
    participant_name: apiParticipant.name || apiParticipant.participant_name || null,
    participant_email: apiParticipant.user_email || apiParticipant.participant_email || apiParticipant.email || null,
    participant_user_id: apiParticipant.user_id || null,
    join_time: apiParticipant.join_time || null,
    leave_time: apiParticipant.leave_time || null,
    duration: apiParticipant.duration || null,
    attentiveness_score: apiParticipant.attentiveness_score || null,
    camera_on_duration: apiParticipant.camera_on_duration || null,
    share_application_duration: apiParticipant.share_application_duration || null,
    share_desktop_duration: apiParticipant.share_desktop_duration || null,
    posted_chat: apiParticipant.posted_chat || false,
    raised_hand: apiParticipant.raised_hand || false,
    answered_polling: apiParticipant.answered_polling || false,
    asked_question: apiParticipant.asked_question || false,
    device: apiParticipant.device || null,
    ip_address: apiParticipant.ip_address ? String(apiParticipant.ip_address) : null,
    location: apiParticipant.location || null,
    network_type: apiParticipant.network_type || null,
    version: apiParticipant.version || null,
    customer_key: apiParticipant.customer_key || null,
    participant_status: participantStatus
  };

  if (debugMode) {
    console.log(`  - Mapped status: ${participantStatus}`);
    console.log(`  - Transformation completed with ${Object.keys(transformed).length} fields`);
    console.log(`  - Required fields check:`);
    console.log(`    * webinar_id: ${transformed.webinar_id ? 'OK' : 'MISSING'}`);
    console.log(`    * participant_id: ${transformed.participant_id ? 'OK' : 'MISSING'}`);
    console.log(`    * participant_status: ${transformed.participant_status ? 'OK' : 'MISSING'}`);
  }

  return transformed;
}
