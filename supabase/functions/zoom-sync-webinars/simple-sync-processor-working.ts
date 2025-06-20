import { updateSyncLog, updateSyncStage } from './database-operations.ts';
import { createZoomAPIClient } from './zoom-api-client.ts';

console.log('📦 WORKING Simple sync processor loaded successfully');

export interface SyncOperation {
  id: string;
  connection_id: string;
  sync_type: string;
  status: string;
  options?: {
    debug?: boolean;
    testMode?: boolean;
    forceRegistrantSync?: boolean;
  };
}

export async function processSimpleWebinarSync(
  supabase: any,
  syncOperation: SyncOperation,
  connection: any,
  syncLogId: string
): Promise<void> {
  console.log(`🚀 Starting WORKING webinar sync for connection: ${connection.id}`);
  
  let processedCount = 0;
  let totalWebinars = 0;
  const BATCH_SIZE = 5; // Smaller batch size for reliability
  
  try {
    // Update sync status to in_progress
    await updateSyncLog(supabase, syncLogId, {
      sync_status: 'in_progress',
      started_at: new Date().toISOString()
    });

    // Create Zoom API client
    const client = await createZoomAPIClient(connection, supabase);
    console.log('✅ Zoom API client created successfully');
    
    await updateSyncStage(supabase, syncLogId, null, 'fetching_webinars', 10);
    
    // Fetch webinars from Zoom - SIMPLIFIED
    const webinars = await client.listWebinarsWithRange({
      type: 'all',
      page_size: 300
    });
    
    totalWebinars = webinars.length;
    console.log(`📊 Found ${totalWebinars} webinars to process`);
    
    await updateSyncLog(supabase, syncLogId, {
      total_items: totalWebinars,
      processed_items: 0
    });
    
    if (totalWebinars === 0) {
      await updateSyncLog(supabase, syncLogId, {
        sync_status: 'completed',
        completed_at: new Date().toISOString(),
        processed_items: 0,
        stage_progress_percentage: 100
      });
      return;
    }
    
    await updateSyncStage(supabase, syncLogId, null, 'processing_webinars', 20);
    
    // Process webinars in smaller batches - SIMPLIFIED
    for (let batchStart = 0; batchStart < webinars.length; batchStart += BATCH_SIZE) {
      const batchEnd = Math.min(batchStart + BATCH_SIZE, webinars.length);
      const batch = webinars.slice(batchStart, batchEnd);
      
      console.log(`📦 Processing batch ${Math.floor(batchStart / BATCH_SIZE) + 1} (webinars ${batchStart + 1}-${batchEnd})`);
      
      // Process webinars sequentially to avoid overwhelming APIs
      for (let i = 0; i < batch.length; i++) {
        const webinar = batch[i];
        const overallIndex = batchStart + i;
        const progressPercentage = 20 + Math.round((overallIndex / totalWebinars) * 70);
        
        try {
          console.log(`🔄 Processing webinar ${overallIndex + 1}/${totalWebinars}: ${webinar.id}`);
          
          await updateSyncStage(supabase, syncLogId, webinar.id?.toString(), 'processing_webinar', progressPercentage);
          
          // Get detailed webinar data
          const webinarDetails = await client.getWebinar(webinar.id);
          
          // Store webinar in database - SIMPLIFIED
          const wasStored = await storeWebinarSimple(supabase, webinarDetails, connection.id);
          
          if (wasStored) {
            processedCount++;
            console.log(`✅ Webinar ${webinar.id} stored (${processedCount}/${totalWebinars})`);
          } else {
            console.error(`❌ Failed to store webinar ${webinar.id}`);
          }
          
        } catch (error) {
          console.error(`❌ Error processing webinar ${webinar.id}:`, error.message);
        }
      }
      
      // Update progress after each batch
      await updateSyncLog(supabase, syncLogId, {
        processed_items: processedCount
      });
      
      console.log(`✅ Batch complete: processed ${processedCount}/${totalWebinars} total webinars`);
    }
    
    // Mark sync as completed
    await updateSyncLog(supabase, syncLogId, {
      sync_status: 'completed',
      completed_at: new Date().toISOString(),
      processed_items: processedCount,
      stage_progress_percentage: 100
    });
    
    console.log(`🎉 Sync completed! Processed ${processedCount}/${totalWebinars} webinars`);
    
  } catch (error) {
    console.error(`💥 Sync failed:`, error);
    
    await updateSyncLog(supabase, syncLogId, {
      sync_status: 'failed',
      completed_at: new Date().toISOString(),
      error_message: error.message,
      processed_items: processedCount
    });
    
    throw error;
  }
}

// SIMPLIFIED webinar storage function
async function storeWebinarSimple(
  supabase: any, 
  webinar: any, 
  connectionId: string
): Promise<boolean> {
  try {
    const settings = webinar.settings || {};
    
    const webinarData: any = {
      webinar_id: webinar.id?.toString(),
      webinar_uuid: webinar.uuid,
      connection_id: connectionId,
      topic: webinar.topic,
      type: webinar.type,
      start_time: webinar.start_time,
      duration: webinar.duration,
      timezone: webinar.timezone,
      status: webinar.status,
      host_id: webinar.host_id,
      host_email: webinar.host_email,
      total_registrants: webinar.registrants_count || 0,
      join_url: webinar.join_url || settings.join_url,
      registration_url: webinar.registration_url || settings.registration_url,
      start_url: webinar.start_url || settings.start_url,
      password: webinar.password || settings.password,
      agenda: webinar.agenda,
      settings: settings && Object.keys(settings).length > 0 ? settings : null,
      synced_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      participant_sync_status: 'pending'
    };
    
    // Remove undefined values
    Object.keys(webinarData).forEach(key => {
      if (webinarData[key] === undefined) {
        delete webinarData[key];
      }
    });
    
    console.log(`💾 Upserting webinar ${webinar.id}...`);
    
    const { error } = await supabase
      .from('zoom_webinars')
      .upsert(webinarData, {
        onConflict: 'webinar_id,connection_id',
        returning: 'minimal'
      });

    if (error) {
      console.error(`❌ Database error for webinar ${webinar.id}:`, error);
      return false;
    }
    
    console.log(`✅ Successfully upserted webinar ${webinar.id}`);
    return true;
    
  } catch (error) {
    console.error(`💥 Exception storing webinar ${webinar.id}:`, error);
    return false;
  }
}
