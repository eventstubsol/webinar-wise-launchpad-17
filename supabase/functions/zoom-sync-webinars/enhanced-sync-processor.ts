
import { saveWebinarToDatabase } from './database-operations.ts';
import { ComprehensiveBatchOperations } from '../../../src/services/zoom/operations/crud/ComprehensiveBatchOperations.ts';
import { SyncOperation } from './types.ts';

export async function processComprehensiveSync(
  supabase: any,
  syncOperation: SyncOperation,
  connection: any,
  syncLogId: string
): Promise<void> {
  console.log(`Starting enhanced comprehensive sync for connection: ${connection.id}`);
  
  try {
    // Initialize Zoom API client with enhanced error handling
    const zoomApi = await import('./zoom-api-client.ts');
    const client = await zoomApi.createZoomAPIClient(connection);
    
    // Fetch webinars list with comprehensive data
    console.log('Fetching webinars list...');
    await zoomApi.updateSyncStage(supabase, syncLogId, null, 'fetching_webinar_list', 10);
    
    const webinarsResponse = await client.get('/users/me/webinars', {
      page_size: 300,
      type: 'all'
    });
    
    const webinars = webinarsResponse.webinars || [];
    console.log(`Found ${webinars.length} webinars to sync`);
    
    if (webinars.length === 0) {
      await zoomApi.updateSyncLog(supabase, syncLogId, {
        sync_status: 'completed',
        processed_items: 0,
        completed_at: new Date().toISOString(),
        sync_stage: 'completed',
        stage_progress_percentage: 100
      });
      return;
    }
    
    let processedCount = 0;
    const totalWebinars = webinars.length;
    
    // Process each webinar with comprehensive data extraction
    for (const webinar of webinars) {
      try {
        await zoomApi.updateSyncStage(
          supabase, 
          syncLogId, 
          webinar.id?.toString(), 
          'starting_webinar', 
          Math.round((processedCount / totalWebinars) * 90) + 10
        );
        
        console.log(`Processing webinar ${webinar.id} (${processedCount + 1}/${totalWebinars})`);
        
        // Fetch detailed webinar information with all fields
        await zoomApi.updateSyncStage(supabase, syncLogId, webinar.id?.toString(), 'webinar_details', null);
        const webinarDetails = await client.get(`/webinars/${webinar.id}`);
        console.log(`Fetched webinar details for ${webinar.id}:`, {
          hasSettings: !!webinarDetails.settings,
          hasStartUrl: !!webinarDetails.start_url,
          hasEncryptedPasscode: !!webinarDetails.encrypted_passcode,
          creationSource: webinarDetails.creation_source,
          isSimulive: webinarDetails.is_simulive
        });
        
        // Fetch registrants
        await zoomApi.updateSyncStage(supabase, syncLogId, webinar.id?.toString(), 'registrants', null);
        const registrantsResponse = await client.get(`/webinars/${webinar.id}/registrants`, {
          page_size: 300
        });
        const registrants = registrantsResponse.registrants || [];
        console.log(`Fetched ${registrants.length} registrants for webinar ${webinar.id}`);
        
        // Fetch participants/attendees
        await zoomApi.updateSyncStage(supabase, syncLogId, webinar.id?.toString(), 'participants', null);
        let participants = [];
        try {
          const participantsResponse = await client.get(`/report/webinars/${webinar.id}/participants`, {
            page_size: 300
          });
          participants = participantsResponse.participants || [];
          console.log(`Fetched ${participants.length} participants for webinar ${webinar.id}`);
        } catch (participantError) {
          console.log(`No participants data available for webinar ${webinar.id} (likely not started yet)`);
        }
        
        // Fetch polls
        await zoomApi.updateSyncStage(supabase, syncLogId, webinar.id?.toString(), 'polls', null);
        let polls = [];
        try {
          const pollsResponse = await client.get(`/webinars/${webinar.id}/polls`);
          polls = pollsResponse.polls || [];
          console.log(`Fetched ${polls.length} polls for webinar ${webinar.id}`);
        } catch (pollError) {
          console.log(`No polls data available for webinar ${webinar.id}`);
        }
        
        // Fetch Q&A
        await zoomApi.updateSyncStage(supabase, syncLogId, webinar.id?.toString(), 'qa', null);
        let qnaData = [];
        try {
          const qnaResponse = await client.get(`/report/webinars/${webinar.id}/qa`);
          qnaData = qnaResponse.questions || [];
          console.log(`Fetched ${qnaData.length} Q&A items for webinar ${webinar.id}`);
        } catch (qnaError) {
          console.log(`No Q&A data available for webinar ${webinar.id}`);
        }
        
        // Use comprehensive batch operations to sync all data
        console.log(`Syncing comprehensive data for webinar ${webinar.id}...`);
        await ComprehensiveBatchOperations.syncCompleteWebinarData(
          webinarDetails, // Use detailed webinar data with all fields
          registrants,
          participants,
          polls,
          qnaData,
          connection.id
        );
        
        processedCount++;
        await zoomApi.updateSyncStage(
          supabase, 
          syncLogId, 
          webinar.id?.toString(), 
          'webinar_completed', 
          Math.round((processedCount / totalWebinars) * 90) + 10
        );
        
        console.log(`Successfully processed webinar ${webinar.id} with comprehensive data`);
        
      } catch (webinarError) {
        console.error(`Error processing webinar ${webinar.id}:`, webinarError);
        await zoomApi.updateSyncStage(supabase, syncLogId, webinar.id?.toString(), 'webinar_failed', null);
        // Continue with next webinar
      }
    }
    
    // Complete the sync
    await zoomApi.updateSyncLog(supabase, syncLogId, {
      sync_status: 'completed',
      processed_items: processedCount,
      completed_at: new Date().toISOString(),
      sync_stage: 'completed',
      stage_progress_percentage: 100
    });
    
    console.log(`Enhanced comprehensive sync completed. Processed ${processedCount}/${totalWebinars} webinars with full data extraction.`);
    
  } catch (error) {
    console.error('Enhanced comprehensive sync failed:', error);
    throw error;
  }
}
