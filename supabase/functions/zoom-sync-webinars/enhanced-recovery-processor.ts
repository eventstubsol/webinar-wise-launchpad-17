
import { updateSyncLog, updateSyncStage } from './database-operations.ts';
import { SyncOperation } from './types.ts';
import { syncWebinarWithValidation } from './webinar-sync-handler.ts';
import { findAndClearStuckSyncs, validateConnectionData } from './sync-recovery.ts';

export async function processRecoverySync(
  supabase: any,
  syncOperation: SyncOperation,
  connection: any,
  syncLogId: string
): Promise<void> {
  console.log(`=== STARTING RECOVERY SYNC FOR CONNECTION: ${connection.id} ===`);
  
  try {
    // Step 1: Clear any stuck syncs first
    console.log('Step 1: Clearing stuck syncs...');
    const clearedCount = await findAndClearStuckSyncs(supabase, connection.id);
    console.log(`Cleared ${clearedCount} stuck syncs`);

    // Step 2: Validate current data state
    console.log('Step 2: Validating current data state...');
    const currentCounts = await validateConnectionData(supabase, connection.id);
    console.log('Current data state:', currentCounts);

    // Initialize sync with recovery status
    await updateSyncLog(supabase, syncLogId, {
      sync_status: 'in_progress',
      started_at: new Date().toISOString(),
      sync_stage: 'recovery_initialization',
      stage_progress_percentage: 5
    });

    // Initialize Zoom API client
    const zoomApi = await import('./zoom-api-client.ts');
    const client = await zoomApi.createZoomAPIClient(connection, supabase);
    
    // Fetch all webinars with recovery logging
    console.log('Step 3: Fetching complete webinar list...');
    await updateSyncStage(supabase, syncLogId, null, 'fetching_webinar_list', 10);
    
    const webinars = await client.listWebinarsWithRange({
      type: 'all'
    });
    
    console.log(`=== RECOVERY SYNC ANALYSIS ===`);
    console.log(`Total webinars found in Zoom: ${webinars.length}`);
    console.log(`Current webinars in database: ${currentCounts.webinarCount}`);
    console.log(`Expected recovery: ${webinars.length - currentCounts.webinarCount} webinars`);
    
    if (webinars.length === 0) {
      await updateSyncLog(supabase, syncLogId, {
        sync_status: 'completed',
        processed_items: 0,
        completed_at: new Date().toISOString(),
        sync_stage: 'completed',
        stage_progress_percentage: 100,
        error_message: 'No webinars found in Zoom account'
      });
      return;
    }
    
    // Update total items for progress tracking
    await updateSyncLog(supabase, syncLogId, {
      total_items: webinars.length
    });

    let processedCount = 0;
    let successCount = 0;
    let failedCount = 0;
    const errors: string[] = [];
    
    // Recovery sync with enhanced monitoring
    const syncStartTime = Date.now();
    const maxSyncDuration = 25 * 60 * 1000; // 25 minutes
    
    console.log(`=== PROCESSING ${webinars.length} WEBINARS ===`);
    
    for (const webinar of webinars) {
      // Timeout protection
      if (Date.now() - syncStartTime > maxSyncDuration) {
        console.log(`Recovery sync approaching timeout, stopping at ${processedCount}/${webinars.length}`);
        await updateSyncLog(supabase, syncLogId, {
          sync_status: 'partial',
          error_message: 'Recovery sync stopped due to timeout protection',
          completed_at: new Date().toISOString()
        });
        break;
      }
      
      try {
        const progress = Math.round((processedCount / webinars.length) * 80) + 15; // 15-95% range
        
        await updateSyncStage(
          supabase, 
          syncLogId, 
          webinar.id?.toString(), 
          'processing_webinar', 
          progress
        );
        
        console.log(`=== PROCESSING WEBINAR ${webinar.id} (${processedCount + 1}/${webinars.length}) ===`);
        console.log(`Webinar: ${webinar.topic}`);
        console.log(`Start time: ${webinar.start_time}`);
        
        // Check if webinar already exists
        const { data: existingWebinar } = await supabase
          .from('zoom_webinars')
          .select('id, title')
          .eq('connection_id', connection.id)
          .eq('webinar_id', webinar.id?.toString())
          .maybeSingle();
        
        if (existingWebinar) {
          console.log(`Webinar ${webinar.id} already exists in database, skipping...`);
          successCount++;
          processedCount++;
          continue;
        }
        
        // Fetch webinar details
        console.log(`Fetching details for new webinar ${webinar.id}...`);
        const webinarDetails = await client.getWebinar(webinar.id);
        
        // Fetch registrants
        let registrants = [];
        try {
          registrants = await client.getWebinarRegistrants(webinar.id);
          console.log(`Fetched ${registrants.length} registrants`);
        } catch (registrantError) {
          console.log(`No registrants for webinar ${webinar.id}: ${registrantError.message}`);
        }

        // Fetch participants  
        let participants = [];
        try {
          participants = await client.getWebinarParticipants(webinar.id);
          console.log(`Fetched ${participants.length} participants`);
        } catch (participantError) {
          console.log(`No participants for webinar ${webinar.id}: ${participantError.message}`);
        }
        
        // Process webinar with recovery validation
        const insertionResult = await syncWebinarWithValidation(
          supabase,
          webinarDetails,
          registrants,
          participants,
          connection.id
        );
        
        if (insertionResult.success) {
          console.log(`✅ Successfully synced webinar ${webinar.id}`);
          successCount++;
        } else {
          console.error(`❌ Failed to sync webinar ${webinar.id}: ${insertionResult.error}`);
          errors.push(`Webinar ${webinar.id}: ${insertionResult.error}`);
          failedCount++;
        }
        
        processedCount++;
        
        // Update progress
        await updateSyncLog(supabase, syncLogId, {
          processed_items: processedCount,
          stage_progress_percentage: Math.round((processedCount / webinars.length) * 80) + 15
        });
        
      } catch (webinarError) {
        console.error(`❌ Error processing webinar ${webinar.id}:`, webinarError);
        errors.push(`Webinar ${webinar.id}: ${webinarError.message}`);
        failedCount++;
        processedCount++;
      }
    }
    
    // Final validation
    console.log('Step 4: Final data validation...');
    const finalCounts = await validateConnectionData(supabase, connection.id);
    
    // Complete recovery sync
    const syncStatus = failedCount === 0 ? 'completed' : (successCount > 0 ? 'partial' : 'failed');
    
    console.log(`=== RECOVERY SYNC COMPLETED ===`);
    console.log(`Status: ${syncStatus}`);
    console.log(`Processed: ${processedCount}/${webinars.length}`);
    console.log(`Success: ${successCount}, Failed: ${failedCount}`);
    console.log(`Final counts:`, finalCounts);
    
    await updateSyncLog(supabase, syncLogId, {
      sync_status: syncStatus,
      processed_items: processedCount,
      completed_at: new Date().toISOString(),
      sync_stage: 'completed',
      stage_progress_percentage: 100,
      error_message: errors.length > 0 ? `Recovery sync: ${failedCount} webinars failed` : null,
      error_details: errors.length > 0 ? { 
        errors, 
        successCount, 
        failedCount,
        finalCounts 
      } : { finalCounts }
    });
    
  } catch (error) {
    console.error('❌ Recovery sync failed:', error);
    
    await updateSyncLog(supabase, syncLogId, {
      sync_status: 'failed',
      error_message: `Recovery sync failed: ${error.message}`,
      completed_at: new Date().toISOString(),
      sync_stage: 'failed',
      stage_progress_percentage: 0
    });
    
    throw error;
  }
}
