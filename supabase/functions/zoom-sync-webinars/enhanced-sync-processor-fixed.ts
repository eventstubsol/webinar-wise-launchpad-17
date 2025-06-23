import { updateSyncLog, updateSyncStage } from './database-operations.ts';
import { createZoomAPIClient } from './zoom-api-client.ts';

console.log('📦 Enhanced sync processor FIXED with proper count tracking loaded successfully');

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

export async function processEnhancedWebinarSync(
  supabase: any,
  syncOperation: SyncOperation,
  connection: any,
  syncLogId: string
): Promise<void> {
  console.log(`🚀 Starting enhanced webinar sync for connection: ${connection.id}`);
  
  let processedCount = 0;
  let totalWebinars = 0;
  const testMode = syncOperation.options?.testMode || false;
  const BATCH_SIZE = testMode ? 2 : 5;
  const TEST_MODE_LIMIT = 5;
  
  try {
    // Update sync status to in_progress
    await updateSyncLog(supabase, syncLogId, {
      sync_status: 'in_progress',
      started_at: new Date().toISOString()
    });

    // Create Zoom API client with token refresh support
    const client = await createZoomAPIClient(connection, supabase);
    console.log('✅ Enhanced Zoom API client created successfully');
    
    await updateSyncStage(supabase, syncLogId, null, 'fetching_webinars', 10);
    
    // Fetch webinars from Zoom
    const webinars = await client.listWebinarsWithRange({
      type: testMode ? 'past' : 'all',
      page_size: testMode ? 50 : 300
    });
    
    totalWebinars = testMode ? Math.min(webinars.length, TEST_MODE_LIMIT) : webinars.length;
    const webinarsToProcess = testMode ? webinars.slice(0, TEST_MODE_LIMIT) : webinars;
    
    console.log(`📊 Found ${webinars.length} webinars total, processing ${totalWebinars} ${testMode ? '(test mode)' : ''}`);
    
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
    
    // Process webinars in smaller batches
    for (let batchStart = 0; batchStart < webinarsToProcess.length; batchStart += BATCH_SIZE) {
      const batchEnd = Math.min(batchStart + BATCH_SIZE, webinarsToProcess.length);
      const batch = webinarsToProcess.slice(batchStart, batchEnd);
      
      console.log(`📦 Processing batch ${Math.floor(batchStart / BATCH_SIZE) + 1} (webinars ${batchStart + 1}-${batchEnd}) ${testMode ? '[TEST MODE]' : ''}`);
      
      // Process webinars sequentially
      for (let i = 0; i < batch.length; i++) {
        const webinar = batch[i];
        const overallIndex = batchStart + i;
        const progressPercentage = 20 + Math.round((overallIndex / totalWebinars) * 70);
        
        try {
          console.log(`🔄 Processing webinar ${overallIndex + 1}/${totalWebinars}: ${webinar.id} ${testMode ? '[TEST]' : ''}`);
          
          await updateSyncStage(supabase, syncLogId, webinar.id?.toString(), 'processing_webinar', progressPercentage);
          
          // Get detailed webinar data
          const webinarDetails = await client.getWebinar(webinar.id);
          
          // Store webinar in database - FIXED: return the stored webinar data
          const storedWebinar = await storeWebinarEnhanced(supabase, webinarDetails, connection.id);
          
          // FIXED: Check if we got a webinar object back (not just a boolean)
          if (storedWebinar && storedWebinar.webinar_id) {
            processedCount++;
            console.log(`✅ Webinar ${webinar.id} stored successfully (${processedCount}/${totalWebinars}) ${testMode ? '[TEST]' : ''}`);
          } else {
            console.error(`❌ Failed to store webinar ${webinar.id} - no data returned`);
          }
          
        } catch (error) {
          console.error(`❌ Error processing webinar ${webinar.id}:`, error.message);
          // In test mode, continue processing other webinars
          if (!testMode) {
            throw error;
          }
        }
      }
      
      // Update progress after each batch
      await updateSyncLog(supabase, syncLogId, {
        processed_items: processedCount
      });
      
      console.log(`✅ Batch complete: processed ${processedCount}/${totalWebinars} total webinars ${testMode ? '[TEST MODE]' : ''}`);
    }
    
    // Mark sync as completed
    await updateSyncLog(supabase, syncLogId, {
      sync_status: 'completed',
      completed_at: new Date().toISOString(),
      processed_items: processedCount,
      stage_progress_percentage: 100
    });
    
    console.log(`🎉 Enhanced sync completed! Processed ${processedCount}/${totalWebinars} webinars ${testMode ? '[TEST MODE]' : ''}`);
    
  } catch (error) {
    console.error(`💥 Enhanced sync failed:`, error);
    
    await updateSyncLog(supabase, syncLogId, {
      sync_status: 'failed',
      completed_at: new Date().toISOString(),
      error_message: error.message,
      processed_items: processedCount
    });
    
    throw error;
  }
}

// FIXED: Return the stored webinar data instead of just a boolean
async function storeWebinarEnhanced(
  supabase: any, 
  webinar: any, 
  connectionId: string
): Promise<any> {
  try {
    const settings = webinar.settings || {};
    
    // Enhanced field extraction with comprehensive fallback logic
    const webinarData: any = {
      // Core identification fields
      webinar_id: webinar.id?.toString(),
      webinar_uuid: webinar.uuid || `webinar-${webinar.id}-${Date.now()}`, // Provide default if missing
      connection_id: connectionId,
      
      // Basic webinar information
      topic: webinar.topic,
      type: webinar.type,
      start_time: webinar.start_time,
      duration: webinar.duration,
      timezone: webinar.timezone,
      status: webinar.status,
      
      // Host information
      host_id: webinar.host_id,
      host_email: webinar.host_email,
      
      // Alternative hosts
      alternative_hosts: (() => {
        const altHosts = settings.alternative_hosts || webinar.alternative_hosts;
        if (!altHosts || altHosts === '') return null;
        if (typeof altHosts === 'string') {
          return altHosts.split(',').map(h => h.trim()).filter(h => h.length > 0);
        }
        return Array.isArray(altHosts) ? altHosts : null;
      })(),
      
      // Registration information
      registration_required: webinar.registration_required || settings.registration_required || false,
      registration_type: settings.registration_type || webinar.registration_type,
      approval_type: settings.approval_type || webinar.approval_type,
      max_registrants: settings.registrants_restrict_number || webinar.max_registrants,
      max_attendees: webinar.max_attendees || settings.max_attendees,
      
      // URLs
      join_url: webinar.join_url || settings.join_url,
      registration_url: webinar.registration_url || settings.registration_url,
      start_url: webinar.start_url || settings.start_url,
      
      // Attendance data
      total_registrants: webinar.registrants_count || webinar.total_registrants || 0,
      total_attendees: webinar.total_attendees || webinar.participants_count,
      total_minutes: webinar.total_minutes,
      avg_attendance_duration: webinar.avg_attendance_duration,
      
      // Password fields
      password: webinar.password || settings.password,
      h323_password: settings.h323_password || webinar.h323_password,
      pstn_password: settings.pstn_password || webinar.pstn_password,
      h323_passcode: settings.h323_passcode || webinar.h323_passcode,
      encrypted_password: webinar.encrypted_password,
      encrypted_passcode: webinar.encrypted_passcode,
      
      // Description/agenda
      agenda: webinar.agenda || webinar.description,
      
      // JSON fields
      settings: settings && Object.keys(settings).length > 0 ? settings : null,
      tracking_fields: (() => {
        const tf = webinar.tracking_fields;
        return (tf && Array.isArray(tf) && tf.length > 0) ? tf : null;
      })(),
      recurrence: (() => {
        const rec = webinar.recurrence;
        return (rec && typeof rec === 'object' && Object.keys(rec).length > 0) ? rec : null;
      })(),
      occurrences: (() => {
        const occ = webinar.occurrences;
        return (occ && Array.isArray(occ) && occ.length > 0) ? occ : null;
      })(),
      
      // Additional metadata
      occurrence_id: webinar.occurrence_id,
      creation_source: webinar.creation_source || 'api',
      is_simulive: webinar.is_simulive || false,
      record_file_id: webinar.record_file_id,
      transition_to_live: webinar.transition_to_live || false,
      webinar_created_at: webinar.created_at,
      
      // Sync metadata
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
    
    // FIXED: Use 'select' to get the stored data back
    const { data, error } = await supabase
      .from('zoom_webinars')
      .upsert(webinarData, {
        onConflict: 'webinar_id,connection_id',
        ignoreDuplicates: false
      })
      .select('webinar_id')
      .single();

    if (error) {
      console.error(`❌ Database error for webinar ${webinar.id}:`, error);
      return null;
    }
    
    console.log(`✅ Successfully upserted enhanced webinar ${webinar.id}`);
    return data;
    
  } catch (error) {
    console.error(`💥 Exception storing enhanced webinar ${webinar.id}:`, error);
    return null;
  }
}
