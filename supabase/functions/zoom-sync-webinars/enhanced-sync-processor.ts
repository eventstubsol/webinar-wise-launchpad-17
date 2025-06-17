
import { updateSyncLog, updateSyncStage } from './database-operations.ts';
import { SyncOperation } from './types.ts';
import { syncWebinarWithDetails, updateWebinarTotals } from './processors/enhanced-webinar-processor.ts';
import { syncWebinarRegistrantsEnhanced } from './processors/enhanced-registrant-processor.ts';
import { syncWebinarParticipantsEnhanced } from './processors/enhanced-participant-processor.ts';

export async function processEnhancedWebinarSync(
  supabase: any,
  syncOperation: SyncOperation,
  connection: any,
  syncLogId: string
): Promise<void> {
  const debugMode = syncOperation.options?.debug || false;
  console.log(`Starting enhanced webinar sync for connection: ${connection.id}${debugMode ? ' (DEBUG MODE)' : ''}`);
  
  try {
    // Initialize Zoom API client
    const zoomApi = await import('./zoom-api-client.ts');
    const client = await zoomApi.createZoomAPIClient(connection, supabase);
    
    // Stage 1: Fetch webinars list (0-15%)
    console.log('Fetching webinars list...');
    await updateSyncStage(supabase, syncLogId, null, 'fetching_webinars', 5);
    
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
    
    await updateSyncStage(supabase, syncLogId, null, 'fetching_webinars', 15);
    
    let processedCount = 0;
    let successCount = 0;
    let totalRegistrantsSynced = 0;
    let totalParticipantsSynced = 0;
    const totalWebinars = webinars.length;
    const webinarMetrics: any[] = [];
    
    // Process each webinar through all stages
    for (const webinar of webinars) {
      try {
        const baseProgress = 15 + Math.round(((processedCount) / totalWebinars) * 70);
        
        // Stage 2: Processing webinar details (15-25%)
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
        
        // Store webinar data and get database ID
        const webinarDbId = await syncWebinarWithDetails(supabase, webinarDetails, connection.id);
        
        let registrantCount = 0;
        let participantCount = 0;
        
        // Stage 3: Syncing registrants (25-50%)
        const registrantStartProgress = baseProgress + 5;
        await updateSyncStage(
          supabase, 
          syncLogId, 
          webinar.id?.toString(), 
          'fetching_registrants', 
          registrantStartProgress
        );
        
        try {
          registrantCount = await syncWebinarRegistrantsEnhanced(supabase, client, webinar.id, webinarDbId);
          totalRegistrantsSynced += registrantCount;
          console.log(`Successfully synced ${registrantCount} registrants for webinar ${webinar.id}`);
          
          await updateSyncStage(
            supabase, 
            syncLogId, 
            webinar.id?.toString(), 
            'syncing_registrants', 
            baseProgress + 15
          );
        } catch (registrantError) {
          console.error(`Error syncing registrants for webinar ${webinar.id}:`, registrantError);
          // Continue with participants even if registrants fail
        }
        
        // Stage 4: Syncing participants (50-75%)
        const participantStartProgress = baseProgress + 20;
        await updateSyncStage(
          supabase, 
          syncLogId, 
          webinar.id?.toString(), 
          'fetching_participants', 
          participantStartProgress
        );
        
        try {
          participantCount = await syncWebinarParticipantsEnhanced(
            supabase, 
            client, 
            webinar.id, 
            webinarDbId,
            debugMode // Pass debug mode to participant processor
          );
          totalParticipantsSynced += participantCount;
          console.log(`Successfully synced ${participantCount} participants for webinar ${webinar.id}`);
          
          await updateSyncStage(
            supabase, 
            syncLogId, 
            webinar.id?.toString(), 
            'syncing_participants', 
            baseProgress + 30
          );
        } catch (participantError) {
          console.error(`Error syncing participants for webinar ${webinar.id}:`, participantError);
          // Continue with next webinar even if participants fail
        }
        
        // Stage 5: Update webinar totals (75-85%)
        await updateSyncStage(
          supabase, 
          syncLogId, 
          webinar.id?.toString(), 
          'updating_totals', 
          baseProgress + 35
        );
        
        try {
          await updateWebinarTotals(supabase, webinarDbId, registrantCount, participantCount);
          webinarMetrics.push({
            webinarId: webinar.id,
            registrants: registrantCount,
            participants: participantCount
          });
        } catch (updateError) {
          console.error(`Error updating totals for webinar ${webinar.id}:`, updateError);
        }
        
        console.log(`Successfully processed webinar ${webinar.id} - ${registrantCount} registrants, ${participantCount} participants`);
        
        successCount++;
        processedCount++;
        
      } catch (webinarError) {
        console.error(`Error processing webinar ${webinar.id}:`, webinarError);
        processedCount++;
        // Continue with next webinar
      }
    }
    
    // Stage 6: Complete the sync (85-100%)
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
    
    console.log(`Enhanced webinar sync completed. Successfully processed ${successCount}/${totalWebinars} webinars, ${totalRegistrantsSynced} registrants, and ${totalParticipantsSynced} participants.`);
    
  } catch (error) {
    console.error('Enhanced webinar sync failed:', error);
    throw error;
  }
}
