
/**
 * Enhanced participant processing with comprehensive validation and bulletproof completion
 */
import { updateSyncStage } from '../database/index.ts';
import { updateWebinarParticipantSyncStatus } from '../database/index.ts';

export async function processWebinarParticipants(
  supabase: any,
  client: any,
  webinarData: any,
  webinarDbId: string,
  connectionId: string,
  syncLogId: string
): Promise<{ participantCount: number; registrantCount: number; validationFlags: string[] }> {
  console.log(`🔄 Enhanced processWebinarParticipants for webinar ${webinarData.id}`);
  
  try {
    const zoomWebinarId = webinarData.id;
    const validationFlags: string[] = [];
    
    // Update sync stage
    await updateSyncStage(supabase, syncLogId, webinarDbId, 'fetching_participants', 0);
    
    // Process participants
    const participantCount = await processParticipantData(
      supabase, 
      client, 
      zoomWebinarId, 
      webinarDbId, 
      connectionId,
      validationFlags
    );
    
    // Process registrants
    const registrantCount = await processRegistrantData(
      supabase, 
      client, 
      zoomWebinarId, 
      webinarDbId, 
      connectionId,
      validationFlags
    );
    
    // Update participant sync status
    await updateWebinarParticipantSyncStatus(
      supabase,
      webinarDbId,
      'synced',
      null,
      { participantCount, registrantCount, validationFlags }
    );
    
    console.log(`✅ Enhanced processWebinarParticipants completed - Participants: ${participantCount}, Registrants: ${registrantCount}`);
    
    return { participantCount, registrantCount, validationFlags };
    
  } catch (error) {
    console.error(`❌ Enhanced processWebinarParticipants failed for webinar ${webinarData.id}:`, error);
    
    await updateWebinarParticipantSyncStatus(
      supabase,
      webinarDbId,
      'failed',
      error.message
    );
    
    throw error;
  }
}

async function processParticipantData(
  supabase: any,
  client: any,
  zoomWebinarId: string,
  webinarDbId: string,
  connectionId: string,
  validationFlags: string[]
): Promise<number> {
  try {
    // Fetch participants from Zoom API
    const participants = await client.getWebinarParticipants(zoomWebinarId);
    
    if (!participants || participants.length === 0) {
      validationFlags.push('no_participants');
      return 0;
    }
    
    // Process each participant
    let processedCount = 0;
    for (const participant of participants) {
      try {
        await saveParticipantToDatabase(supabase, participant, webinarDbId, connectionId);
        processedCount++;
      } catch (error) {
        console.error(`Failed to save participant ${participant.id}:`, error);
        validationFlags.push(`participant_save_error_${participant.id}`);
      }
    }
    
    return processedCount;
  } catch (error) {
    console.error('Failed to process participant data:', error);
    validationFlags.push('participant_fetch_error');
    return 0;
  }
}

async function processRegistrantData(
  supabase: any,
  client: any,
  zoomWebinarId: string,
  webinarDbId: string,
  connectionId: string,
  validationFlags: string[]
): Promise<number> {
  try {
    // Fetch registrants from Zoom API
    const registrants = await client.getWebinarRegistrants(zoomWebinarId);
    
    if (!registrants || registrants.length === 0) {
      validationFlags.push('no_registrants');
      return 0;
    }
    
    // Process each registrant
    let processedCount = 0;
    for (const registrant of registrants) {
      try {
        await saveRegistrantToDatabase(supabase, registrant, webinarDbId, connectionId);
        processedCount++;
      } catch (error) {
        console.error(`Failed to save registrant ${registrant.id}:`, error);
        validationFlags.push(`registrant_save_error_${registrant.id}`);
      }
    }
    
    return processedCount;
  } catch (error) {
    console.error('Failed to process registrant data:', error);
    validationFlags.push('registrant_fetch_error');
    return 0;
  }
}

async function saveParticipantToDatabase(
  supabase: any,
  participant: any,
  webinarDbId: string,
  connectionId: string
): Promise<void> {
  const { error } = await supabase
    .from('zoom_participants')
    .upsert({
      connection_id: connectionId,
      webinar_id: webinarDbId,
      zoom_participant_id: participant.id,
      name: participant.name,
      email: participant.email,
      join_time: participant.join_time,
      leave_time: participant.leave_time,
      duration: participant.duration,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });

  if (error) {
    throw new Error(`Failed to save participant: ${error.message}`);
  }
}

async function saveRegistrantToDatabase(
  supabase: any,
  registrant: any,
  webinarDbId: string,
  connectionId: string
): Promise<void> {
  const { error } = await supabase
    .from('zoom_registrants')
    .upsert({
      connection_id: connectionId,
      webinar_id: webinarDbId,
      zoom_registrant_id: registrant.id,
      email: registrant.email,
      first_name: registrant.first_name,
      last_name: registrant.last_name,
      registration_time: registrant.registration_time,
      status: registrant.status,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });

  if (error) {
    throw new Error(`Failed to save registrant: ${error.message}`);
  }
}
