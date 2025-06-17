
import { updateSyncLog, updateSyncStage } from './database-operations.ts';
import { SyncOperation } from './types.ts';
import { ComprehensiveWebinarFetcher } from './comprehensive-webinar-fetcher.ts';
import { transformWebinarWithStatusDetection } from './data-transformers.ts';

// Simplified processor that only handles webinar data
export async function processSimpleWebinarSync(
  supabase: any,
  syncOperation: SyncOperation,
  connection: any,
  syncLogId: string
): Promise<void> {
  console.log(`=== STARTING SIMPLIFIED WEBINAR-ONLY SYNC FOR CONNECTION: ${connection.id} ===`);
  
  try {
    await updateSyncLog(supabase, syncLogId, {
      sync_status: 'in_progress',
      started_at: new Date().toISOString(),
      sync_stage: 'simple_webinar_fetch',
      stage_progress_percentage: 5
    });

    // Initialize Zoom API client
    const zoomApi = await import('./zoom-api-client.ts');
    const client = await zoomApi.createZoomAPIClient(connection, supabase);
    
    // Use comprehensive webinar fetching strategy
    console.log('=== FETCHING WEBINARS ONLY (NO REGISTRANTS/PARTICIPANTS) ===');
    await updateSyncStage(supabase, syncLogId, null, 'fetching_webinars', 10);
    
    const webinarFetcher = new ComprehensiveWebinarFetcher(client, connection.id);
    const fetchResult = await webinarFetcher.fetchAllWebinars();
    
    const webinars = fetchResult.webinars;
    const fetchSummary = fetchResult.summary;
    
    console.log(`=== WEBINAR FETCH COMPLETED ===`);
    console.log(`Fetched: ${fetchSummary.finalCount} webinars`);
    console.log(`Fetch breakdown:`, fetchSummary);
    
    if (webinars.length === 0) {
      await updateSyncLog(supabase, syncLogId, {
        sync_status: 'completed',
        processed_items: 0,
        completed_at: new Date().toISOString(),
        sync_stage: 'completed',
        stage_progress_percentage: 100,
        error_message: 'No webinars found',
        error_details: { fetchSummary }
      });
      return;
    }
    
    await updateSyncLog(supabase, syncLogId, {
      total_items: webinars.length,
      error_details: { 
        fetchSummary,
        processingMode: 'webinars_only'
      }
    });

    let processedCount = 0;
    let successCount = 0;
    let failedCount = 0;
    const errors: string[] = [];
    
    console.log(`=== PROCESSING ${webinars.length} WEBINARS (SIMPLIFIED) ===`);
    
    for (const webinar of webinars) {
      try {
        const progress = Math.round((processedCount / webinars.length) * 80) + 15;
        await updateSyncStage(supabase, syncLogId, webinar.id?.toString(), 'processing_webinar', progress);
        
        console.log(`=== PROCESSING WEBINAR ${webinar.id} (${processedCount + 1}/${webinars.length}) ===`);
        console.log(`Title: ${webinar.topic}`);
        
        // Check if webinar already exists
        const { data: existingWebinar, error: checkError } = await supabase
          .from('zoom_webinars')
          .select('id, topic, webinar_id')
          .eq('connection_id', connection.id)
          .eq('webinar_id', webinar.id?.toString())
          .maybeSingle();
        
        if (checkError) {
          console.error(`❌ Error checking existing webinar ${webinar.id}:`, checkError);
          errors.push(`Webinar ${webinar.id}: Database check failed - ${checkError.message}`);
          failedCount++;
          processedCount++;
          continue;
        }
        
        if (existingWebinar) {
          console.log(`✅ Webinar ${webinar.id} already exists, skipping...`);
          successCount++;
          processedCount++;
          continue;
        }
        
        // Simple webinar processing - no registrants/participants
        const result = await processWebinarOnly(supabase, webinar, connection.id);
        
        if (result.success) {
          console.log(`✅ Successfully synced webinar ${webinar.id}`);
          successCount++;
        } else {
          console.error(`❌ Failed to sync webinar ${webinar.id}: ${result.error}`);
          errors.push(`Webinar ${webinar.id}: ${result.error}`);
          failedCount++;
        }
        
        processedCount++;
        
        // Update progress
        await updateSyncLog(supabase, syncLogId, {
          processed_items: processedCount,
          stage_progress_percentage: Math.round((processedCount / webinars.length) * 80) + 15
        });
        
      } catch (webinarError) {
        console.error(`❌ Critical error processing webinar ${webinar.id}:`, webinarError);
        errors.push(`Webinar ${webinar.id}: ${webinarError.message}`);
        failedCount++;
        processedCount++;
      }
    }
    
    const syncStatus = failedCount === 0 ? 'completed' : 
                      successCount > 0 ? 'partial' : 'failed';
    
    console.log(`=== SIMPLIFIED WEBINAR SYNC COMPLETED ===`);
    console.log(`Status: ${syncStatus}`);
    console.log(`Processed: ${processedCount}/${webinars.length}`);
    console.log(`Success: ${successCount}, Failed: ${failedCount}`);
    
    await updateSyncLog(supabase, syncLogId, {
      sync_status: syncStatus,
      processed_items: processedCount,
      completed_at: new Date().toISOString(),
      sync_stage: 'completed',
      stage_progress_percentage: 100,
      error_message: errors.length > 0 ? `${failedCount} webinars failed` : null,
      error_details: { 
        errors, 
        successCount, 
        failedCount,
        fetchSummary,
        processingMode: 'webinars_only'
      }
    });
    
  } catch (error) {
    console.error('❌ Simplified webinar sync failed:', error);
    
    await updateSyncLog(supabase, syncLogId, {
      sync_status: 'failed',
      error_message: `Simplified webinar sync failed: ${error.message}`,
      completed_at: new Date().toISOString(),
      sync_stage: 'failed',
      stage_progress_percentage: 0
    });
    
    throw error;
  }
}

// Simple function to process only webinar data
async function processWebinarOnly(
  supabase: any,
  webinar: any,
  connectionId: string
): Promise<{ success: boolean; error?: string }> {
  
  try {
    console.log(`💾 Saving webinar ${webinar.id} to database (simplified)...`);
    
    // Transform webinar with enhanced status detection
    const transformedWebinar = transformWebinarWithStatusDetection(webinar, connectionId);
    
    console.log(`Transformed webinar ${webinar.id}:`, {
      id: transformedWebinar.webinar_id,
      status: transformedWebinar.status,
      title: transformedWebinar.topic,
      startTime: transformedWebinar.start_time
    });

    // Simple upsert - no complex validation
    const { data: webinarRecord, error: webinarError } = await supabase
      .from('zoom_webinars')
      .upsert(
        transformedWebinar,
        {
          onConflict: 'connection_id,webinar_id',
          ignoreDuplicates: false
        }
      )
      .select('id')
      .maybeSingle();

    if (webinarError) {
      console.error('Webinar insertion failed:', webinarError);
      return { 
        success: false, 
        error: `Database insertion failed: ${webinarError.message}` 
      };
    }

    const webinarDbId = webinarRecord?.id;
    console.log(`Webinar processed successfully with ID: ${webinarDbId}`);
    
    return { 
      success: true
    };
    
  } catch (error) {
    console.error(`❌ Error processing webinar ${webinar.id}:`, error);
    return { 
      success: false, 
      error: `Processing failed: ${error.message}` 
    };
  }
}
