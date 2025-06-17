
import { updateSyncLog, updateSyncStage } from './database-operations.ts';
import { SyncOperation } from './types.ts';
import { syncWebinarParticipants } from './processors/participant-processor.ts';

export async function processSimpleWebinarSync(
  supabase: any,
  syncOperation: SyncOperation,
  connection: any,
  syncLogId: string
): Promise<void> {
  const debugMode = syncOperation.options?.debug || false;
  console.log(`Starting simple webinar sync for connection: ${connection.id}${debugMode ? ' (DEBUG MODE)' : ''}`);

  // Track processing statistics
  let processedCount = 0;
  let successCount = 0;
  let skippedForParticipants = 0;
  let processedForParticipants = 0;
  let totalParticipantsSynced = 0;
  
  try {
    const zoomApi = await import('./zoom-api-client.ts');
    const client = await zoomApi.createZoomAPIClient(connection, supabase);
    
    await updateSyncStage(supabase, syncLogId, null, 'fetching_webinars', 10);
    
    const webinars = await client.listWebinarsWithRange({
      type: 'all'
    });
    
    console.log(`Found ${webinars.length} webinars to sync`);
    
    if (webinars.length === 0) {
      await updateSyncLog(supabase, syncLogId, {
        sync_status: 'completed',
        processed_items: 0,
        completed_at: new Date().toISOString(),
        sync_stage: 'completed',
        stage_progress_percentage: 100
      });
      return;
    }
    
    await updateSyncStage(supabase, syncLogId, null, 'processing_webinars', 20);
    
    const totalWebinars = webinars.length;
    
    // Process each webinar
    for (const webinar of webinars) {
      try {
        const baseProgress = 20 + Math.round(((processedCount) / totalWebinars) * 60);
        
        await updateSyncStage(
          supabase, 
          syncLogId, 
          webinar.id?.toString(), 
          'processing_webinar', 
          baseProgress
        );
        
        console.log(`Processing webinar ${webinar.id} (${processedCount + 1}/${totalWebinars})`);
        
        // Get detailed webinar data
        const webinarDetails = await client.getWebinar(webinar.id);
        
        // Store webinar data in database
        const { data: webinarRecord, error: webinarError } = await supabase
          .from('zoom_webinars')
          .upsert(
            {
              connection_id: connection.id,
              webinar_id: webinarDetails.id?.toString(),
              webinar_uuid: webinarDetails.uuid,
              host_id: webinarDetails.host_id,
              host_email: webinarDetails.host_email,
              topic: webinarDetails.topic,
              agenda: webinarDetails.agenda,
              type: webinarDetails.type,
              status: webinarDetails.status,
              start_time: webinarDetails.start_time,
              duration: webinarDetails.duration,
              timezone: webinarDetails.timezone,
              registration_required: !!webinarDetails.registration_url,
              registration_url: webinarDetails.registration_url,
              join_url: webinarDetails.join_url,
              approval_type: webinarDetails.settings?.approval_type,
              max_registrants: webinarDetails.settings?.registrants_restrict_number,
              synced_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            },
            {
              onConflict: 'connection_id,webinar_id',
              ignoreDuplicates: false
            }
          )
          .select('id')
          .single();

        if (webinarError) {
          console.error(`Failed to store webinar ${webinar.id}:`, webinarError);
          processedCount++;
          continue;
        }

        // Sync participants with eligibility check
        try {
          await updateSyncStage(
            supabase, 
            syncLogId, 
            webinar.id?.toString(), 
            'syncing_participants', 
            baseProgress + 10
          );
          
          const participantResult = await syncWebinarParticipants(
            supabase, 
            client, 
            webinar.id, 
            webinarRecord.id,
            webinarDetails, // Pass webinar data for eligibility check
            debugMode
          );
          
          if (participantResult.skipped) {
            skippedForParticipants++;
            console.log(`Skipped participant sync for webinar ${webinar.id}: ${participantResult.reason}`);
          } else {
            processedForParticipants++;
            totalParticipantsSynced += participantResult.count;
            console.log(`Successfully synced ${participantResult.count} participants for webinar ${webinar.id}`);
          }
          
        } catch (participantError) {
          console.error(`Error syncing participants for webinar ${webinar.id}:`, participantError);
          // Continue with next webinar even if participant sync fails
        }
        
        successCount++;
        processedCount++;
        
      } catch (webinarError) {
        console.error(`Error processing webinar ${webinar.id}:`, webinarError);
        processedCount++;
        // Continue with next webinar
      }
    }
    
    await updateSyncStage(supabase, syncLogId, null, 'completing', 90);
    
    // Enhanced completion logging with statistics
    console.log(`Simple webinar sync completed with statistics:`);
    console.log(`  - Total webinars found: ${totalWebinars}`);
    console.log(`  - Webinars processed successfully: ${successCount}`);
    console.log(`  - Webinars failed: ${processedCount - successCount}`);
    console.log(`  - Webinars processed for participants: ${processedForParticipants}`);
    console.log(`  - Webinars skipped for participants: ${skippedForParticipants}`);
    console.log(`  - Total participants synced: ${totalParticipantsSynced}`);
    
    await updateSyncLog(supabase, syncLogId, {
      sync_status: 'completed',
      processed_items: processedCount,
      total_participants: totalParticipantsSynced,
      completed_at: new Date().toISOString(),
      sync_stage: 'completed',
      stage_progress_percentage: 100,
      // Store additional statistics in sync_notes
      sync_notes: JSON.stringify({
        webinars_for_participants_processed: processedForParticipants,
        webinars_for_participants_skipped: skippedForParticipants,
        participant_sync_skip_reasons: 'Webinars not yet occurred or invalid status'
      })
    });
    
    console.log(`Simple webinar sync completed. Successfully processed ${successCount}/${totalWebinars} webinars and ${totalParticipantsSynced} participants.`);
    
  } catch (error) {
    console.error('Simple webinar sync failed:', error);
    
    await updateSyncLog(supabase, syncLogId, {
      sync_status: 'failed',
      processed_items: processedCount,
      total_participants: totalParticipantsSynced,
      error_message: error.message,
      completed_at: new Date().toISOString(),
      sync_stage: 'failed',
      stage_progress_percentage: 0,
      sync_notes: JSON.stringify({
        webinars_for_participants_processed: processedForParticipants,
        webinars_for_participants_skipped: skippedForParticipants,
        error_type: error.constructor.name
      })
    });
    
    throw error;
  }
}
