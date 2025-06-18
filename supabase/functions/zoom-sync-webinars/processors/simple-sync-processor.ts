/**
 * Simple sync processor that fetches webinars and related data from Zoom API
 * and stores it in Supabase.
 */

import { createZoomAPIClient } from '../zoom-api-client.ts';
import { syncWebinarRegistrants } from './registrant-processor.ts';

/**
 * Fetches webinar details from Zoom API
 */
async function fetchWebinarDetails(client: any, webinarId: string): Promise<any> {
  try {
    const webinar = await client.getWebinar(webinarId);
    return webinar;
  } catch (error) {
    console.error(`Error fetching webinar details for ${webinarId}:`, error);
    throw error;
  }
}

/**
 * Fetches webinar participants from Zoom API
 */
async function fetchWebinarParticipants(client: any, webinarId: string): Promise<any[]> {
  try {
    const participants = await client.getWebinarParticipants(webinarId);
    return participants;
  } catch (error) {
    console.error(`Error fetching webinar participants for ${webinarId}:`, error);
    return [];
  }
}

/**
 * Fetches webinar polls from Zoom API
 */
async function fetchWebinarPolls(client: any, webinarId: string): Promise<any[]> {
  try {
    const polls = await client.getWebinarPolls(webinarId);
    return polls;
  } catch (error) {
    console.error(`Error fetching webinar polls for ${webinarId}:`, error);
    return [];
  }
}

/**
 * Fetches webinar Q&A from Zoom API
 */
async function fetchWebinarQA(client: any, webinarId: string): Promise<any[]> {
  try {
    const qa = await client.getWebinarQA(webinarId);
    return qa;
  } catch (error) {
    console.error(`Error fetching webinar Q&A for ${webinarId}:`, error);
    return [];
  }
}

/**
 * Stores webinar details in Supabase
 */
async function storeWebinarDetails(supabase: any, webinar: any): Promise<string> {
  try {
    const { data, error } = await supabase
      .from('zoom_webinars')
      .upsert({
        id: webinar.id,
        uuid: webinar.uuid,
        host_id: webinar.host_id,
        topic: webinar.topic,
        type: webinar.type,
        start_time: webinar.start_time,
        duration: webinar.duration,
        timezone: webinar.timezone,
        created_at: webinar.created_at,
        join_url: webinar.join_url
      })
      .select('id')
      .single();

    if (error) {
      console.error('Error storing webinar details:', error);
      throw error;
    }

    return data.id;
  } catch (error) {
    console.error('Error storing webinar details:', error);
    throw error;
  }
}

/**
 * Stores webinar participants in Supabase
 */
async function storeWebinarParticipants(supabase: any, webinarDbId: string, participants: any[]): Promise<void> {
  try {
    const participantsToInsert = participants.map(participant => ({
      webinar_id: webinarDbId,
      user_id: participant.user_id,
      name: participant.name,
      user_email: participant.user_email,
      join_time: participant.join_time,
      leave_time: participant.leave_time,
      duration: participant.duration
    }));

    const { error } = await supabase
      .from('zoom_participants')
      .upsert(participantsToInsert);

    if (error) {
      console.error('Error storing webinar participants:', error);
      throw error;
    }
  } catch (error) {
    console.error('Error storing webinar participants:', error);
    throw error;
  }
}

/**
 * Stores webinar polls in Supabase
 */
async function storeWebinarPolls(supabase: any, webinarDbId: string, polls: any[]): Promise<void> {
  try {
    const pollsToInsert = polls.map(poll => ({
      webinar_id: webinarDbId,
      question_id: poll.question_id,
      question: poll.question,
      answers: JSON.stringify(poll.answers)
    }));

    const { error } = await supabase
      .from('zoom_polls')
      .upsert(pollsToInsert);

    if (error) {
      console.error('Error storing webinar polls:', error);
      throw error;
    }
  } catch (error) {
    console.error('Error storing webinar polls:', error);
    throw error;
  }
}

/**
 * Stores webinar Q&A in Supabase
 */
async function storeWebinarQA(supabase: any, webinarDbId: string, qa: any[]): Promise<void> {
  try {
    const qaToInsert = qa.map(q => ({
      webinar_id: webinarDbId,
      question_id: q.question_id,
      question: q.question,
      answer: q.answer
    }));

    const { error } = await supabase
      .from('zoom_q_and_a')
      .upsert(qaToInsert);

    if (error) {
      console.error('Error storing webinar Q&A:', error);
      throw error;
    }
  } catch (error) {
    console.error('Error storing webinar Q&A:', error);
    throw error;
  }
}

/**
 * Enhanced sync processor with proper client verification and comprehensive logging
 */
export async function processWebinarSyncEnhanced(
  webinar: any,
  supabase: any,
  client: any,
  syncLogId: string,
  progressTracker: any,
  testMode: boolean = false
): Promise<void> {
  const webinarId = webinar.id;
  
  // Verify we're using the correct client with proper pagination
  console.log(`🔧 CLIENT VERIFICATION for webinar ${webinarId}:`);
  console.log(`  - Client type: ${client.constructor?.name || 'Unknown'}`);
  console.log(`  - Has getWebinarRegistrants: ${typeof client.getWebinarRegistrants === 'function'}`);
  console.log(`  - Has makeRequest: ${typeof client.makeRequest === 'function'}`);
  console.log(`  - Client access token length: ${client.accessToken?.length || 0}`);
  
  try {
    console.log(`Starting enhanced sync for webinar ${webinarId}`);
    
    await progressTracker.updateSyncStage(syncLogId, webinarId, 'fetching_webinar_details', 10);

    console.log(`Fetching webinar details for ${webinarId}`);
    const webinarDetails = await fetchWebinarDetails(client, webinarId);
    console.log(`Webinar details:`, webinarDetails);

    await progressTracker.updateSyncStage(syncLogId, webinarId, 'storing_webinar_details', 25);

    console.log(`Storing webinar details for ${webinarId}`);
    const webinarDbId = await storeWebinarDetails(supabase, webinarDetails);
    console.log(`Webinar stored with ID: ${webinarDbId}`);

    await progressTracker.updateSyncStage(syncLogId, webinarId, 'fetching_participants', 50);

    console.log(`Starting participant sync for webinar ${webinarId}`);
    const participants = await fetchWebinarParticipants(client, webinarId);
    console.log(`Fetched ${participants.length} participants for webinar ${webinarId}`);

    await progressTracker.updateSyncStage(syncLogId, webinarId, 'storing_participants', 65);

    console.log(`Storing participants for webinar ${webinarId}`);
    await storeWebinarParticipants(supabase, webinarDbId, participants);
    console.log(`Participants stored for webinar ${webinarId}`);

    await progressTracker.updateSyncStage(syncLogId, webinarId, 'syncing_participants', 73);

    console.log(`Starting participant sync for webinar ${webinarId}`);
    
    await progressTracker.updateSyncStage(syncLogId, webinarId, 'syncing_registrants', 78);

    console.log(`🎯 ENHANCED REGISTRANT SYNC: Starting registrant sync for webinar ${webinarId}`);
    console.log(`🔧 USING CLIENT: ${client.constructor?.name || 'Unknown'} with proper pagination`);
    
    // Use the enhanced registrant sync with the main ZoomAPIClient
    const registrantCount = await syncWebinarRegistrants(
      supabase,
      client, // This is the main ZoomAPIClient with proper pagination from zoom-api-client.ts
      webinar.id,
      webinarDbId,
      testMode
    );

    console.log(`✅ REGISTRANT SYNC COMPLETED: ${registrantCount} registrants synced for webinar ${webinarId}`);

    await progressTracker.updateSyncStage(syncLogId, webinarId, 'fetching_polls', 80);

    console.log(`Starting poll sync for webinar ${webinarId}`);
    const polls = await fetchWebinarPolls(client, webinarId);
    console.log(`Fetched ${polls.length} polls for webinar ${webinarId}`);

    await progressTracker.updateSyncStage(syncLogId, webinarId, 'storing_polls', 85);

    console.log(`Storing polls for webinar ${webinarId}`);
    await storeWebinarPolls(supabase, webinarDbId, polls);
    console.log(`Polls stored for webinar ${webinarId}`);

    await progressTracker.updateSyncStage(syncLogId, webinarId, 'fetching_q_and_a', 90);

    console.log(`Starting Q&A sync for webinar ${webinarId}`);
    const qa = await fetchWebinarQA(client, webinarId);
    console.log(`Fetched ${qa.length} Q&A entries for webinar ${webinarId}`);

    await progressTracker.updateSyncStage(syncLogId, webinarId, 'storing_q_and_a', 95);

    console.log(`Storing Q&A for webinar ${webinarId}`);
    await storeWebinarQA(supabase, webinarDbId, qa);
    console.log(`Q&A stored for webinar ${webinarId}`);

    await progressTracker.updateSyncStage(syncLogId, webinarId, 'completed', 100);

    console.log(`✅ Enhanced sync completed for webinar ${webinarId}`);
    
  } catch (error) {
    console.error(`💥 Enhanced sync error for webinar ${webinarId}:`, error);
    await progressTracker.logWebinarCompletion(syncLogId, webinarId, false, error.message);
    throw error;
  }
}
