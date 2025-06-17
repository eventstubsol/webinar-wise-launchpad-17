import { updateSyncLog, updateSyncStage, updateWebinarParticipantSyncStatus, determineParticipantSyncStatus } from './database-operations.ts';
import { SyncOperation } from './types.ts';
import { syncWebinarParticipants } from './processors/participant-processor.ts';

export async function processSimpleWebinarSync(
  supabase: any,
  syncOperation: SyncOperation,
  connection: any,
  syncLogId: string
): Promise<void> {
  const debugMode = syncOperation.options?.debug || false;
  console.log(`Starting enhanced simple webinar sync for connection: ${connection.id}${debugMode ? ' (DEBUG MODE)' : ''}`);

  // Track processing statistics
  let processedCount = 0;
  let successCount = 0;
  let skippedForParticipants = 0;
  let processedForParticipants = 0;
  let totalParticipantsSynced = 0;
  let insertCount = 0;
  let updateCount = 0;
  
  try {
    const zoomApi = await import('./zoom-api-client.ts');
    const client = await zoomApi.createZoomAPIClient(connection, supabase);
    
    await updateSyncStage(supabase, syncLogId, null, 'fetching_webinars', 10);
    
    const webinars = await client.listWebinarsWithRange({
      type: 'all'
    });
    
    console.log(`Found ${webinars.length} webinars to sync with enhanced upsert logic`);
    
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
    
    // Process each webinar with enhanced upsert
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
        
        console.log(`Processing webinar ${webinar.id} (${processedCount + 1}/${totalWebinars}) with enhanced upsert`);
        
        // Get detailed webinar data
        const webinarDetails = await client.getWebinar(webinar.id);
        
        // Check if webinar already exists to track INSERT vs UPDATE
        const existingCheck = await supabase
          .from('zoom_webinars')
          .select('id')
          .eq('connection_id', connection.id)
          .eq('webinar_id', webinarDetails.id?.toString())
          .maybeSingle();
        
        const isNewWebinar = !existingCheck.data;
        
        // Determine initial participant sync status
        const initialParticipantSyncStatus = await determineParticipantSyncStatus(webinarDetails);
        
        // Use enhanced sync function from webinar-processor
        const { syncBasicWebinarData } = await import('./processors/webinar-processor.ts');
        const webinarDbId = await syncBasicWebinarData(supabase, webinarDetails, connection.id);
        
        // Track operation type for statistics
        if (isNewWebinar) {
          insertCount++;
          console.log(`✅ NEW webinar inserted: ${webinar.id} -> DB ID: ${webinarDbId}`);
        } else {
          updateCount++;
          console.log(`✅ EXISTING webinar updated: ${webinar.id} -> DB ID: ${webinarDbId} (data preserved)`);
        }

        // Sync participants with eligibility check and status tracking
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
            webinarDbId,
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
    
    // Enhanced completion logging with operation statistics
    console.log(`\n🎉 Enhanced simple webinar sync completed with statistics:`);
    console.log(`  - Total webinars found: ${totalWebinars}`);
    console.log(`  - Webinars processed successfully: ${successCount}`);
    console.log(`  - Webinars failed: ${processedCount - successCount}`);
    console.log(`  - NEW webinars inserted: ${insertCount}`);
    console.log(`  - EXISTING webinars updated: ${updateCount}`);
    console.log(`  - Data preservation: ${updateCount > 0 ? 'ENABLED (calculated fields preserved)' : 'N/A'}`);
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
      // Store enhanced statistics in sync_notes
      sync_notes: JSON.stringify({
        webinars_inserted: insertCount,
        webinars_updated: updateCount,
        data_preservation_enabled: true,
        webinars_for_participants_processed: processedForParticipants,
        webinars_for_participants_skipped: skippedForParticipants,
        participant_sync_skip_reasons: 'Webinars not yet occurred or invalid status'
      })
    });
    
    console.log(`✅ Enhanced sync completed. ${insertCount} new webinars inserted, ${updateCount} existing webinars updated (with data preservation), ${totalParticipantsSynced} participants synced.`);
    
  } catch (error) {
    console.error('Enhanced simple webinar sync failed:', error);
    
    await updateSyncLog(supabase, syncLogId, {
      sync_status: 'failed',
      processed_items: processedCount,
      total_participants: totalParticipantsSynced,
      error_message: error.message,
      completed_at: new Date().toISOString(),
      sync_stage: 'failed',
      stage_progress_percentage: 0,
      sync_notes: JSON.stringify({
        webinars_inserted: insertCount,
        webinars_updated: updateCount,
        data_preservation_enabled: true,
        webinars_for_participants_processed: processedForParticipants,
        webinars_for_participants_skipped: skippedForParticipants,
        error_type: error.constructor.name
      })
    });
    
    throw error;
  }
}
