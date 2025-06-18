
import { updateSyncLog, updateSyncStage } from './database-operations.ts';
import { createZoomAPIClient } from './zoom-api-client.ts';

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
  console.log(`🚀 Starting simple webinar sync for connection: ${connection.id}`);
  
  let processedCount = 0;
  let totalWebinars = 0;

  try {
    // Update sync status to in_progress
    await updateSyncLog(supabase, syncLogId, {
      sync_status: 'in_progress',
      started_at: new Date().toISOString()
    });

    // Create Zoom API client using the existing zoom-api-client from the same directory
    const client = await createZoomAPIClient(connection, supabase);
    
    await updateSyncStage(supabase, syncLogId, null, 'fetching_webinars', 10);
    console.log(`📡 Fetching webinars from Zoom API...`);
    
    // Fetch webinars from Zoom using the proper API client
    const webinars = await client.listWebinarsWithRange({
      type: 'all'
    });
    
    totalWebinars = webinars.length;
    console.log(`📊 Found ${totalWebinars} webinars to sync`);
    
    // Update total items count
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
      console.log(`✅ Sync completed - no webinars found`);
      return;
    }
    
    await updateSyncStage(supabase, syncLogId, null, 'processing_webinars', 20);
    
    // Process each webinar
    for (let i = 0; i < webinars.length; i++) {
      const webinar = webinars[i];
      const progressPercentage = 20 + Math.round(((i) / totalWebinars) * 70);
      
      try {
        console.log(`🔄 Processing webinar ${i + 1}/${totalWebinars}: ${webinar.id}`);
        
        await updateSyncStage(
          supabase, 
          syncLogId, 
          webinar.id?.toString(), 
          'processing_webinar', 
          progressPercentage
        );
        
        // Get detailed webinar data
        const webinarDetails = await client.getWebinar(webinar.id);
        
        // Store webinar in database
        await storeWebinarInDatabase(supabase, webinarDetails, connection.id);
        
        processedCount++;
        
        // Update progress
        await updateSyncLog(supabase, syncLogId, {
          processed_items: processedCount
        });
        
        console.log(`✅ Processed webinar ${i + 1}/${totalWebinars}`);
        
      } catch (error) {
        console.error(`❌ Error processing webinar ${webinar.id}:`, error);
        // Continue with next webinar even if one fails
      }
    }
    
    // Mark sync as completed
    await updateSyncLog(supabase, syncLogId, {
      sync_status: 'completed',
      completed_at: new Date().toISOString(),
      processed_items: processedCount,
      stage_progress_percentage: 100
    });
    
    console.log(`🎉 Sync completed successfully! Processed ${processedCount}/${totalWebinars} webinars`);
    
  } catch (error) {
    console.error(`💥 Sync failed:`, error);
    
    // Mark sync as failed
    await updateSyncLog(supabase, syncLogId, {
      sync_status: 'failed',
      completed_at: new Date().toISOString(),
      error_message: error.message,
      processed_items: processedCount
    });
    
    throw error;
  }
}

async function storeWebinarInDatabase(supabase: any, webinar: any, connectionId: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('zoom_webinars')
      .upsert({
        zoom_webinar_id: webinar.id,
        uuid: webinar.uuid,
        connection_id: connectionId,
        topic: webinar.topic,
        type: webinar.type,
        start_time: webinar.start_time,
        duration: webinar.duration,
        timezone: webinar.timezone,
        status: webinar.status,
        host_id: webinar.host_id,
        host_email: webinar.host_email,
        created_at: webinar.created_at,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'zoom_webinar_id,connection_id'
      });

    if (error) {
      console.error('Error storing webinar:', error);
      throw error;
    }
  } catch (error) {
    console.error('Failed to store webinar in database:', error);
    throw error;
  }
}
