
import { updateSyncLog, updateSyncStage } from './database-operations.ts';
import { SyncOperation } from './types.ts';
import { syncWebinarParticipants } from './processors/participant-processor.ts';
import { syncWebinarRegistrants } from './processors/registrant-processor.ts';
import { syncBasicWebinarData } from './processors/webinar-processor.ts';

export async function processSimpleWebinarSync(
  supabase: any,
  syncOperation: SyncOperation,
  connection: any,
  syncLogId: string
): Promise<void> {
  console.log(`Starting simple webinar-only sync for connection: ${connection.id}`);
  
  try {
    // Initialize Zoom API client
    const zoomApi = await import('./zoom-api-client.ts');
    const client = await zoomApi.createZoomAPIClient(connection, supabase);
    
    // Fetch webinars list
    console.log('Fetching webinars list...');
    await updateSyncStage(supabase, syncLogId, null, 'fetching_webinars', 20);
    
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
    
    let processedCount = 0;
    let successCount = 0;
    let totalRegistrantsSynced = 0;
    let totalParticipantsSynced = 0;
    const totalWebinars = webinars.length;
    
    // Process each webinar - basic info + registrants + participants
    for (const webinar of webinars) {
      try {
        // Update progress for webinar processing (20-40%)
        const webinarProgress = 20 + Math.round(((processedCount) / totalWebinars) * 20);
        await updateSyncStage(
          supabase, 
          syncLogId, 
          webinar.id?.toString(), 
          'processing_webinar', 
          webinarProgress
        );
        
        console.log(`Processing webinar ${webinar.id} (${processedCount + 1}/${totalWebinars})`);
        
        // Get basic webinar details
        const webinarDetails = await client.getWebinar(webinar.id);
        
        // Store webinar data and get database ID
        const webinarDbId = await syncBasicWebinarData(supabase, webinarDetails, connection.id);
        
        // Sync registrants for this webinar (40-70% progress range)
        const registrantProgress = 40 + Math.round(((processedCount) / totalWebinars) * 30);
        await updateSyncStage(
          supabase, 
          syncLogId, 
          webinar.id?.toString(), 
          'syncing_registrants', 
          registrantProgress
        );
        
        try {
          const registrantCount = await syncWebinarRegistrants(supabase, client, webinar.id, webinarDbId);
          totalRegistrantsSynced += registrantCount;
          console.log(`Successfully synced ${registrantCount} registrants for webinar ${webinar.id}`);
        } catch (registrantError) {
          console.error(`Error syncing registrants for webinar ${webinar.id}:`, registrantError);
          // Continue with next webinar even if registrants fail
        }
        
        // Sync participants for this webinar (70-90% progress range)
        const participantProgress = 70 + Math.round(((processedCount) / totalWebinars) * 20);
        await updateSyncStage(
          supabase, 
          syncLogId, 
          webinar.id?.toString(), 
          'syncing_participants', 
          participantProgress
        );
        
        try {
          const participantCount = await syncWebinarParticipants(supabase, client, webinar.id, webinarDbId);
          totalParticipantsSynced += participantCount;
          console.log(`Successfully synced ${participantCount} participants for webinar ${webinar.id}`);
        } catch (participantError) {
          console.error(`Error syncing participants for webinar ${webinar.id}:`, participantError);
          // Continue with next webinar even if participants fail
        }
        
        console.log(`Successfully processed webinar ${webinar.id}`);
        
        successCount++;
        processedCount++;
        
      } catch (webinarError) {
        console.error(`Error processing webinar ${webinar.id}:`, webinarError);
        processedCount++;
        // Continue with next webinar
      }
    }
    
    // Complete the sync (90-100%)
    await updateSyncStage(supabase, syncLogId, null, 'completing', 95);
    
    await updateSyncLog(supabase, syncLogId, {
      sync_status: 'completed',
      processed_items: processedCount,
      completed_at: new Date().toISOString(),
      sync_stage: 'completed',
      stage_progress_percentage: 100
    });
    
    console.log(`Simple webinar sync completed. Successfully processed ${successCount}/${totalWebinars} webinars, ${totalRegistrantsSynced} registrants, and ${totalParticipantsSynced} participants.`);
    
  } catch (error) {
    console.error('Simple webinar sync failed:', error);
    throw error;
  }
}
