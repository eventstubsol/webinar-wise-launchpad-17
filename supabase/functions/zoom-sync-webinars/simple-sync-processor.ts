
import { updateSyncLog, updateSyncStage } from './database-operations.ts';
import { createZoomAPIClient } from './zoom-api-client.ts';

console.log('📦 Simple sync processor module loaded successfully');

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
  console.log('🔧 Sync operation:', JSON.stringify(syncOperation, null, 2));
  
  let processedCount = 0;
  let totalWebinars = 0;

  try {
    // Update sync status to in_progress
    console.log('📊 Updating sync status to in_progress...');
    await updateSyncLog(supabase, syncLogId, {
      sync_status: 'in_progress',
      started_at: new Date().toISOString()
    });

    // Create Zoom API client using the existing zoom-api-client from the same directory
    console.log('🔧 Creating Zoom API client...');
    const client = await createZoomAPIClient(connection, supabase);
    console.log('✅ Zoom API client created successfully');
    
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
      console.log('📭 No webinars found - completing sync');
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
        console.log(`📡 Fetching detailed data for webinar ${webinar.id}...`);
        const webinarDetails = await client.getWebinar(webinar.id);
        console.log(`✅ Webinar details fetched for ${webinar.id}`);
        
        // For past webinars, try to fetch participant count
        let totalAttendees = null;
        if (webinarDetails.status === 'finished' || new Date(webinarDetails.start_time) < new Date()) {
          try {
            console.log(`👥 Fetching participant count for past webinar ${webinar.id}...`);
            const participants = await client.getWebinarParticipants(webinar.id);
            totalAttendees = participants.length;
            console.log(`✅ Found ${totalAttendees} attendees for webinar ${webinar.id}`);
          } catch (error) {
            console.log(`⚠️ Could not fetch participants for webinar ${webinar.id}:`, error.message);
            // Continue without attendee count
          }
        }
        
        // Store webinar in database with attendee count if available
        console.log(`💾 Storing webinar ${webinar.id} in database...`);
        await storeWebinarInDatabase(supabase, webinarDetails, connection.id, totalAttendees);
        console.log(`✅ Webinar ${webinar.id} stored successfully`);
        
        processedCount++;
        
        // Update progress
        await updateSyncLog(supabase, syncLogId, {
          processed_items: processedCount
        });
        
        console.log(`✅ Processed webinar ${i + 1}/${totalWebinars} (${webinar.id})`);
        
      } catch (error) {
        console.error(`❌ Error processing webinar ${webinar.id}:`, error);
        // Continue with next webinar even if one fails
      }
    }
    
    // Mark sync as completed
    console.log('🎯 Finalizing sync operation...');
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

async function storeWebinarInDatabase(supabase: any, webinar: any, connectionId: string, totalAttendees?: number | null): Promise<void> {
  try {
    console.log(`💾 Storing webinar ${webinar.id} in database with connection ${connectionId}...`);
    console.log(`📊 Webinar data:`, JSON.stringify({
      id: webinar.id,
      registrants_count: webinar.registrants_count,
      total_members: webinar.total_members
    }));
    
    const { error } = await supabase
      .from('zoom_webinars')
      .upsert({
        webinar_id: webinar.id,
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
        // Store registrants count from Zoom API
        total_registrants: webinar.registrants_count || 0,
        // Store attendees count if available (for past webinars)
        total_attendees: totalAttendees !== undefined ? totalAttendees : null,
        webinar_created_at: webinar.created_at,
        synced_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'webinar_id,connection_id',
        ignoreDuplicates: false
      });

    if (error) {
      console.error(`❌ Error storing webinar ${webinar.id}:`, error);
      throw error;
    }
    
    console.log(`✅ Successfully stored webinar ${webinar.id} in database`);
  } catch (error) {
    console.error(`💥 Failed to store webinar ${webinar.id} in database:`, error);
    throw error;
  }
}
