
import { updateSyncStage } from '../database-operations.ts';

/**
 * Sync participants for a specific webinar
 */
export async function syncWebinarParticipants(
  supabase: any,
  client: any,
  webinarId: string,
  webinarDbId: string
): Promise<number> {
  console.log(`Syncing participants for webinar ${webinarId}`);
  
  try {
    // Fetch participants from Zoom API
    const participants = await client.getWebinarParticipants(webinarId);
    
    if (!participants || participants.length === 0) {
      console.log(`No participants found for webinar ${webinarId}`);
      return 0;
    }
    
    console.log(`Found ${participants.length} participants for webinar ${webinarId}`);
    
    // Transform participant data to match database schema
    const transformedParticipants = participants.map(participant => {
      const transformed = transformParticipantForDatabase(participant, webinarDbId);
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
 * Transform Zoom API participant to database format
 */
function transformParticipantForDatabase(apiParticipant: any, webinarDbId: string): any {
  // Map Zoom API status to database participant_status enum
  let participantStatus = 'in_meeting'; // Default status
  
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
