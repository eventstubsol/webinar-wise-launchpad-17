
import { validateZoomConnection, createZoomAPIClient } from './zoom-api-client.ts';

export async function processComprehensiveSync(
  supabase: any,
  syncOperation: any,
  connection: any,
  syncLogId: string
): Promise<void> {
  console.log(`Starting comprehensive sync operation: ${syncOperation.id}`);
  
  try {
    // Validate connection and create API client
    const isValid = await validateZoomConnection(connection);
    if (!isValid) {
      throw new Error('Invalid Zoom connection - tokens may be expired');
    }

    const zoomClient = await createZoomAPIClient(connection, supabase);

    let webinars = [];
    
    if (syncOperation.syncType === 'single' && syncOperation.webinarId) {
      // Single webinar sync
      try {
        const webinar = await zoomClient.getWebinar(syncOperation.webinarId);
        webinars = [webinar];
      } catch (error) {
        console.error(`Failed to fetch single webinar ${syncOperation.webinarId}:`, error);
        throw new Error(`Webinar ${syncOperation.webinarId} not found or inaccessible`);
      }
    } else {
      // Fetch webinars with extended 90-day range for both past and upcoming
      const now = new Date();
      const past90Days = new Date(now.getTime() - (90 * 24 * 60 * 60 * 1000));
      const future90Days = new Date(now.getTime() + (90 * 24 * 60 * 60 * 1000));

      console.log(`Fetching webinars from ${past90Days.toISOString()} to ${future90Days.toISOString()}`);

      // Fetch past and upcoming webinars
      const [pastWebinars, upcomingWebinars] = await Promise.all([
        zoomClient.listWebinarsWithRange({
          from: past90Days,
          to: now,
          type: 'past'
        }),
        zoomClient.listWebinarsWithRange({
          from: now,
          to: future90Days,
          type: 'upcoming'
        })
      ]);

      // Merge and deduplicate
      const allWebinars = [...pastWebinars, ...upcomingWebinars];
      const uniqueWebinars = new Map();
      
      allWebinars.forEach(webinar => {
        if (!uniqueWebinars.has(webinar.id)) {
          uniqueWebinars.set(webinar.id, webinar);
        }
      });
      
      webinars = Array.from(uniqueWebinars.values());
      console.log(`Total unique webinars after deduplication: ${webinars.length}`);
    }

    if (webinars.length === 0) {
      await updateSyncLog(supabase, syncLogId, {
        sync_status: 'completed',
        total_items: 0,
        processed_items: 0,
        completed_at: new Date().toISOString()
      });
      return;
    }

    // Update total items count
    await updateSyncLog(supabase, syncLogId, {
      total_items: webinars.length,
      sync_status: 'in_progress'
    });

    // Process webinars with comprehensive data collection
    let processedCount = 0;
    let failedCount = 0;
    const errors = [];

    for (const webinar of webinars) {
      try {
        await updateSyncStage(
          supabase, 
          syncLogId, 
          webinar.id.toString(), 
          'comprehensive_sync', 
          Math.floor((processedCount / webinars.length) * 80) + 20
        );

        await processComprehensiveWebinarData(supabase, zoomClient, webinar, connection.id, syncLogId);
        processedCount++;

        console.log(`Successfully processed webinar ${webinar.id} with comprehensive data (${processedCount}/${webinars.length})`);
        
      } catch (error) {
        failedCount++;
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        errors.push(`Webinar ${webinar.id}: ${errorMessage}`);
        
        console.error(`Failed to process webinar ${webinar.id}:`, error);
        
        if (error.isAuthError) {
          throw error;
        }
      }
    }

    // Complete the sync
    const endTime = new Date().toISOString();
    const finalStatus = errors.length === webinars.length ? 'failed' : (processedCount > 0 ? 'completed' : 'failed');

    await updateSyncLog(supabase, syncLogId, {
      sync_status: finalStatus,
      processed_items: processedCount,
      failed_items: failedCount,
      completed_at: endTime,
      error_message: errors.length > 0 ? `${failedCount} out of ${webinars.length} webinars failed to sync.` : null,
      error_details: errors.length > 0 ? { errors } : null,
      sync_stage: 'completed',
      stage_progress_percentage: 100
    });

    console.log(`Comprehensive sync completed: ${processedCount} processed, ${failedCount} failed`);

  } catch (error) {
    console.error('Comprehensive sync operation failed:', error);
    
    const isAuthError = !!error.isAuthError;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    await updateSyncLog(supabase, syncLogId, {
      sync_status: 'failed',
      error_message: errorMessage,
      error_details: { isAuthError },
      completed_at: new Date().toISOString(),
      sync_stage: 'failed',
      stage_progress_percentage: 0
    });
  }
}

async function processComprehensiveWebinarData(
  supabase: any,
  zoomClient: any,
  webinar: any,
  connectionId: string,
  syncLogId: string
): Promise<void> {
  const webinarId = webinar.id.toString();

  try {
    // Stage 1: Get enhanced webinar details
    await updateSyncStage(supabase, syncLogId, webinarId, 'webinar_details', null);
    const webinarDetails = await zoomClient.getWebinar(webinarId);
    
    // Stage 2: Get all related data in parallel for efficiency
    await updateSyncStage(supabase, syncLogId, webinarId, 'fetching_all_data', null);
    
    const [registrants, participants, polls, qa] = await Promise.allSettled([
      zoomClient.getWebinarRegistrants(webinarId),
      zoomClient.getWebinarParticipants(webinarId),
      zoomClient.getWebinarPolls(webinarId),
      zoomClient.getWebinarQA(webinarId)
    ]);

    // Extract data from settled promises
    const registrantsData = registrants.status === 'fulfilled' ? registrants.value : [];
    const participantsData = participants.status === 'fulfilled' ? participants.value : [];
    const pollsData = polls.status === 'fulfilled' ? polls.value : [];
    const qaData = qa.status === 'fulfilled' ? qa.value : [];

    console.log(`Data collected for webinar ${webinarId}:`, {
      registrants: registrantsData.length,
      participants: participantsData.length,
      polls: pollsData.length,
      qa: qaData.length
    });

    // Stage 3: Save all data comprehensively
    await updateSyncStage(supabase, syncLogId, webinarId, 'saving_comprehensive_data', null);
    
    await saveComprehensiveWebinarData(
      supabase,
      webinarDetails,
      registrantsData,
      participantsData,
      pollsData,
      qaData,
      connectionId
    );

    await updateSyncStage(supabase, syncLogId, webinarId, 'webinar_completed', null);
    
  } catch (error) {
    console.error(`Error processing comprehensive webinar data for ${webinarId}:`, error);
    throw error;
  }
}

async function saveComprehensiveWebinarData(
  supabase: any,
  webinarData: any,
  registrants: any[],
  participants: any[],
  polls: any[],
  qa: any[],
  connectionId: string
): Promise<void> {
  // Transform webinar data with enhanced mapping
  const webinarInsert = {
    connection_id: connectionId,
    webinar_id: webinarData.id.toString(),
    webinar_uuid: webinarData.uuid,
    topic: webinarData.topic,
    start_time: webinarData.start_time,
    duration: webinarData.duration,
    timezone: webinarData.timezone,
    host_id: webinarData.host_id,
    host_email: webinarData.host_email,
    status: webinarData.status || 'available',
    agenda: webinarData.agenda,
    type: webinarData.type,
    join_url: webinarData.join_url,
    registration_url: webinarData.registration_url,
    password: webinarData.password,
    h323_password: webinarData.h323_password || webinarData.h323_passcode,
    pstn_password: webinarData.pstn_password,
    encrypted_password: webinarData.encrypted_password || webinarData.encrypted_passcode,
    settings: webinarData.settings,
    tracking_fields: webinarData.tracking_fields,
    recurrence: webinarData.recurrence,
    occurrences: webinarData.occurrences,
    synced_at: new Date().toISOString(),
  };

  // Save webinar
  const { data: webinarResult, error: webinarError } = await supabase
    .from('zoom_webinars')
    .upsert(webinarInsert, { onConflict: 'connection_id,webinar_id' })
    .select('id')
    .single();

  if (webinarError) {
    console.error(`Error saving webinar ${webinarData.id}:`, webinarError);
    throw webinarError;
  }

  const webinarDbId = webinarResult.id;

  // Save registrants
  if (registrants.length > 0) {
    const registrantInserts = registrants.map(registrant => ({
      webinar_id: webinarDbId,
      registrant_id: registrant.id || registrant.registrant_id,
      registrant_email: registrant.email,
      first_name: registrant.first_name,
      last_name: registrant.last_name,
      registration_time: registrant.registration_time,
      status: registrant.status || 'approved',
      custom_questions: registrant.custom_questions || null,
      org: registrant.org,
      job_title: registrant.job_title,
      phone: registrant.phone,
      city: registrant.city,
      state: registrant.state,
      country: registrant.country,
      synced_at: new Date().toISOString()
    }));

    const { error: registrantsError } = await supabase
      .from('zoom_registrants')
      .upsert(registrantInserts, { onConflict: 'webinar_id,registrant_id' });

    if (registrantsError) {
      console.error(`Error saving registrants for webinar ${webinarData.id}:`, registrantsError);
    }
  }

  // Save participants
  if (participants.length > 0) {
    const participantInserts = participants.map(participant => ({
      webinar_id: webinarDbId,
      participant_id: participant.id || participant.participant_id,
      participant_name: participant.name || participant.participant_name,
      participant_email: participant.user_email || participant.participant_email,
      join_time: participant.join_time,
      leave_time: participant.leave_time,
      duration: participant.duration,
      attentiveness_score: participant.attentiveness_score,
      posted_chat: participant.posted_chat || false,
      raised_hand: participant.raised_hand || false,
      answered_polling: participant.answered_polling || false,
      asked_question: participant.asked_question || false,
      synced_at: new Date().toISOString()
    }));

    const { error: participantsError } = await supabase
      .from('zoom_participants')
      .upsert(participantInserts, { onConflict: 'webinar_id,participant_id' });

    if (participantsError) {
      console.error(`Error saving participants for webinar ${webinarData.id}:`, participantsError);
    }
  }

  // Calculate and update metrics
  const totalRegistrants = registrants.length;
  const totalAttendees = participants.length;
  const totalMinutes = participants.reduce((sum, p) => sum + (p.duration || 0), 0);
  const avgDuration = totalAttendees > 0 ? Math.round(totalMinutes / totalAttendees) : 0;

  const { error: updateError } = await supabase
    .from('zoom_webinars')
    .update({
      total_registrants: totalRegistrants,
      total_attendees: totalAttendees,
      total_minutes: totalMinutes,
      avg_attendance_duration: avgDuration,
      updated_at: new Date().toISOString()
    })
    .eq('id', webinarDbId);

  if (updateError) {
    console.error(`Error updating metrics for webinar ${webinarData.id}:`, updateError);
  }

  console.log(`Comprehensive data saved for webinar ${webinarData.id}: ${totalRegistrants} registrants, ${totalAttendees} attendees`);
}

async function updateSyncLog(supabase: any, syncLogId: string, updates: Record<string, any>): Promise<void> {
  const { error } = await supabase
    .from('zoom_sync_logs')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', syncLogId);
  if (error) console.error(`Failed to update sync log ${syncLogId}:`, error);
}

async function updateSyncStage(supabase: any, syncLogId: string, webinarId: string | null, stage: string, progress: number | null): Promise<void> {
  await updateSyncLog(supabase, syncLogId, {
    current_webinar_id: webinarId,
    sync_stage: stage,
    stage_progress_percentage: progress ? Math.max(0, Math.min(100, progress)) : null,
  });
  console.log(`Sync ${syncLogId}: ${stage} ${progress ? `(${progress}%)` : ''} - Webinar: ${webinarId || 'N/A'}`);
}
