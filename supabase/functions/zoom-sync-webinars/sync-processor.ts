
import { createSyncLog, updateSyncLog, updateSyncStage, saveWebinarToDatabase } from './database-operations.ts';
import { validateZoomConnection, createZoomAPIClient } from './zoom-api-client.ts';
import { SyncOperation, SYNC_PRIORITIES } from './types.ts';

export async function processSequentialSync(
  supabase: any,
  syncOperation: SyncOperation,
  connection: any,
  syncLogId: string
): Promise<void> {
  console.log(`Starting sequential sync operation: ${syncOperation.id}`);
  
  try {
    await updateSyncStage(supabase, syncLogId, null, 'initializing', 0);

    // Validate connection and create API client
    const isValid = await validateZoomConnection(connection);
    if (!isValid) {
      throw new Error('Invalid Zoom connection - tokens may be expired');
    }

    const zoomClient = await createZoomAPIClient(connection);
    await updateSyncStage(supabase, syncLogId, null, 'fetching_webinar_list', 10);

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
      // Fetch webinars based on sync type
      const listOptions = syncOperation.syncType === 'incremental' ? {
        from: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Last 7 days for incremental
      } : {};

      webinars = await zoomClient.listWebinars(listOptions);
      console.log(`Found ${webinars.length} webinars to sync`);
    }

    if (webinars.length === 0) {
      await updateSyncLog(supabase, syncLogId, {
        sync_status: 'completed',
        total_items: 0,
        processed_items: 0,
        completed_at: new Date().toISOString(),
        duration_seconds: 0
      });
      return;
    }

    // Update total items count
    await updateSyncLog(supabase, syncLogId, {
      total_items: webinars.length,
      sync_status: 'in_progress'
    });

    // Process webinars sequentially
    let processedCount = 0;
    let failedCount = 0;
    const errors = [];

    for (const webinar of webinars) {
      try {
        await updateSyncStage(
          supabase, 
          syncLogId, 
          webinar.id.toString(), 
          'starting_webinar', 
          Math.floor((processedCount / webinars.length) * 80) + 20
        );

        await processWebinarData(supabase, zoomClient, webinar, connection.id, syncLogId);
        processedCount++;

        await updateSyncLog(supabase, syncLogId, {
          processed_items: processedCount
        });

        console.log(`Successfully processed webinar ${webinar.id} (${processedCount}/${webinars.length})`);
        
      } catch (error) {
        failedCount++;
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        errors.push(`Webinar ${webinar.id}: ${errorMessage}`);
        
        console.error(`Failed to process webinar ${webinar.id}:`, error);
        
        await updateSyncStage(
          supabase, 
          syncLogId, 
          webinar.id.toString(), 
          'webinar_failed', 
          Math.floor((processedCount / webinars.length) * 80) + 20
        );
        
        if (error.isAuthError) {
            // If we get an auth error, we should stop the whole sync.
            throw error;
        }
      }
    }

    // Complete the sync
    const endTime = new Date().toISOString();
    const duration = Math.floor((new Date(endTime).getTime() - new Date(syncOperation.createdAt).getTime()) / 1000);
    const finalStatus = errors.length === webinars.length ? 'failed' : (processedCount > 0 ? 'completed' : 'failed');

    await updateSyncLog(supabase, syncLogId, {
      sync_status: finalStatus,
      processed_items: processedCount,
      failed_items: failedCount,
      completed_at: endTime,
      duration_seconds: Math.abs(duration),
      error_message: errors.length > 0 ? `${failedCount} out of ${webinars.length} webinars failed to sync.` : null,
      error_details: errors.length > 0 ? { errors } : null,
      sync_stage: 'completed',
      stage_progress_percentage: 100
    });

    console.log(`Sync completed: ${processedCount} processed, ${failedCount} failed`);

  } catch (error) {
    console.error('Sync operation failed:', error);
    
    const isAuthError = !!error.isAuthError;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    await updateSyncLog(supabase, syncLogId, {
      sync_status: 'failed',
      error_message: errorMessage,
      error_details: { isAuthError }, // Store the auth error flag
      completed_at: new Date().toISOString(),
      sync_stage: 'failed',
      stage_progress_percentage: 0
    });
  }
}

async function processWebinarData(
  supabase: any,
  zoomClient: any,
  webinar: any,
  connectionId: string,
  syncLogId: string
): Promise<void> {
  const webinarId = webinar.id.toString();

  try {
    // Stage 1: Get webinar details
    await updateSyncStage(supabase, syncLogId, webinarId, 'webinar_details', null);
    const webinarDetails = await zoomClient.getWebinar(webinarId);
    
    // Save webinar to database
    await saveWebinarToDatabase(supabase, webinarDetails, connectionId);

    // Stage 2: Get registrants
    await updateSyncStage(supabase, syncLogId, webinarId, 'registrants', null);
    try {
      const registrants = await zoomClient.getWebinarRegistrants(webinarId);
      console.log(`Found ${registrants.length} registrants for webinar ${webinarId}`);
    } catch (error) {
      console.log(`No registrants found for webinar ${webinarId}:`, error.message);
    }

    // Stage 3: Get participants
    await updateSyncStage(supabase, syncLogId, webinarId, 'participants', null);
    try {
      const participants = await zoomClient.getWebinarParticipants(webinarId);
      console.log(`Found ${participants.length} participants for webinar ${webinarId}`);
    } catch (error) {
      console.log(`No participants found for webinar ${webinarId}:`, error.message);
    }

    // Stage 4: Get polls
    await updateSyncStage(supabase, syncLogId, webinarId, 'polls', null);
    try {
      const polls = await zoomClient.getWebinarPolls(webinarId);
      console.log(`Found ${polls.length} polls for webinar ${webinarId}`);
    } catch (error) {
      console.log(`No polls found for webinar ${webinarId}:`, error.message);
    }

    // Stage 5: Get Q&A
    await updateSyncStage(supabase, syncLogId, webinarId, 'qa', null);
    try {
      const qa = await zoomClient.getWebinarQA(webinarId);
      console.log(`Found ${qa.length} Q&A items for webinar ${webinarId}`);
    } catch (error) {
      console.log(`No Q&A found for webinar ${webinarId}:`, error.message);
    }

    await updateSyncStage(supabase, syncLogId, webinarId, 'webinar_completed', null);
    
  } catch (error) {
    console.error(`Error processing webinar ${webinarId}:`, error);
    throw error;
  }
}
