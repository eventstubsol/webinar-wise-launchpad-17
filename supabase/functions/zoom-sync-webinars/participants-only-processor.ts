
import { updateSyncLog, updateSyncStage } from './database-operations.ts';
import { SyncOperation } from './types.ts';

export async function processParticipantsOnlySync(
  supabase: any,
  syncOperation: SyncOperation,
  connection: any,
  syncLogId: string
): Promise<void> {
  console.log(`Starting participants-only sync for connection: ${connection.id}`);
  
  try {
    // Initialize Zoom API client
    const zoomApi = await import('./zoom-api-client.ts');
    const client = await zoomApi.createZoomAPIClient(connection, supabase);
    
    // Get all existing webinars from our database to fetch participants for
    console.log('Fetching existing webinars from database...');
    await updateSyncStage(supabase, syncLogId, null, 'fetching_existing_webinars', 5);
    
    const { data: existingWebinars, error: webinarsError } = await supabase
      .from('zoom_webinars')
      .select('id, webinar_id, topic, start_time')
      .eq('connection_id', connection.id)
      .order('start_time', { ascending: false });

    if (webinarsError) {
      throw new Error(`Failed to fetch existing webinars: ${webinarsError.message}`);
    }

    if (!existingWebinars || existingWebinars.length === 0) {
      await updateSyncLog(supabase, syncLogId, {
        sync_status: 'completed',
        processed_items: 0,
        completed_at: new Date().toISOString(),
        sync_stage: 'completed',
        stage_progress_percentage: 100,
        error_message: 'No webinars found to sync participants for'
      });
      return;
    }
    
    console.log(`Found ${existingWebinars.length} webinars to sync participants for`);
    
    await updateSyncLog(supabase, syncLogId, {
      total_items: existingWebinars.length
    });

    let processedCount = 0;
    let successCount = 0;
    let participantCount = 0;
    const failedWebinars: Array<{ id: string; error: string }> = [];

    // Process participants for each webinar
    for (const webinar of existingWebinars) {
      try {
        await updateSyncStage(
          supabase, 
          syncLogId, 
          webinar.webinar_id, 
          'fetching_participants', 
          Math.round((processedCount / existingWebinars.length) * 90) + 5
        );
        
        console.log(`Fetching participants for webinar ${webinar.webinar_id} (${processedCount + 1}/${existingWebinars.length})`);
        
        // Fetch participants from Zoom
        let participants = [];
        try {
          participants = await client.getWebinarParticipants(webinar.webinar_id);
          console.log(`Fetched ${participants.length} participants for webinar ${webinar.webinar_id}`);
        } catch (participantError) {
          console.log(`No participants data available for webinar ${webinar.webinar_id}: ${participantError.message}`);
          // Continue processing even if participants fail - some webinars may not have participant reports
        }
        
        if (participants.length > 0) {
          // Transform and save participants
          await updateSyncStage(supabase, syncLogId, webinar.webinar_id, 'saving_participants', null);
          
          const transformedParticipants = participants.map(participant => 
            transformParticipantForDatabase(participant, webinar.id)
          );
          
          console.log(`Saving ${transformedParticipants.length} participants for webinar ${webinar.webinar_id}`);
          
          const { error: participantsError } = await supabase
            .from('zoom_participants')
            .upsert(
              transformedParticipants,
              {
                onConflict: 'webinar_id,participant_id',
                ignoreDuplicates: false
              }
            );

          if (participantsError) {
            console.error('Failed to upsert participants:', participantsError);
            throw new Error(`Failed to save participants: ${participantsError.message}`);
          }
          
          participantCount += participants.length;
          
          // Update webinar with participant metrics
          await updateWebinarWithParticipantMetrics(supabase, webinar.id, participants);
        }
        
        successCount++;
        processedCount++;
        
        const overallProgress = Math.round(((processedCount) / existingWebinars.length) * 90) + 10;
        await updateSyncStage(
          supabase, 
          syncLogId, 
          webinar.webinar_id, 
          'webinar_participants_completed', 
          overallProgress
        );
        
        console.log(`Successfully processed participants for webinar ${webinar.webinar_id}`);
        
      } catch (webinarError) {
        console.error(`Error processing participants for webinar ${webinar.webinar_id}:`, webinarError);
        const errorMessage = webinarError instanceof Error ? webinarError.message : 'Unknown error';
        failedWebinars.push({ id: webinar.webinar_id, error: errorMessage });
        processedCount++;
        
        await updateSyncStage(supabase, syncLogId, webinar.webinar_id, 'webinar_participants_failed', null);
      }
    }
    
    // Complete the sync
    await updateSyncLog(supabase, syncLogId, {
      sync_status: 'completed',
      processed_items: processedCount,
      completed_at: new Date().toISOString(),
      sync_stage: 'completed',
      stage_progress_percentage: 100,
      error_details: failedWebinars.length > 0 ? { 
        error_message: `${failedWebinars.length} webinars failed participant sync`,
        error_code: 'PARTIAL_PARTICIPANTS_SYNC_FAILURE',
        failed_webinars: failedWebinars 
      } : null
    });
    
    console.log(`Participants-only sync completed. Successfully processed ${successCount}/${existingWebinars.length} webinars, ${participantCount} total participants.`);
    
  } catch (error) {
    console.error('Participants-only sync failed:', error);
    await updateSyncLog(supabase, syncLogId, {
      sync_status: 'failed',
      completed_at: new Date().toISOString(),
      error_message: error instanceof Error ? error.message : 'Unknown error occurred'
    });
    throw error;
  }
}

/**
 * Transform Zoom API participant to database format
 */
function transformParticipantForDatabase(apiParticipant: any, webinarDbId: string): any {
  const details = apiParticipant.details?.[0] || {};
  
  return {
    webinar_id: webinarDbId,
    participant_id: apiParticipant.id || apiParticipant.participant_id,
    registrant_id: null, // This would need to be linked separately
    participant_name: apiParticipant.name || apiParticipant.participant_name,
    participant_email: apiParticipant.user_email || apiParticipant.participant_email || null,
    participant_user_id: apiParticipant.user_id || null,
    join_time: apiParticipant.join_time,
    leave_time: apiParticipant.leave_time || null,
    duration: apiParticipant.duration || null,
    attentiveness_score: apiParticipant.attentiveness_score || null,
    camera_on_duration: details.camera_on_duration || null,
    share_application_duration: details.share_application_duration || null,
    share_desktop_duration: details.share_desktop_duration || null,
    posted_chat: apiParticipant.posted_chat || false,
    raised_hand: apiParticipant.raised_hand || false,
    answered_polling: apiParticipant.answered_polling || false,
    asked_question: apiParticipant.asked_question || false,
    device: details.device || null,
    ip_address: details.ip_address || null,
    location: details.location || null,
    network_type: details.network_type || null,
    version: details.version || null,
    customer_key: apiParticipant.customer_key || null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
}

/**
 * Update webinar with participant metrics
 */
async function updateWebinarWithParticipantMetrics(
  supabase: any,
  webinarDbId: string,
  participants: any[]
): Promise<void> {
  console.log(`Updating participant metrics for webinar ${webinarDbId}`);
  
  try {
    const totalParticipants = participants.length;
    const totalMinutes = participants.reduce((sum, p) => sum + (p.duration || 0), 0);
    const avgDuration = totalParticipants > 0 ? Math.round(totalMinutes / totalParticipants) : 0;
    
    // Update webinar with participant metrics
    const { error: updateError } = await supabase
      .from('zoom_webinars')
      .update({
        total_attendees: totalParticipants,
        total_minutes: totalMinutes,
        avg_attendance_duration: avgDuration,
        updated_at: new Date().toISOString()
      })
      .eq('id', webinarDbId);

    if (updateError) {
      console.error('Failed to update webinar participant metrics:', updateError);
      throw new Error(`Failed to update webinar participant metrics: ${updateError.message}`);
    }
    
    console.log(`Successfully updated participant metrics for webinar ${webinarDbId}: ${totalParticipants} participants, ${avgDuration}min avg duration`);
  } catch (error) {
    console.error('Error updating webinar participant metrics:', error);
    // Don't throw here - metrics calculation failure shouldn't stop the entire sync
    console.log(`Continuing sync despite participant metrics calculation error for webinar ${webinarDbId}`);
  }
}
