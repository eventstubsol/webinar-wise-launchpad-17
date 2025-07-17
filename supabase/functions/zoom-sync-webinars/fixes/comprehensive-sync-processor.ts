import { updateSyncLog, updateSyncStage } from '../database-operations.ts';
import { createZoomAPIClient } from '../zoom-api-client.ts';

console.log('📦 Comprehensive sync processor with participant/registrant storage loaded');

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

export async function processComprehensiveWebinarSync(
  supabase: any,
  syncOperation: SyncOperation,
  connection: any,
  syncLogId: string
): Promise<void> {
  console.log(`🚀 Starting comprehensive webinar sync for connection: ${connection.id}`);
  
  let processedCount = 0;
  let totalWebinars = 0;
  let totalParticipants = 0;
  let totalRegistrants = 0;
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
    console.log('✅ Zoom API client created successfully');
    
    await updateSyncStage(supabase, syncLogId, null, 'fetching_webinars', 10);
    
    // Fetch all webinars (past and upcoming)
    const [pastWebinars, upcomingWebinars] = await Promise.all([
      client.listWebinarsWithRange({ type: 'past', page_size: 300 }),
      client.listWebinarsWithRange({ type: 'upcoming', page_size: 300 })
    ]);
    
    const allWebinars = [...pastWebinars, ...upcomingWebinars];
    totalWebinars = testMode ? Math.min(allWebinars.length, TEST_MODE_LIMIT) : allWebinars.length;
    const webinarsToProcess = testMode ? allWebinars.slice(0, TEST_MODE_LIMIT) : allWebinars;
    
    console.log(`📊 Found ${allWebinars.length} webinars total (${pastWebinars.length} past, ${upcomingWebinars.length} upcoming)`);
    console.log(`📊 Processing ${totalWebinars} webinars ${testMode ? '(test mode)' : ''}`);
    
    await updateSyncLog(supabase, syncLogId, {
      total_items: totalWebinars,
      processed_items: 0,
      current_operation: `Found ${totalWebinars} webinars to process`
    });
    
    if (totalWebinars === 0) {
      await updateSyncLog(supabase, syncLogId, {
        sync_status: 'completed',
        completed_at: new Date().toISOString(),
        processed_items: 0,
        stage_progress_percentage: 100,
        current_operation: 'No webinars found to sync'
      });
      return;
    }
    
    await updateSyncStage(supabase, syncLogId, null, 'processing_webinars', 20);
    
    // Process webinars in smaller batches
    for (let batchStart = 0; batchStart < webinarsToProcess.length; batchStart += BATCH_SIZE) {
      const batchEnd = Math.min(batchStart + BATCH_SIZE, webinarsToProcess.length);
      const batch = webinarsToProcess.slice(batchStart, batchEnd);
      
      console.log(`📦 Processing batch ${Math.floor(batchStart / BATCH_SIZE) + 1} (webinars ${batchStart + 1}-${batchEnd})`);
      
      // Process webinars sequentially
      for (let i = 0; i < batch.length; i++) {
        const webinar = batch[i];
        const overallIndex = batchStart + i;
        const progressPercentage = 20 + Math.round((overallIndex / totalWebinars) * 70);
        
        try {
          console.log(`\n🔄 Processing webinar ${overallIndex + 1}/${totalWebinars}: ${webinar.id} - ${webinar.topic}`);
          
          await updateSyncStage(supabase, syncLogId, webinar.id?.toString(), 'fetching_webinar_details', progressPercentage);
          
          // Get detailed webinar data
          const webinarDetails = await client.getWebinar(webinar.id);
          
          // Determine webinar status properly
          const isPastWebinar = determineIfPastWebinar(webinarDetails);
          const properStatus = determineProperStatus(webinarDetails, isPastWebinar);
          
          console.log(`📅 Webinar ${webinar.id} - Past: ${isPastWebinar}, Status: ${properStatus}`);
          
          // Store webinar in database with proper status
          const storedWebinar = await storeWebinarWithProperStatus(
            supabase, 
            webinarDetails, 
            connection.id,
            properStatus,
            isPastWebinar
          );
          
          if (!storedWebinar || !storedWebinar.id) {
            console.error(`❌ Failed to store webinar ${webinar.id} - no data returned`);
            continue;
          }
          
          const webinarDbId = storedWebinar.id;
          console.log(`✅ Webinar ${webinar.id} stored with DB ID: ${webinarDbId}`);
          
          // Now sync participants and registrants for past webinars
          if (isPastWebinar) {
            await updateSyncLog(supabase, syncLogId, {
              current_operation: `Syncing participants and registrants for webinar ${webinar.topic}`
            });
            
            // Sync participants
            try {
              console.log(`👥 Fetching participants for webinar ${webinar.id}`);
              const participants = await client.getWebinarParticipants(webinar.id);
              
              if (participants.length > 0) {
                console.log(`📊 Found ${participants.length} participants, storing in database...`);
                const storedCount = await storeParticipants(supabase, participants, webinarDbId, webinar.id);
                totalParticipants += storedCount;
                console.log(`✅ Stored ${storedCount} participants for webinar ${webinar.id}`);
                
                // Update webinar with participant count
                await updateWebinarCounts(supabase, webinarDbId, {
                  total_attendees: storedCount
                });
              } else {
                console.log(`📭 No participants found for webinar ${webinar.id}`);
              }
            } catch (error) {
              console.error(`⚠️ Error syncing participants for webinar ${webinar.id}:`, error.message);
            }
            
            // Sync registrants
            try {
              console.log(`📝 Fetching registrants for webinar ${webinar.id}`);
              const registrants = await client.getWebinarRegistrants(webinar.id);
              
              if (registrants.length > 0) {
                console.log(`📊 Found ${registrants.length} registrants, storing in database...`);
                const storedCount = await storeRegistrants(supabase, registrants, webinarDbId, webinar.id);
                totalRegistrants += storedCount;
                console.log(`✅ Stored ${storedCount} registrants for webinar ${webinar.id}`);
                
                // Update webinar with registrant count and calculate absentees
                await updateWebinarCounts(supabase, webinarDbId, {
                  total_registrants: storedCount
                });
              } else {
                console.log(`📭 No registrants found for webinar ${webinar.id}`);
              }
            } catch (error) {
              console.error(`⚠️ Error syncing registrants for webinar ${webinar.id}:`, error.message);
            }
          }
          
          processedCount++;
          console.log(`✅ Webinar ${webinar.id} fully processed (${processedCount}/${totalWebinars})`);
          
        } catch (error) {
          console.error(`❌ Error processing webinar ${webinar.id}:`, error.message);
          if (!testMode) {
            throw error;
          }
        }
      }
      
      // Update progress after each batch
      await updateSyncLog(supabase, syncLogId, {
        processed_items: processedCount,
        sync_progress: Math.round((processedCount / totalWebinars) * 100),
        current_operation: `Processed ${processedCount} of ${totalWebinars} webinars`
      });
      
      console.log(`✅ Batch complete: processed ${processedCount}/${totalWebinars} total webinars`);
    }
    
    // Mark sync as completed
    await updateSyncLog(supabase, syncLogId, {
      sync_status: 'completed',
      completed_at: new Date().toISOString(),
      processed_items: processedCount,
      stage_progress_percentage: 100,
      sync_progress: 100,
      current_operation: `Sync completed! Processed ${processedCount} webinars, ${totalParticipants} participants, ${totalRegistrants} registrants`,
      metadata: {
        total_webinars: processedCount,
        total_participants: totalParticipants,
        total_registrants: totalRegistrants
      }
    });
    
    console.log(`🎉 Comprehensive sync completed!`);
    console.log(`   - Webinars: ${processedCount}`);
    console.log(`   - Participants: ${totalParticipants}`);
    console.log(`   - Registrants: ${totalRegistrants}`);
    
  } catch (error) {
    console.error(`💥 Comprehensive sync failed:`, error);
    
    await updateSyncLog(supabase, syncLogId, {
      sync_status: 'failed',
      completed_at: new Date().toISOString(),
      error_message: error.message,
      processed_items: processedCount,
      current_operation: `Sync failed: ${error.message}`
    });
    
    throw error;
  }
}

function determineIfPastWebinar(webinar: any): boolean {
  // Check multiple conditions to determine if webinar is past
  if (webinar.status === 'finished' || webinar.status === 'ended') {
    return true;
  }
  
  if (webinar.start_time) {
    const startTime = new Date(webinar.start_time);
    const now = new Date();
    return startTime < now;
  }
  
  return false;
}

function determineProperStatus(webinar: any, isPast: boolean): string {
  // Map Zoom statuses to our database statuses
  if (isPast) {
    if (webinar.status === 'finished' || webinar.status === 'ended') {
      return 'ended';
    }
    // If it's past but status is still 'scheduled', it means it was likely cancelled or no-show
    if (webinar.status === 'scheduled') {
      return 'ended'; // We'll still mark it as ended since it's past
    }
  } else {
    if (webinar.status === 'scheduled' || webinar.status === 'upcoming') {
      return 'scheduled';
    }
    if (webinar.status === 'started' || webinar.status === 'live') {
      return 'live';
    }
  }
  
  // Default fallback
  return webinar.status || 'unknown';
}

async function storeWebinarWithProperStatus(
  supabase: any, 
  webinar: any, 
  connectionId: string,
  status: string,
  isPastWebinar: boolean
): Promise<any> {
  try {
    const settings = webinar.settings || {};
    
    const webinarData: any = {
      // Core identification fields
      zoom_webinar_id: webinar.id?.toString(),
      webinar_id: webinar.id?.toString(),
      webinar_uuid: webinar.uuid || `webinar-${webinar.id}-${Date.now()}`,
      connection_id: connectionId,
      
      // Basic webinar information with proper status
      topic: webinar.topic,
      type: webinar.type,
      start_time: webinar.start_time,
      duration: webinar.duration,
      timezone: webinar.timezone,
      status: status, // Use our determined status
      
      // Host information
      host_id: webinar.host_id,
      host_email: webinar.host_email,
      
      // Registration information
      registration_required: webinar.registration_required || settings.registration_required || false,
      registration_type: settings.registration_type || webinar.registration_type,
      approval_type: settings.approval_type || webinar.approval_type,
      
      // URLs
      join_url: webinar.join_url,
      registration_url: webinar.registration_url,
      start_url: webinar.start_url,
      
      // Initial counts (will be updated after syncing participants/registrants)
      total_registrants: 0,
      total_attendees: 0,
      total_absentees: 0,
      
      // Password fields
      password: webinar.password,
      
      // Description/agenda
      agenda: webinar.agenda,
      
      // JSON fields
      settings: settings && Object.keys(settings).length > 0 ? settings : null,
      
      // Sync metadata
      synced_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      last_synced_at: new Date().toISOString(),
      participant_sync_status: isPastWebinar ? 'pending' : 'not_applicable'
    };
    
    // Remove undefined values
    Object.keys(webinarData).forEach(key => {
      if (webinarData[key] === undefined) {
        delete webinarData[key];
      }
    });
    
    console.log(`💾 Storing webinar ${webinar.id} with status: ${status}`);
    
    const { data, error } = await supabase
      .from('zoom_webinars')
      .upsert(webinarData, {
        onConflict: 'connection_id,zoom_webinar_id',
        ignoreDuplicates: false
      })
      .select('id, webinar_id')
      .single();

    if (error) {
      console.error(`❌ Database error for webinar ${webinar.id}:`, error);
      return null;
    }
    
    return data;
    
  } catch (error) {
    console.error(`💥 Exception storing webinar ${webinar.id}:`, error);
    return null;
  }
}

async function storeParticipants(
  supabase: any,
  participants: any[],
  webinarDbId: string,
  zoomWebinarId: string
): Promise<number> {
  if (!participants || participants.length === 0) {
    return 0;
  }
  
  try {
    // Transform participants for database storage
    const participantRecords = participants.map(participant => ({
      webinar_id: webinarDbId,
      zoom_webinar_id: zoomWebinarId,
      participant_id: participant.id || participant.user_id || `${participant.email}-${Date.now()}`,
      user_id: participant.user_id,
      user_name: participant.user_name || participant.name,
      email: participant.email,
      join_time: participant.join_time,
      leave_time: participant.leave_time,
      duration: participant.duration || 0,
      attentiveness_score: participant.attentiveness_score,
      status: participant.status || 'attended',
      customer_key: participant.customer_key,
      updated_at: new Date().toISOString()
    }));
    
    // Insert in batches of 100
    const BATCH_SIZE = 100;
    let insertedCount = 0;
    
    for (let i = 0; i < participantRecords.length; i += BATCH_SIZE) {
      const batch = participantRecords.slice(i, i + BATCH_SIZE);
      
      const { data, error } = await supabase
        .from('zoom_participants')
        .upsert(batch, {
          onConflict: 'webinar_id,participant_id',
          ignoreDuplicates: false
        })
        .select('id');
      
      if (error) {
        console.error(`❌ Error inserting participant batch:`, error);
      } else {
        insertedCount += data?.length || 0;
      }
    }
    
    // Update participant sync status
    await supabase
      .from('zoom_webinars')
      .update({
        participant_sync_status: 'synced',
        participant_sync_attempted_at: new Date().toISOString()
      })
      .eq('id', webinarDbId);
    
    return insertedCount;
    
  } catch (error) {
    console.error(`💥 Exception storing participants:`, error);
    return 0;
  }
}

async function storeRegistrants(
  supabase: any,
  registrants: any[],
  webinarDbId: string,
  zoomWebinarId: string
): Promise<number> {
  if (!registrants || registrants.length === 0) {
    return 0;
  }
  
  try {
    // Transform registrants for database storage
    const registrantRecords = registrants.map(registrant => ({
      webinar_id: webinarDbId,
      zoom_webinar_id: zoomWebinarId,
      registrant_id: registrant.id || registrant.registrant_id || `${registrant.email}-${Date.now()}`,
      email: registrant.email,
      first_name: registrant.first_name,
      last_name: registrant.last_name,
      status: registrant.status || 'approved',
      create_time: registrant.create_time || registrant.registration_time,
      join_url: registrant.join_url,
      custom_questions: registrant.custom_questions,
      updated_at: new Date().toISOString()
    }));
    
    // Insert in batches of 100
    const BATCH_SIZE = 100;
    let insertedCount = 0;
    
    for (let i = 0; i < registrantRecords.length; i += BATCH_SIZE) {
      const batch = registrantRecords.slice(i, i + BATCH_SIZE);
      
      const { data, error } = await supabase
        .from('zoom_registrants')
        .upsert(batch, {
          onConflict: 'webinar_id,registrant_id',
          ignoreDuplicates: false
        })
        .select('id');
      
      if (error) {
        console.error(`❌ Error inserting registrant batch:`, error);
      } else {
        insertedCount += data?.length || 0;
      }
    }
    
    return insertedCount;
    
  } catch (error) {
    console.error(`💥 Exception storing registrants:`, error);
    return 0;
  }
}

async function updateWebinarCounts(
  supabase: any,
  webinarDbId: string,
  counts: { total_attendees?: number; total_registrants?: number }
): Promise<void> {
  try {
    // First get current counts
    const { data: currentWebinar, error: fetchError } = await supabase
      .from('zoom_webinars')
      .select('total_attendees, total_registrants')
      .eq('id', webinarDbId)
      .single();
    
    if (fetchError) {
      console.error(`❌ Error fetching webinar for count update:`, fetchError);
      return;
    }
    
    // Calculate updated values
    const updates: any = {
      updated_at: new Date().toISOString()
    };
    
    if (counts.total_attendees !== undefined) {
      updates.total_attendees = counts.total_attendees;
    }
    
    if (counts.total_registrants !== undefined) {
      updates.total_registrants = counts.total_registrants;
    }
    
    // Calculate absentees if we have both values
    const attendees = counts.total_attendees ?? currentWebinar.total_attendees ?? 0;
    const registrants = counts.total_registrants ?? currentWebinar.total_registrants ?? 0;
    updates.total_absentees = Math.max(0, registrants - attendees);
    
    // Update the webinar
    const { error: updateError } = await supabase
      .from('zoom_webinars')
      .update(updates)
      .eq('id', webinarDbId);
    
    if (updateError) {
      console.error(`❌ Error updating webinar counts:`, updateError);
    } else {
      console.log(`✅ Updated webinar ${webinarDbId} counts - Attendees: ${attendees}, Registrants: ${registrants}, Absentees: ${updates.total_absentees}`);
    }
    
  } catch (error) {
    console.error(`💥 Exception updating webinar counts:`, error);
  }
}
