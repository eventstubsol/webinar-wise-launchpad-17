/**
 * Webinar sync service - handles fetching and storing webinar data
 */

import { createZoomClient } from './zoom-client.ts';
import { updateSyncProgress } from './sync-log.ts';

interface SyncResult {
  processedCount: number;
  totalCount: number;
}

export async function webinarSync(
  supabase: any,
  connection: any,
  syncLogId: string
): Promise<SyncResult> {
  console.log('🔄 Starting webinar sync...');

  try {
    // Create Zoom API client
    const zoomClient = await createZoomClient(connection);
    
    // Fetch all webinars
    console.log('📥 Fetching webinars from Zoom...');
    const webinars = await zoomClient.listAllWebinars('past');
    const totalCount = webinars.length;
    
    console.log(`📊 Found ${totalCount} webinars to sync`);
    
    // Update initial progress
    await updateSyncProgress(supabase, syncLogId, 0, totalCount);
    
    let processedCount = 0;
    const batchSize = 10;
    
    // Process webinars in batches
    for (let i = 0; i < webinars.length; i += batchSize) {
      const batch = webinars.slice(i, Math.min(i + batchSize, webinars.length));
      
      console.log(`📦 Processing batch ${Math.floor(i / batchSize) + 1} (${batch.length} webinars)`);
      
      // Process each webinar in the batch
      const processPromises = batch.map(async (webinar) => {
        try {
          // Get detailed webinar data
          const detailedWebinar = await zoomClient.getWebinar(webinar.id);
          
          // Store webinar in database
          await storeWebinar(supabase, detailedWebinar, connection.id);
          
          return true;
        } catch (error) {
          console.error(`❌ Failed to process webinar ${webinar.id}:`, error);
          return false;
        }
      });
      
      // Wait for batch to complete
      const results = await Promise.all(processPromises);
      const successCount = results.filter(r => r).length;
      processedCount += successCount;
      
      // Update progress
      await updateSyncProgress(supabase, syncLogId, processedCount, totalCount);
      
      console.log(`✅ Batch complete: ${processedCount}/${totalCount} webinars processed`);
    }
    
    console.log(`🎉 Webinar sync completed: ${processedCount}/${totalCount} webinars synced`);
    
    return {
      processedCount,
      totalCount
    };
    
  } catch (error) {
    console.error('💥 Webinar sync failed:', error);
    throw error;
  }
}

async function storeWebinar(
  supabase: any,
  webinar: any,
  connectionId: string
): Promise<void> {
  const webinarData = {
    // Core fields
    webinar_id: webinar.id?.toString(),
    webinar_uuid: webinar.uuid || `webinar-${webinar.id}`,
    connection_id: connectionId,
    
    // Basic info
    topic: webinar.topic,
    type: webinar.type,
    start_time: webinar.start_time,
    duration: webinar.duration,
    timezone: webinar.timezone,
    status: webinar.status,
    
    // Host info
    host_id: webinar.host_id,
    host_email: webinar.host_email,
    
    // Registration info
    registration_required: webinar.settings?.registration_required || false,
    registration_type: webinar.settings?.registration_type,
    approval_type: webinar.settings?.approval_type,
    max_registrants: webinar.settings?.registrants_restrict_number,
    max_attendees: webinar.settings?.attendees_restrict,
    
    // URLs
    join_url: webinar.join_url,
    registration_url: webinar.registration_url,
    start_url: webinar.start_url,
    
    // Attendance metrics
    total_registrants: webinar.registrants_count || 0,
    total_attendees: webinar.participants_count || 0,
    
    // Additional fields
    agenda: webinar.agenda,
    password: webinar.password,
    
    // JSON fields
    settings: webinar.settings || {},
    tracking_fields: webinar.tracking_fields || [],
    recurrence: webinar.recurrence || null,
    occurrences: webinar.occurrences || [],
    
    // Timestamps
    webinar_created_at: webinar.created_at,
    synced_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
  
  // Remove undefined values
  Object.keys(webinarData).forEach(key => {
    if (webinarData[key] === undefined) {
      delete webinarData[key];
    }
  });
  
  const { error } = await supabase
    .from('zoom_webinars')
    .upsert(webinarData, {
      onConflict: 'webinar_id,connection_id'
    });
  
  if (error) {
    console.error(`Failed to store webinar ${webinar.id}:`, error);
    throw error;
  }
}
