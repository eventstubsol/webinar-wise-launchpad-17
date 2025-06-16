
import { createZoomAPIClient } from './zoom-api-client.ts';
import { updateSyncLog, updateSyncStage, saveWebinarToDatabase } from './database-operations.ts';
import { EnhancedStatusDetector } from './enhanced-status-detector.ts';

export async function processBackgroundSync(supabase: any, syncOperation: any, connection: any, syncLogId: string) {
  console.log(`=== Background Sync Processor Start ===`);
  console.log(`Sync ID: ${syncLogId}, Type: ${syncOperation.syncType}, Connection: ${connection.id}`);
  
  const startTime = Date.now();
  let heartbeatInterval: number | null = null;
  
  try {
    // Start heartbeat to keep sync alive
    heartbeatInterval = setInterval(async () => {
      try {
        await updateSyncLog(supabase, syncLogId, {
          updated_at: new Date().toISOString()
        });
        console.log(`Heartbeat sent for sync ${syncLogId}`);
      } catch (error) {
        console.error('Heartbeat failed:', error);
      }
    }, 30000); // Every 30 seconds
    
    const client = await createZoomAPIClient(connection, supabase);
    
    await updateSyncStage(supabase, syncLogId, null, 'fetching_webinars', 0);
    
    let webinars: any[] = [];
    const now = new Date();
    
    if (syncOperation.syncType === 'initial') {
      console.log('Starting initial sync - fetching comprehensive webinar data');
      
      // For initial sync, get both past and upcoming webinars with extended range
      const pastDate = new Date(now.getTime() - (90 * 24 * 60 * 60 * 1000)); // 90 days ago
      const futureDate = new Date(now.getTime() + (90 * 24 * 60 * 60 * 1000)); // 90 days future
      
      console.log(`Fetching webinars from ${pastDate.toISOString()} to ${futureDate.toISOString()}`);
      
      const [pastWebinars, upcomingWebinars] = await Promise.all([
        client.listWebinarsWithRange({
          from: pastDate,
          to: now,
          type: 'past'
        }),
        client.listWebinarsWithRange({
          from: now,
          to: futureDate,
          type: 'upcoming'
        })
      ]);
      
      webinars = [...pastWebinars, ...upcomingWebinars];
      console.log(`Initial sync found: ${pastWebinars.length} past + ${upcomingWebinars.length} upcoming = ${webinars.length} total webinars`);
    } else {
      console.log('Starting incremental sync - fetching recent webinar updates');
      
      // For incremental sync, get recent past and upcoming webinars
      const recentDate = new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000)); // 7 days ago
      const futureDate = new Date(now.getTime() + (30 * 24 * 60 * 60 * 1000)); // 30 days future
      
      console.log(`Fetching webinars from ${recentDate.toISOString()} to ${futureDate.toISOString()}`);
      
      const [recentWebinars, upcomingWebinars] = await Promise.all([
        client.listWebinarsWithRange({
          from: recentDate,
          to: now,
          type: 'past'
        }),
        client.listWebinarsWithRange({
          from: now,
          to: futureDate,
          type: 'upcoming'
        })
      ]);
      
      webinars = [...recentWebinars, ...upcomingWebinars];
      console.log(`Incremental sync found: ${recentWebinars.length} recent + ${upcomingWebinars.length} upcoming = ${webinars.length} total webinars`);
    }
    
    // Remove duplicates by webinar ID
    const uniqueWebinars = webinars.reduce((acc, webinar) => {
      if (!acc.find(w => w.id === webinar.id)) {
        acc.push(webinar);
      }
      return acc;
    }, []);
    
    console.log(`After deduplication: ${uniqueWebinars.length} unique webinars`);
    
    await updateSyncLog(supabase, syncLogId, {
      total_items: uniqueWebinars.length,
      sync_stage: 'processing_webinars'
    });
    
    let processedCount = 0;
    let errorCount = 0;
    let participantDataCount = 0;
    const errors: string[] = [];
    
    // Process webinars with enhanced status detection and participant data
    for (const webinarData of uniqueWebinars) {
      try {
        const progress = Math.round((processedCount / uniqueWebinars.length) * 90); // Leave 10% for final cleanup
        await updateSyncStage(supabase, syncLogId, webinarData.id, 'processing_webinar', progress);
        
        console.log(`Processing webinar ${processedCount + 1}/${uniqueWebinars.length}: ${webinarData.topic} (${webinarData.id})`);
        
        // Enhanced status detection logic
        let finalStatus: string;
        
        try {
          // Use enhanced status detection with the webinar data
          finalStatus = await client.getWebinarStatus(webinarData.id, webinarData);
        } catch (statusError) {
          console.log(`Status detection failed for ${webinarData.id}, using fallback:`, statusError.message);
          // Fallback to enhanced status detector without API call
          const statusResult = EnhancedStatusDetector.determineWebinarStatus(webinarData);
          finalStatus = statusResult.status;
        }
        
        // Update webinar data with accurate status
        const webinarWithStatus = {
          ...webinarData,
          status: finalStatus
        };
        
        // Save webinar to database first
        await saveWebinarToDatabase(supabase, webinarWithStatus, connection.id);
        
        // Now fetch and save participant data for completed webinars
        await updateSyncStage(supabase, syncLogId, webinarData.id, 'fetching_participants', progress);
        
        let participants: any[] = [];
        let registrants: any[] = [];
        let polls: any[] = [];
        let qa: any[] = [];
        
        // Only fetch participant data for webinars that have ended
        const shouldFetchParticipants = canWebinarHaveParticipantData(webinarWithStatus, finalStatus);
        
        if (shouldFetchParticipants) {
          console.log(`Fetching participant data for webinar ${webinarData.id} (status: ${finalStatus})`);
          
          try {
            // Fetch registrants (always available)
            registrants = await client.getWebinarRegistrants(webinarData.id);
            console.log(`Fetched ${registrants.length} registrants for webinar ${webinarData.id}`);
          } catch (registrantError) {
            console.log(`No registrants for webinar ${webinarData.id}:`, registrantError.message);
          }
          
          try {
            // Fetch participants (requires specific API scope)
            participants = await client.getWebinarParticipants(webinarData.id);
            console.log(`Fetched ${participants.length} participants for webinar ${webinarData.id}`);
            
            if (participants.length > 0) {
              participantDataCount++;
              await saveParticipantsToDatabase(supabase, participants, webinarData.id, connection.id);
            }
          } catch (participantError) {
            console.error(`Failed to fetch participants for webinar ${webinarData.id}:`, participantError.message);
            
            // Check for scope-related errors
            if (participantError.message?.includes('does not contain scopes')) {
              errors.push(`Missing required scope for participant data: ${participantError.message}`);
              console.error(`SCOPE ERROR: Missing required scope 'report:read:list_webinar_participants:admin' for participant data`);
            } else {
              errors.push(`Participant fetch failed for ${webinarData.id}: ${participantError.message}`);
            }
          }
          
          try {
            // Fetch polls
            polls = await client.getWebinarPolls(webinarData.id);
            console.log(`Fetched ${polls.length} polls for webinar ${webinarData.id}`);
            
            if (polls.length > 0) {
              await savePollsToDatabase(supabase, polls, webinarData.id, connection.id);
            }
          } catch (pollError) {
            console.log(`No polls for webinar ${webinarData.id}:`, pollError.message);
          }
          
          try {
            // Fetch Q&A
            qa = await client.getWebinarQA(webinarData.id);
            console.log(`Fetched ${qa.length} Q&A items for webinar ${webinarData.id}`);
            
            if (qa.length > 0) {
              await saveQAToDatabase(supabase, qa, webinarData.id, connection.id);
            }
          } catch (qaError) {
            console.log(`No Q&A for webinar ${webinarData.id}:`, qaError.message);
          }
        } else {
          console.log(`Skipping participant data for webinar ${webinarData.id} (status: ${finalStatus}) - not available for this webinar type`);
        }
        
        processedCount++;
        
        console.log(`✓ Processed webinar: ${webinarData.topic} with status: ${finalStatus}`);
        
        // Update progress
        await updateSyncLog(supabase, syncLogId, {
          processed_items: processedCount
        });
        
      } catch (error) {
        console.error(`Error processing webinar ${webinarData.id}:`, error);
        errorCount++;
        errors.push(`Webinar ${webinarData.id}: ${error.message}`);
        
        // Continue processing other webinars
        await updateSyncLog(supabase, syncLogId, {
          processed_items: processedCount,
          failed_items: errorCount
        });
      }
    }
    
    // Complete the sync
    const duration = Date.now() - startTime;
    await updateSyncStage(supabase, syncLogId, null, 'completed', 100);
    
    await updateSyncLog(supabase, syncLogId, {
      sync_status: 'completed',
      processed_items: processedCount,
      failed_items: errorCount,
      error_details: errors.length > 0 ? { errors, webinarsWithParticipantData: participantDataCount } : null,
      completed_at: new Date().toISOString(),
      duration_seconds: Math.round(duration / 1000)
    });
    
    console.log(`=== Background Sync Completed Successfully ===`);
    console.log(`Duration: ${Math.round(duration / 1000)}s, Processed: ${processedCount}, Errors: ${errorCount}, Total: ${uniqueWebinars.length}, Participant Data: ${participantDataCount}`);
    
  } catch (error) {
    console.error(`=== Background Sync Failed ===`);
    console.error('Sync error details:', error);
    
    const duration = Date.now() - startTime;
    const errorDetails = {
      message: error.message,
      status: error.status,
      isAuthError: error.isAuthError || false,
      duration: Math.round(duration / 1000),
      stack: error.stack
    };
    
    // Ensure sync status is properly updated on failure
    try {
      await updateSyncLog(supabase, syncLogId, {
        sync_status: 'failed',
        error_message: error.message,
        error_details: errorDetails,
        completed_at: new Date().toISOString(),
        duration_seconds: Math.round(duration / 1000)
      });
    } catch (updateError) {
      console.error('Failed to update sync log on error:', updateError);
    }
    
    throw error;
  } finally {
    // Clear heartbeat
    if (heartbeatInterval) {
      clearInterval(heartbeatInterval);
      console.log('Heartbeat cleared');
    }
  }
}

/**
 * Determine if a webinar can have participant data based on its status and timing
 */
function canWebinarHaveParticipantData(webinar: any, status: string): boolean {
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

/**
 * Save participants to database
 */
async function saveParticipantsToDatabase(supabase: any, participants: any[], webinarZoomId: string, connectionId: string): Promise<void> {
  if (!participants || participants.length === 0) return;
  
  // Get the database webinar ID
  const { data: webinarData, error: webinarError } = await supabase
    .from('zoom_webinars')
    .select('id')
    .eq('connection_id', connectionId)
    .eq('webinar_id', webinarZoomId)
    .single();
    
  if (webinarError || !webinarData) {
    console.error(`Could not find webinar in database for Zoom ID ${webinarZoomId}`);
    return;
  }
  
  const webinarDbId = webinarData.id;
  
  // Transform participants for database
  const transformedParticipants = participants.map(participant => ({
    webinar_id: webinarDbId,
    participant_id: participant.id || participant.participant_id,
    registrant_id: participant.registrant_id || null,
    participant_name: participant.name || participant.participant_name,
    participant_email: participant.user_email || participant.participant_email || null,
    participant_user_id: participant.user_id || null,
    join_time: participant.join_time || null,
    leave_time: participant.leave_time || null,
    duration: participant.duration || null,
    attentiveness_score: participant.attentiveness_score || null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }));
  
  const { error } = await supabase
    .from('zoom_participants')
    .upsert(transformedParticipants, {
      onConflict: 'webinar_id,participant_id',
      ignoreDuplicates: false
    });
    
  if (error) {
    console.error('Failed to save participants:', error);
    throw new Error(`Failed to save participants: ${error.message}`);
  }
  
  console.log(`Successfully saved ${transformedParticipants.length} participants for webinar ${webinarZoomId}`);
}

/**
 * Save polls to database
 */
async function savePollsToDatabase(supabase: any, polls: any[], webinarZoomId: string, connectionId: string): Promise<void> {
  if (!polls || polls.length === 0) return;
  
  // Get the database webinar ID
  const { data: webinarData, error: webinarError } = await supabase
    .from('zoom_webinars')
    .select('id')
    .eq('connection_id', connectionId)
    .eq('webinar_id', webinarZoomId)
    .single();
    
  if (webinarError || !webinarData) {
    console.error(`Could not find webinar in database for Zoom ID ${webinarZoomId}`);
    return;
  }
  
  const webinarDbId = webinarData.id;
  
  // Transform polls for database
  const transformedPolls = polls.map(poll => ({
    webinar_id: webinarDbId,
    poll_id: poll.id || poll.poll_id,
    poll_title: poll.title || poll.poll_title,
    poll_type: poll.type || null,
    status: poll.status || null,
    anonymous: poll.anonymous || false,
    questions: poll.questions || [],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }));
  
  const { error } = await supabase
    .from('zoom_polls')
    .upsert(transformedPolls, {
      onConflict: 'webinar_id,poll_id',
      ignoreDuplicates: false
    });
    
  if (error) {
    console.error('Failed to save polls:', error);
    throw new Error(`Failed to save polls: ${error.message}`);
  }
  
  console.log(`Successfully saved ${transformedPolls.length} polls for webinar ${webinarZoomId}`);
}

/**
 * Save Q&A to database
 */
async function saveQAToDatabase(supabase: any, qa: any[], webinarZoomId: string, connectionId: string): Promise<void> {
  if (!qa || qa.length === 0) return;
  
  // Get the database webinar ID
  const { data: webinarData, error: webinarError } = await supabase
    .from('zoom_webinars')
    .select('id')
    .eq('connection_id', connectionId)
    .eq('webinar_id', webinarZoomId)
    .single();
    
  if (webinarError || !webinarData) {
    console.error(`Could not find webinar in database for Zoom ID ${webinarZoomId}`);
    return;
  }
  
  const webinarDbId = webinarData.id;
  
  // Transform Q&A for database
  const transformedQA = qa.map(qna => ({
    webinar_id: webinarDbId,
    question_id: qna.question_id || qna.id,
    question: qna.question,
    answer: qna.answer || null,
    asker_name: qna.asker_name,
    asker_email: qna.asker_email || null,
    answered_by: qna.answered_by || null,
    asked_at: qna.asked_at || qna.question_time,
    answered_at: qna.answered_at || qna.answer_time || null,
    upvote_count: qna.upvote_count || 0,
    status: qna.status || 'open',
    anonymous: qna.anonymous || false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }));
  
  const { error } = await supabase
    .from('zoom_qna')
    .upsert(transformedQA, {
      onConflict: 'webinar_id,question_id',
      ignoreDuplicates: false
    });
    
  if (error) {
    console.error('Failed to save Q&A:', error);
    throw new Error(`Failed to save Q&A: ${error.message}`);
  }
  
  console.log(`Successfully saved ${transformedQA.length} Q&A items for webinar ${webinarZoomId}`);
}
