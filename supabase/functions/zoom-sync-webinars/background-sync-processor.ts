import { createZoomAPIClient } from './zoom-api-client.ts';
import { updateSyncLog, updateSyncStage } from './database-operations.ts';
import { WebinarFetcher } from './webinar-fetcher.ts';
import { SequentialWebinarProcessor } from './webinar-processor.ts';

export async function processBackgroundSync(supabase: any, syncOperation: any, connection: any, syncLogId: string) {
  console.log(`=== ENHANCED SEQUENTIAL SYNC PROCESSOR START ===`);
  console.log(`Sync ID: ${syncLogId}, Type: ${syncOperation.syncType}, Connection: ${connection.id}`);
  
  const startTime = Date.now();
  let heartbeatInterval: number | null = null;
  
  try {
    // Start heartbeat to keep sync alive
    heartbeatInterval = setInterval(async () => {
      try {
        await updateSyncLog(supabase, syncLogId, {
          updated_at: new Date().toISOString()
        });
        console.log(`💓 Heartbeat sent for sync ${syncLogId}`);
      } catch (error) {
        console.error('💔 Heartbeat failed:', error);
      }
    }, 30000); // Every 30 seconds
    
    const client = await createZoomAPIClient(connection, supabase);
    console.log(`🔌 Zoom API client created successfully`);
    
    await updateSyncStage(supabase, syncLogId, null, 'fetching_webinars', 0);
    
    // Step 1: Fetch all webinars
    console.log(`\n🎯 STEP 1: FETCHING WEBINARS`);
    const fetcher = new WebinarFetcher(client);
    const webinars = await fetcher.fetchWebinars(syncOperation.syncType);
    
    if (webinars.length === 0) {
      console.log(`ℹ️ No webinars found to process`);
      await updateSyncLog(supabase, syncLogId, {
        sync_status: 'completed',
        total_items: 0,
        processed_items: 0,
        completed_at: new Date().toISOString(),
        duration_seconds: Math.round((Date.now() - startTime) / 1000)
      });
      return;
    }
    
    await updateSyncLog(supabase, syncLogId, {
      total_items: webinars.length,
      sync_stage: 'processing_webinars'
    });
    
    console.log(`\n🎯 STEP 2: SEQUENTIAL WEBINAR PROCESSING`);
    console.log(`📋 Processing ${webinars.length} webinars sequentially (1 by 1)`);
    
    // Step 2: Process each webinar sequentially
    const processor = new SequentialWebinarProcessor(client, supabase, syncLogId, connection.id);
    let processedCount = 0;
    let errorCount = 0;
    let participantDataCount = 0;
    const errors: string[] = [];
    
    for (let i = 0; i < webinars.length; i++) {
      const webinarData = webinars[i];
      
      try {
        await processor.processWebinar(webinarData, i, webinars.length);
        processedCount++;
        
        // Check if this webinar had participant data
        if (await this.webinarHasParticipantData(supabase, webinarData.id, connection.id)) {
          participantDataCount++;
        }
        
        // Update progress
        await updateSyncLog(supabase, syncLogId, {
          processed_items: processedCount
        });
        
      } catch (error) {
        console.error(`💥 ERROR processing webinar ${i + 1}/${webinars.length} (${webinarData.id}):`, error.message);
        errorCount++;
        errors.push(`Webinar ${webinarData.id}: ${error.message}`);
        
        // Update error count but continue processing
        await updateSyncLog(supabase, syncLogId, {
          processed_items: processedCount,
          failed_items: errorCount
        });
      }
    }
    
    // Complete the sync
    const duration = Date.now() - startTime;
    await updateSyncStage(supabase, syncLogId, null, 'completed', 100);
    
    await updateSyncLog(supabase, syncLogId, {
      sync_status: 'completed',
      processed_items: processedCount,
      failed_items: errorCount,
      error_details: errors.length > 0 ? { errors, webinarsWithParticipantData: participantDataCount } : null,
      completed_at: new Date().toISOString(),
      duration_seconds: Math.round(duration / 1000)
    });
    
    console.log(`\n=== ENHANCED SEQUENTIAL SYNC COMPLETED SUCCESSFULLY ===`);
    console.log(`⏱️ Duration: ${Math.round(duration / 1000)}s`);
    console.log(`✅ Processed: ${processedCount}/${webinars.length} webinars`);
    console.log(`❌ Errors: ${errorCount}`);
    console.log(`👥 Webinars with participant data: ${participantDataCount}`);
    console.log(`📊 Total webinars: ${webinars.length}`);
    
  } catch (error) {
    console.error(`=== ENHANCED SEQUENTIAL SYNC FAILED ===`);
    console.error('💥 Sync error details:', error);
    
    const duration = Date.now() - startTime;
    const errorDetails = {
      message: error.message,
      status: error.status,
      isAuthError: error.isAuthError || false,
      duration: Math.round(duration / 1000),
      stack: error.stack
    };
    
    // Ensure sync status is properly updated on failure
    try {
      await updateSyncLog(supabase, syncLogId, {
        sync_status: 'failed',
        error_message: error.message,
        error_details: errorDetails,
        completed_at: new Date().toISOString(),
        duration_seconds: Math.round(duration / 1000)
      });
    } catch (updateError) {
      console.error('❌ Failed to update sync log on error:', updateError);
    }
    
    throw error;
  } finally {
    // Clear heartbeat
    if (heartbeatInterval) {
      clearInterval(heartbeatInterval);
      console.log('💓 Heartbeat cleared');
    }
  }
}

/**
 * Check if a webinar has participant data in the database
 */
async function webinarHasParticipantData(supabase: any, zoomWebinarId: string, connectionId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('zoom_participants')
    .select('id', { count: 'exact', head: true })
    .eq('webinar_id', (
      await supabase
        .from('zoom_webinars')
        .select('id')
        .eq('connection_id', connectionId)
        .eq('webinar_id', zoomWebinarId)
        .single()
    ).data?.id);
    
  if (error) return false;
  return (data || 0) > 0;
}
