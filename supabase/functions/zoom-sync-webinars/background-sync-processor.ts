import { createZoomAPIClient } from './zoom-api-client.ts';
import { updateSyncLog, updateSyncStage } from './database-operations.ts';
import { WebinarFetcher } from './webinar-fetcher.ts';
import { SimplifiedWebinarProcessor } from './simplified-webinar-processor.ts';

export async function processBackgroundSync(supabase: any, syncOperation: any, connection: any, syncLogId: string) {
  console.log(`🚀 === SIMPLIFIED SEQUENTIAL SYNC START ===`);
  console.log(`📊 Sync ID: ${syncLogId}, Type: ${syncOperation.syncType}, Connection: ${connection.id}`);
  console.log(`🎯 FOCUS: ONLY Webinars → Registrants → Participants`);
  
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
    
    console.log(`\n🎯 STEP 2: SIMPLIFIED SEQUENTIAL PROCESSING`);
    console.log(`📋 Processing ${webinars.length} webinars one by one (SIMPLIFIED)`);
    
    // Step 2: Process each webinar sequentially - SIMPLIFIED
    const processor = new SimplifiedWebinarProcessor(client, supabase, syncLogId, connection.id);
    let processedCount = 0;
    let errorCount = 0;
    let registrantDataCount = 0;
    let participantDataCount = 0;
    const errors: string[] = [];
    
    for (let i = 0; i < webinars.length; i++) {
      const webinarData = webinars[i];
      
      console.log(`\n🔄 ========================================`);
      console.log(`🔄 PROCESSING WEBINAR ${i + 1} of ${webinars.length}`);
      console.log(`🔄 Webinar ID: ${webinarData.id}`);
      console.log(`🔄 Title: ${webinarData.topic || 'Unknown Title'}`);
      console.log(`🔄 ========================================`);
      
      try {
        const result = await processor.processWebinar(webinarData, i, webinars.length);
        processedCount++;
        
        if (result.registrantCount > 0) {
          registrantDataCount++;
          console.log(`✅ Webinar ${i + 1}: ${result.registrantCount} registrants saved`);
        }
        
        if (result.participantCount > 0) {
          participantDataCount++;
          console.log(`✅ Webinar ${i + 1}: ${result.participantCount} participants saved`);
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
      error_details: errors.length > 0 ? { 
        errors, 
        webinarsWithRegistrantData: registrantDataCount,
        webinarsWithParticipantData: participantDataCount 
      } : null,
      completed_at: new Date().toISOString(),
      duration_seconds: Math.round(duration / 1000)
    });
    
    console.log(`\n✅ === SIMPLIFIED SEQUENTIAL SYNC COMPLETED ===`);
    console.log(`⏱️ Duration: ${Math.round(duration / 1000)}s`);
    console.log(`✅ Processed: ${processedCount}/${webinars.length} webinars`);
    console.log(`❌ Errors: ${errorCount}`);
    console.log(`📝 Webinars with registrant data: ${registrantDataCount}`);
    console.log(`👥 Webinars with participant data: ${participantDataCount}`);
    console.log(`📊 Total webinars: ${webinars.length}`);
    
  } catch (error) {
    console.error(`=== SIMPLIFIED SEQUENTIAL SYNC FAILED ===`);
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
