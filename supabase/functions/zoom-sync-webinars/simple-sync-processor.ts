
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
    
    // Stage 1: Fetch webinars list (0-20%)
    console.log('Fetching webinars list...');
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
    
    await updateSyncStage(supabase, syncLogId, null, 'fetching_webinars', 20);
    
    let processedCount = 0;
    let successCount = 0;
    let totalRegistrantsSynced = 0;
    let totalParticipantsSynced = 0;
    const totalWebinars = webinars.length;
    
    // Process each webinar through all stages
    for (const webinar of webinars) {
      try {
        // Stage 2: Processing webinar details (20-40%)
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
        
        // Stage 3: Syncing registrants (40-60%)
        const registrantStartProgress = 40 + Math.round(((processedCount) / totalWebinars) * 20);
        await updateSyncStage(
          supabase, 
          syncLogId, 
          webinar.id?.toString(), 
          'fetching_registrants', 
          registrantStartProgress
        );
        
        try {
          const registrantCount = await syncWebinarRegistrants(supabase, client, webinar.id, webinarDbId);
          totalRegistrantsSynced += registrantCount;
          console.log(`Successfully synced ${registrantCount} registrants for webinar ${webinar.id}`);
          
          // Update progress after registrants sync
          const registrantEndProgress = 40 + Math.round(((processedCount + 0.5) / totalWebinars) * 20);
          await updateSyncStage(
            supabase, 
            syncLogId, 
            webinar.id?.toString(), 
            'syncing_registrants', 
            registrantEndProgress
          );
        } catch (registrantError) {
          console.error(`Error syncing registrants for webinar ${webinar.id}:`, registrantError);
          // Continue with next stage even if registrants fail
        }
        
        // Stage 4: Syncing participants (60-80%)
        const participantStartProgress = 60 + Math.round(((processedCount) / totalWebinars) * 20);
        await updateSyncStage(
          supabase, 
          syncLogId, 
          webinar.id?.toString(), 
          'fetching_participants', 
          participantStartProgress
        );
        
        try {
          const participantCount = await syncWebinarParticipants(supabase, client, webinar.id, webinarDbId);
          totalParticipantsSynced += participantCount;
          console.log(`Successfully synced ${participantCount} participants for webinar ${webinar.id}`);
          
          // Update progress after participants sync
          const participantEndProgress = 60 + Math.round(((processedCount + 0.5) / totalWebinars) * 20);
          await updateSyncStage(
            supabase, 
            syncLogId, 
            webinar.id?.toString(), 
            'syncing_participants', 
            participantEndProgress
          );
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
    
    // Stage 5: Complete the sync (80-100%)
    await updateSyncStage(supabase, syncLogId, null, 'completing', 90);
    
    await updateSyncLog(supabase, syncLogId, {
      sync_status: 'completed',
      processed_items: processedCount,
      total_registrants: totalRegistrantsSynced,
      total_participants: totalParticipantsSynced,
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
