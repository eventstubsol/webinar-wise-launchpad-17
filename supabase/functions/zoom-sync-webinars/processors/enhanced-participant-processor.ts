
/**
 * Enhanced participant sync with proper status mapping
 */
export async function syncWebinarParticipantsEnhanced(
  supabase: any,
  client: any,
  webinarId: string,
  webinarDbId: string,
  debugMode = false
): Promise<number> {
  console.log(`Syncing participants for webinar ${webinarId}`);
  
  try {
    // Fetch participants from Zoom API
    const participants = await client.getWebinarParticipants(webinarId, debugMode);
    
    if (!participants || participants.length === 0) {
      console.log(`No participants found for webinar ${webinarId}`);
      return 0;
    }
    
    console.log(`Found ${participants.length} participants for webinar ${webinarId}`);
    
    // Transform participant data with enhanced status mapping
    const transformedParticipants = participants.map(participant => {
      const transformed = transformParticipantWithEnhancedStatus(participant, webinarDbId, debugMode);
      return {
        ...transformed,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
    });
    
    // Upsert participants to database
    const { error } = await supabase
      .from('zoom_participants')
      .upsert(
        transformedParticipants,
        {
          onConflict: 'webinar_id,participant_id',
          ignoreDuplicates: false
        }
      );

    if (error) {
      console.error('Failed to upsert participants:', error);
      throw new Error(`Failed to upsert participants: ${error.message}`);
    }

    console.log(`Successfully synced ${participants.length} participants for webinar ${webinarId}`);
    return participants.length;
    
  } catch (error) {
    console.error(`Error syncing participants for webinar ${webinarId}:`, error);
    throw error;
  }
}

/**
 * Transform participant with enhanced status mapping
 */
function transformParticipantWithEnhancedStatus(apiParticipant: any, webinarDbId: string, debugMode = false): any {
  if (debugMode) {
    console.log(`DEBUG: Transforming enhanced participant ${apiParticipant.id || 'NO_ID'}`);
  }

  // Enhanced status mapping for participants
  let participantStatus = 'in_meeting'; // Default status
  
  if (apiParticipant.status) {
    const statusMap: { [key: string]: string } = {
      'in_meeting': 'in_meeting',
      'in_waiting_room': 'in_waiting_room',
      'left': 'in_meeting', // They were in meeting but left
      'joined': 'in_meeting',
      'attended': 'in_meeting',
      'no_show': 'in_waiting_room'
    };
    participantStatus = statusMap[apiParticipant.status.toLowerCase()] || 'in_meeting';
  }
  
  // If participant has timing data, they were definitely in the meeting
  if (apiParticipant.join_time && apiParticipant.leave_time) {
    participantStatus = 'in_meeting';
  }

  return {
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
}
