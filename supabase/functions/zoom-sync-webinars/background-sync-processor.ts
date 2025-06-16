import { createZoomAPIClient } from './zoom-api-client.ts';
import { updateSyncLog, updateSyncStage, saveWebinarToDatabase } from './database-operations.ts';

export async function processBackgroundSync(supabase: any, syncOperation: any, connection: any, syncLogId: string) {
  console.log(`=== Background Sync Processor Start ===`);
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
        console.log(`Heartbeat sent for sync ${syncLogId}`);
      } catch (error) {
        console.error('Heartbeat failed:', error);
      }
    }, 30000); // Every 30 seconds
    
    const client = await createZoomAPIClient(connection, supabase);
    
    await updateSyncStage(supabase, syncLogId, null, 'fetching_webinars', 0);
    
    let webinars: any[] = [];
    const now = new Date();
    
    if (syncOperation.syncType === 'initial') {
      console.log('Starting initial sync - fetching comprehensive webinar data');
      
      // For initial sync, get both past and upcoming webinars with extended range
      const pastDate = new Date(now.getTime() - (90 * 24 * 60 * 60 * 1000)); // 90 days ago
      const futureDate = new Date(now.getTime() + (90 * 24 * 60 * 60 * 1000)); // 90 days future
      
      console.log(`Fetching webinars from ${pastDate.toISOString()} to ${futureDate.toISOString()}`);
      
      const [pastWebinars, upcomingWebinars] = await Promise.all([
        client.listWebinarsWithRange({
          from: pastDate,
          to: now,
          type: 'past'
        }),
        client.listWebinarsWithRange({
          from: now,
          to: futureDate,
          type: 'upcoming'
        })
      ]);
      
      webinars = [...pastWebinars, ...upcomingWebinars];
      console.log(`Initial sync found: ${pastWebinars.length} past + ${upcomingWebinars.length} upcoming = ${webinars.length} total webinars`);
    } else {
      console.log('Starting incremental sync - fetching recent webinar updates');
      
      // For incremental sync, get recent past and upcoming webinars
      const recentDate = new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000)); // 7 days ago
      const futureDate = new Date(now.getTime() + (30 * 24 * 60 * 60 * 1000)); // 30 days future
      
      console.log(`Fetching webinars from ${recentDate.toISOString()} to ${futureDate.toISOString()}`);
      
      const [recentWebinars, upcomingWebinars] = await Promise.all([
        client.listWebinarsWithRange({
          from: recentDate,
          to: now,
          type: 'past'
        }),
        client.listWebinarsWithRange({
          from: now,
          to: futureDate,
          type: 'upcoming'
        })
      ]);
      
      webinars = [...recentWebinars, ...upcomingWebinars];
      console.log(`Incremental sync found: ${recentWebinars.length} recent + ${upcomingWebinars.length} upcoming = ${webinars.length} total webinars`);
    }
    
    // Remove duplicates by webinar ID
    const uniqueWebinars = webinars.reduce((acc, webinar) => {
      if (!acc.find(w => w.id === webinar.id)) {
        acc.push(webinar);
      }
      return acc;
    }, []);
    
    console.log(`After deduplication: ${uniqueWebinars.length} unique webinars`);
    
    await updateSyncLog(supabase, syncLogId, {
      total_items: uniqueWebinars.length,
      sync_stage: 'processing_webinars'
    });
    
    let processedCount = 0;
    let errorCount = 0;
    const errors: string[] = [];
    
    // Process webinars with enhanced status detection
    for (const webinarData of uniqueWebinars) {
      try {
        const progress = Math.round((processedCount / uniqueWebinars.length) * 100);
        await updateSyncStage(supabase, syncLogId, webinarData.id, 'processing_webinar', progress);
        
        console.log(`Processing webinar ${processedCount + 1}/${uniqueWebinars.length}: ${webinarData.topic} (${webinarData.id})`);
        
        // Enhanced status detection logic
        let currentStatus = webinarData.status;
        const webinarStartTime = new Date(webinarData.start_time);
        const webinarEndTime = new Date(webinarStartTime.getTime() + (webinarData.duration * 60 * 1000));
        const currentTime = new Date();
        
        // Determine accurate status based on timing and API response
        if (currentTime < webinarStartTime) {
          // Future webinar
          currentStatus = 'available';
        } else if (currentTime >= webinarStartTime && currentTime <= webinarEndTime) {
          // Currently happening
          try {
            const liveStatus = await client.getWebinarStatus(webinarData.id);
            currentStatus = liveStatus || 'started';
          } catch (statusError) {
            console.log(`Could not get live status for ${webinarData.id}, defaulting to 'started'`);
            currentStatus = 'started';
          }
        } else {
          // Past webinar
          try {
            const finalStatus = await client.getWebinarStatus(webinarData.id);
            currentStatus = finalStatus || 'ended';
          } catch (statusError) {
            console.log(`Could not get final status for ${webinarData.id}, defaulting to 'ended'`);
            currentStatus = 'ended';
          }
        }
        
        // Update webinar data with accurate status
        const webinarWithStatus = {
          ...webinarData,
          status: currentStatus
        };
        
        await saveWebinarToDatabase(supabase, webinarWithStatus, connection.id);
        processedCount++;
        
        console.log(`✓ Processed webinar: ${webinarData.topic} with status: ${currentStatus}`);
        
        // Update progress
        await updateSyncLog(supabase, syncLogId, {
          processed_items: processedCount
        });
        
      } catch (error) {
        console.error(`Error processing webinar ${webinarData.id}:`, error);
        errorCount++;
        errors.push(`Webinar ${webinarData.id}: ${error.message}`);
        
        // Continue processing other webinars
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
      error_details: errors.length > 0 ? { errors } : null,
      completed_at: new Date().toISOString(),
      duration_seconds: Math.round(duration / 1000)
    });
    
    console.log(`=== Background Sync Completed Successfully ===`);
    console.log(`Duration: ${Math.round(duration / 1000)}s, Processed: ${processedCount}, Errors: ${errorCount}, Total: ${uniqueWebinars.length}`);
    
  } catch (error) {
    console.error(`=== Background Sync Failed ===`);
    console.error('Sync error details:', error);
    
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
      console.error('Failed to update sync log on error:', updateError);
    }
    
    throw error;
  } finally {
    // Clear heartbeat
    if (heartbeatInterval) {
      clearInterval(heartbeatInterval);
      console.log('Heartbeat cleared');
    }
  }
}
