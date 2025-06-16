
import { createZoomAPIClient } from './zoom-api-client.ts';
import { updateSyncLog, updateSyncStage, saveWebinarToDatabase } from './database-operations.ts';

export async function processSequentialSync(supabase: any, syncOperation: any, connection: any, syncLogId: string) {
  console.log(`=== Starting Sequential Sync Process ===`);
  console.log(`Sync ID: ${syncLogId}, Type: ${syncOperation.syncType}, Connection: ${connection.id}`);
  
  try {
    const client = await createZoomAPIClient(connection, supabase);
    
    await updateSyncStage(supabase, syncLogId, null, 'fetching_webinars', 0);
    
    let webinars: any[] = [];
    const now = new Date();
    
    if (syncOperation.syncType === 'initial') {
      console.log('Performing initial sync - fetching both past and upcoming webinars');
      
      // For initial sync, get both past and upcoming webinars
      const pastDate = new Date(now.getTime() - (90 * 24 * 60 * 60 * 1000)); // 90 days ago
      const futureDate = new Date(now.getTime() + (90 * 24 * 60 * 60 * 1000)); // 90 days future
      
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
      console.log('Performing incremental sync - fetching recent webinars');
      
      // For incremental sync, get recent past and upcoming webinars
      const recentDate = new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000)); // 7 days ago
      const futureDate = new Date(now.getTime() + (30 * 24 * 60 * 60 * 1000)); // 30 days future
      
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
    
    for (const webinarData of uniqueWebinars) {
      try {
        await updateSyncStage(supabase, syncLogId, webinarData.id, 'processing_webinar', 
          Math.round((processedCount / uniqueWebinars.length) * 100));
        
        console.log(`Processing webinar ${processedCount + 1}/${uniqueWebinars.length}: ${webinarData.topic} (${webinarData.id})`);
        
        // Get current status for accurate mapping
        let currentStatus = webinarData.status;
        
        // For past webinars that might not have accurate status in list response,
        // fetch individual webinar details to get current status
        const webinarStartTime = new Date(webinarData.start_time);
        const webinarEndTime = new Date(webinarStartTime.getTime() + (webinarData.duration * 60 * 1000));
        
        if (webinarStartTime < now && webinarEndTime < now) {
          // This is a past webinar - fetch current status
          try {
            console.log(`Fetching current status for past webinar: ${webinarData.id}`);
            currentStatus = await client.getWebinarStatus(webinarData.id);
            console.log(`Updated status for ${webinarData.id}: ${currentStatus}`);
          } catch (statusError) {
            console.log(`Could not fetch status for ${webinarData.id}, using list response status: ${webinarData.status}`);
            currentStatus = webinarData.status;
          }
        }
        
        // Update webinar data with correct status
        const webinarWithStatus = {
          ...webinarData,
          status: currentStatus
        };
        
        await saveWebinarToDatabase(supabase, webinarWithStatus, connection.id);
        processedCount++;
        
        console.log(`✓ Processed webinar: ${webinarData.topic} with status: ${currentStatus}`);
        
      } catch (error) {
        console.error(`Error processing webinar ${webinarData.id}:`, error);
        errorCount++;
      }
    }
    
    await updateSyncStage(supabase, syncLogId, null, 'completed', 100);
    
    await updateSyncLog(supabase, syncLogId, {
      sync_status: 'completed',
      processed_items: processedCount,
      error_count: errorCount,
      completed_at: new Date().toISOString()
    });
    
    console.log(`=== Sync Completed Successfully ===`);
    console.log(`Processed: ${processedCount}, Errors: ${errorCount}, Total: ${uniqueWebinars.length}`);
    
  } catch (error) {
    console.error(`=== Sync Failed ===`);
    console.error('Sync error details:', error);
    
    const errorDetails = {
      message: error.message,
      status: error.status,
      isAuthError: error.isAuthError || false
    };
    
    await updateSyncLog(supabase, syncLogId, {
      sync_status: 'failed',
      error_message: error.message,
      error_details: errorDetails,
      completed_at: new Date().toISOString()
    });
    
    throw error;
  }
}
