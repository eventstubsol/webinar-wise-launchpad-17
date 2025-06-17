
import { updateSyncLog, updateSyncStage } from './database-operations.ts';
import { SyncOperation } from './types.ts';
import { WebinarStatusDetector } from './webinar-status-detector.ts';
import { syncWebinarWithValidation } from './webinar-sync-handler.ts';

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
    const client = await zoomApi.createZoomAPIClient(connection, supabase);
    
    // FIXED: Add proper sync lifecycle management
    await updateSyncLog(supabase, syncLogId, {
      sync_status: 'in_progress',
      started_at: new Date().toISOString()
    });
    
    // Fetch webinars list with comprehensive data
    console.log('Fetching webinars list...');
    await updateSyncStage(supabase, syncLogId, null, 'fetching_webinar_list', 10);
    
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
    let failedCount = 0;
    const totalWebinars = webinars.length;
    const errors: string[] = [];
    
    // FIXED: Add timeout protection
    const syncStartTime = Date.now();
    const maxSyncDuration = 25 * 60 * 1000; // 25 minutes (before 30-minute stuck sync threshold)
    
    // Process each webinar with enhanced error tracking
    for (const webinar of webinars) {
      // Check for timeout
      if (Date.now() - syncStartTime > maxSyncDuration) {
        console.log(`Sync approaching timeout limit, stopping at ${processedCount}/${totalWebinars} webinars`);
        await updateSyncLog(supabase, syncLogId, {
          sync_status: 'partial',
          error_message: 'Sync stopped due to timeout protection',
          completed_at: new Date().toISOString()
        });
        break;
      }
      
      try {
        await updateSyncStage(
          supabase, 
          syncLogId, 
          webinar.id?.toString(), 
          'starting_webinar', 
          Math.round((processedCount / totalWebinars) * 90) + 10
        );
        
        console.log(`Processing webinar ${webinar.id} (${processedCount + 1}/${totalWebinars})`);
        
        // Fetch detailed webinar information
        await updateSyncStage(supabase, syncLogId, webinar.id?.toString(), 'webinar_details', null);
        const webinarDetails = await client.getWebinar(webinar.id);
        
        // Fetch registrants with proper error handling
        await updateSyncStage(supabase, syncLogId, webinar.id?.toString(), 'registrants', null);
        let registrants = [];
        try {
          registrants = await client.getWebinarRegistrants(webinar.id);
          console.log(`Fetched ${registrants.length} registrants for webinar ${webinar.id}`);
        } catch (registrantError) {
          console.log(`No registrants data available for webinar ${webinar.id}: ${registrantError.message}`);
        }

        // ENHANCED: Fetch participants with comprehensive logging and multiple endpoint strategy
        await updateSyncStage(supabase, syncLogId, webinar.id?.toString(), 'participants', null);
        let participants = [];
        try {
          console.log(`=== FETCHING PARTICIPANTS FOR WEBINAR ${webinar.id} ===`);
          participants = await client.getWebinarParticipants(webinar.id);
          console.log(`✅ Successfully fetched ${participants.length} participants for webinar ${webinar.id}`);
          
          if (participants.length > 0) {
            console.log(`Sample participant structure from API:`, JSON.stringify(participants[0], null, 2));
          } else {
            console.log(`⚠️ No participants returned from API for webinar ${webinar.id}`);
          }
        } catch (participantError) {
          console.error(`❌ Failed to fetch participants for webinar ${webinar.id}:`, participantError.message);
          console.log(`Continuing sync without participants data for webinar ${webinar.id}`);
          participants = []; // Ensure it's an empty array
        }
        
        // Process webinar data with enhanced validation
        console.log(`Syncing webinar data for webinar ${webinar.id}...`);
        await updateSyncStage(supabase, syncLogId, webinar.id?.toString(), 'saving_webinar', null);
        
        const insertionResult = await syncWebinarWithValidation(
          supabase,
          webinarDetails,
          registrants,
          participants,
          connection.id
        );
        
        if (insertionResult.success) {
          console.log(`✅ Successfully synced webinar ${webinar.id} to database`);
          successCount++;
        } else {
          console.error(`❌ Failed to sync webinar ${webinar.id}: ${insertionResult.error}`);
          errors.push(`Webinar ${webinar.id}: ${insertionResult.error}`);
          failedCount++;
        }
        
        processedCount++;
        await updateSyncStage(
          supabase, 
          syncLogId, 
          webinar.id?.toString(), 
          insertionResult.success ? 'webinar_completed' : 'webinar_failed', 
          Math.round((processedCount / totalWebinars) * 90) + 10
        );
        
      } catch (webinarError) {
        console.error(`❌ Error processing webinar ${webinar.id}:`, webinarError);
        await updateSyncStage(supabase, syncLogId, webinar.id?.toString(), 'webinar_failed', null);
        errors.push(`Webinar ${webinar.id}: ${webinarError.message}`);
        failedCount++;
        processedCount++;
      }
    }
    
    // Complete the sync with detailed results
    const syncStatus = failedCount === 0 ? 'completed' : (successCount > 0 ? 'partial' : 'failed');
    
    await updateSyncLog(supabase, syncLogId, {
      sync_status: syncStatus,
      processed_items: processedCount,
      completed_at: new Date().toISOString(),
      sync_stage: 'completed',
      stage_progress_percentage: 100,
      error_message: errors.length > 0 ? `${failedCount} webinars failed to sync` : null,
      error_details: errors.length > 0 ? { errors, successCount, failedCount } : null
    });
    
    console.log(`Enhanced sync completed. Success: ${successCount}, Failed: ${failedCount}, Total: ${totalWebinars}`);
    
  } catch (error) {
    console.error('❌ Enhanced sync failed:', error);
    
    // FIXED: Ensure sync status is always updated, even on failure
    await updateSyncLog(supabase, syncLogId, {
      sync_status: 'failed',
      error_message: error.message,
      completed_at: new Date().toISOString(),
      sync_stage: 'failed',
      stage_progress_percentage: 0
    });
    
    throw error;
  }
}
