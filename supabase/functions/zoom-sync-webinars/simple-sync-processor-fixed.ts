import { updateSyncLog, updateSyncStage } from './database-operations.ts';
import { createZoomAPIClient } from './zoom-api-client.ts';

console.log('📦 Fixed Simple sync processor module loaded successfully');

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

interface SyncErrors {
  webinarErrors: Array<{ webinarId: string; error: string }>;
  participantErrors: Array<{ webinarId: string; error: string }>;
  registrantErrors: Array<{ webinarId: string; error: string }>;
}

export async function processSimpleWebinarSync(
  supabase: any,
  syncOperation: SyncOperation,
  connection: any,
  syncLogId: string
): Promise<void> {
  console.log(`🚀 Starting FIXED simple webinar sync for connection: ${connection.id}`);
  console.log('🔧 Sync operation:', JSON.stringify(syncOperation, null, 2));
  
  const isTestMode = syncOperation.options?.testMode || false;
  
  if (isTestMode) {
    console.log('🧪 TEST MODE ENABLED - Processing limited data');
  }
  
  let processedCount = 0;
  let totalWebinars = 0;
  const BATCH_SIZE = isTestMode ? 2 : 10; // Smaller batch size in test mode
  const SKIP_PARTICIPANTS = false;
  const PARTICIPANT_FETCH_LIMIT = isTestMode ? 2 : 5; // Fewer participants in test mode
  const syncErrors: SyncErrors = {
    webinarErrors: [],
    participantErrors: [],
    registrantErrors: []
  };

  try {
    // Update sync status to in_progress
    console.log('📊 Updating sync status to in_progress...');
    await updateSyncLog(supabase, syncLogId, {
      sync_status: 'in_progress',
      started_at: new Date().toISOString()
    });

    // Create Zoom API client
    console.log('🔧 Creating Zoom API client...');
    const client = await createZoomAPIClient(connection, supabase);
    console.log('✅ Zoom API client created successfully');
    
    await updateSyncStage(supabase, syncLogId, null, 'fetching_webinars', 10);
    console.log(`📡 Fetching webinars from Zoom API...`);
    
    // Fetch webinars from Zoom
    const webinars = await client.listWebinarsWithRange({
      type: syncOperation.options?.debug ? 'past' : 'all',
      page_size: isTestMode ? 10 : 300
    });
    
    // In test mode, limit webinars
    const webinarsToProcess = isTestMode ? webinars.slice(0, 5) : webinars;
    
    totalWebinars = webinarsToProcess.length;
    console.log(`📊 Found ${webinars.length} webinars, processing ${totalWebinars} (test mode: ${isTestMode})`);
    
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
    
    // Process webinars in batches
    let participantsFetched = 0;
    for (let batchStart = 0; batchStart < webinarsToProcess.length; batchStart += BATCH_SIZE) {
      const batchEnd = Math.min(batchStart + BATCH_SIZE, webinarsToProcess.length);
      const batch = webinarsToProcess.slice(batchStart, batchEnd);
      
      console.log(`📦 Processing batch ${Math.floor(batchStart / BATCH_SIZE) + 1} (webinars ${batchStart + 1}-${batchEnd} of ${totalWebinars})`);
      
      // Process webinars in parallel within the batch
      const batchPromises = batch.map(async (webinar, batchIndex) => {
        const i = batchStart + batchIndex;
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
          
          // Enhanced logging for debugging - log FULL structure for first 3 webinars
          if (i < 3 || syncOperation.options?.debug) {
            console.log(`🔍 Full webinar details for ${webinar.id}:`, JSON.stringify(webinarDetails, null, 2));
          }
          
          // Fetch participants for past webinars
          let totalAttendees = null;
          let participantError = null;
          const shouldFetchParticipants = !SKIP_PARTICIPANTS && 
            participantsFetched < PARTICIPANT_FETCH_LIMIT &&
            (webinarDetails.status === 'finished' || webinarDetails.status === 'ended' || 
             (webinarDetails.start_time && new Date(webinarDetails.start_time) < new Date()));
          
          if (shouldFetchParticipants) {
            console.log(`👥 Fetching participants for webinar ${webinar.id} (${participantsFetched + 1}/${PARTICIPANT_FETCH_LIMIT})...`);
            const participantsResult = await client.getWebinarParticipants(webinar.id);
            
            if (participantsResult.error) {
              participantError = participantsResult.error;
              syncErrors.participantErrors.push({
                webinarId: webinar.id,
                error: participantsResult.error.message
              });
              console.error(`⚠️ Participant fetch error for webinar ${webinar.id}:`, participantsResult.error);
            } else {
              totalAttendees = participantsResult.data.length;
              participantsFetched++;
              console.log(`✅ Found ${totalAttendees} attendees for webinar ${webinar.id}`);
              
              // Store participants in the database if we got any
              if (participantsResult.data.length > 0) {
                console.log(`💾 Storing ${participantsResult.data.length} participants for webinar ${webinar.id}...`);
                await storeParticipantsInDatabase(supabase, participantsResult.data, webinar.id, connection.id);
              }
            }
            
            // Also try to fetch registrants
            const registrantsResult = await client.getWebinarRegistrants(webinar.id);
            
            if (registrantsResult.error) {
              syncErrors.registrantErrors.push({
                webinarId: webinar.id,
                error: registrantsResult.error.message
              });
              console.error(`⚠️ Registrant fetch error for webinar ${webinar.id}:`, registrantsResult.error);
            } else {
              webinarDetails.registrants_count = registrantsResult.data.length;
              console.log(`✅ Found ${registrantsResult.data.length} registrants for webinar ${webinar.id}`);
              
              // Store registrants in the database if we got any
              if (registrantsResult.data.length > 0) {
                console.log(`💾 Storing ${registrantsResult.data.length} registrants for webinar ${webinar.id}...`);
                await storeRegistrantsInDatabase(supabase, registrantsResult.data, webinar.id, connection.id);
              }
            }
          } else if (SKIP_PARTICIPANTS) {
            console.log(`⏭️ Skipping participant fetch for webinar ${webinar.id} (participants disabled)`);
          } else if (participantsFetched >= PARTICIPANT_FETCH_LIMIT) {
            console.log(`⏸️ Skipping participant fetch for webinar ${webinar.id} (limit reached: ${PARTICIPANT_FETCH_LIMIT})`);
          }
          
          // Store webinar in database with attendee count if available
          console.log(`💾 Storing webinar ${webinar.id} in database...`);
          const wasStored = await storeWebinarInDatabaseFixed(supabase, webinarDetails, connection.id, totalAttendees, participantError);
          
          if (wasStored) {
            console.log(`✅ Webinar ${webinar.id} stored successfully`);
            return true; // Success
          } else {
            console.error(`❌ Failed to store webinar ${webinar.id}`);
            return false; // Failed
          }
          
        } catch (error) {
          console.error(`❌ Error processing webinar ${webinar.id}:`, error);
          console.error(`❌ Full error details:`, error);
          
          syncErrors.webinarErrors.push({
            webinarId: webinar.id,
            error: error.message || 'Unknown error'
          });
          
          // Log the specific webinar that failed
          console.error(`❌ Failed webinar details:`, {
            id: webinar.id,
            topic: webinar.topic,
            error_message: error.message || 'Unknown error'
          });
          return false; // Failed
        }
      });
      
      // Wait for batch to complete
      const results = await Promise.all(batchPromises);
      const batchProcessedCount = results.filter(success => success).length;
      processedCount += batchProcessedCount;
      
      // Update progress after each batch
      await updateSyncLog(supabase, syncLogId, {
        processed_items: processedCount
      });
      
      console.log(`✅ Batch complete: ${batchProcessedCount}/${batch.length} webinars processed successfully (total processed: ${processedCount}/${totalWebinars})`);
    }
    
    // Prepare error summary
    const errorSummary = syncErrors.webinarErrors.length > 0 || 
                        syncErrors.participantErrors.length > 0 || 
                        syncErrors.registrantErrors.length > 0
      ? {
          webinar_errors: syncErrors.webinarErrors.length,
          participant_errors: syncErrors.participantErrors.length,
          registrant_errors: syncErrors.registrantErrors.length,
          details: syncErrors
        }
      : null;
    
    // Mark sync as completed
    console.log('🎯 Finalizing sync operation...');
    await updateSyncLog(supabase, syncLogId, {
      sync_status: 'completed',
      completed_at: new Date().toISOString(),
      processed_items: processedCount,
      stage_progress_percentage: 100,
      error_details: errorSummary
    });
    
    console.log(`🎉 Sync completed successfully! Processed ${processedCount}/${totalWebinars} webinars`);
    console.log(`💡 Participant data fetched for ${participantsFetched} webinars (limit: ${PARTICIPANT_FETCH_LIMIT})`);
    
    if (errorSummary) {
      console.log(`⚠️ Sync completed with errors:`, errorSummary);
    }
    
    if (participantsFetched < totalWebinars && !SKIP_PARTICIPANTS) {
      console.log(`🔄 Additional syncs needed to fetch remaining participant data`);
    }
    
  } catch (error) {
    console.error(`💥 Sync failed:`, error);
    
    // Mark sync as failed
    await updateSyncLog(supabase, syncLogId, {
      sync_status: 'failed',
      completed_at: new Date().toISOString(),
      error_message: error.message,
      processed_items: processedCount,
      error_details: syncErrors
    });
    
    throw error;
  }
}

// FIXED: This function now properly returns a success indicator
async function storeWebinarInDatabaseFixed(
  supabase: any, 
  webinar: any, 
  connectionId: string, 
  totalAttendees?: number | null,
  participantError?: any
): Promise<boolean> {
  try {
    console.log(`💾 Storing webinar ${webinar.id} in database with connection ${connectionId}...`);
    
    // Log the complete webinar object structure for debugging
    console.log(`📊 Webinar structure analysis for ${webinar.id}:`, {
      hasSettings: !!webinar.settings,
      settingsKeys: webinar.settings ? Object.keys(webinar.settings).slice(0, 10) : [],
      rootLevelKeys: Object.keys(webinar).slice(0, 20),
      hasPassword: !!webinar.password,
      hasEncryptedPassword: !!webinar.encrypted_password,
      passwordInSettings: webinar.settings?.password ? 'yes' : 'no',
      registrationUrl: webinar.registration_url || 'not at root',
      registrationUrlInSettings: webinar.settings?.registration_url || 'not in settings'
    });
    
    // Determine participant sync status based on webinar state
    let participantSyncStatus: string = 'not_applicable';
    let participantSyncError: string | null = null;
    
    const now = new Date();
    const webinarStartTime = webinar.start_time ? new Date(webinar.start_time) : null;
    
    if (participantError) {
      participantSyncStatus = 'failed';
      participantSyncError = participantError.message;
    } else if (!webinarStartTime) {
      participantSyncStatus = 'not_applicable';
      participantSyncError = 'No start time available';
    } else if (webinarStartTime > now) {
      // Future webinar
      participantSyncStatus = 'not_applicable';
      participantSyncError = `Webinar has not occurred yet. Start time: ${webinarStartTime.toISOString()}, Current time: ${now.toISOString()}`;
    } else if (webinar.status === 'finished' || webinar.status === 'ended') {
      // Past webinar that has finished - eligible for participant sync
      participantSyncStatus = totalAttendees !== null ? 'synced' : 'pending';
      participantSyncError = null;
      console.log(`🎯 Webinar ${webinar.id} marked for participant sync (status: ${webinar.status})`);
    } else if (webinarStartTime < now) {
      // Past webinar but not marked as finished yet
      const hoursSinceStart = (now.getTime() - webinarStartTime.getTime()) / (1000 * 60 * 60);
      if (hoursSinceStart > 24) {
        // If more than 24 hours have passed, assume it's finished and needs sync
        participantSyncStatus = totalAttendees !== null ? 'synced' : 'pending';
        participantSyncError = null;
        console.log(`🎯 Webinar ${webinar.id} marked for participant sync (24+ hours since start)`);
      } else {
        participantSyncStatus = 'not_applicable';
        participantSyncError = 'Webinar may still be in progress';
      }
    }
    
    // Extract fields from settings object - settings contains most of the configuration
    const settings = webinar.settings || {};
    
    // Extract password from the join URL if not available in response
    let extractedPassword = null;
    if (!webinar.password && !settings.password && webinar.join_url) {
      const pwdMatch = webinar.join_url.match(/pwd=([^&]+)/);
      if (pwdMatch) {
        extractedPassword = pwdMatch[1];
        console.log(`🔑 Extracted password from join URL for webinar ${webinar.id}`);
      }
    }
    
    // Helper function to safely truncate strings
    const truncateString = (str: string | null | undefined, maxLength: number): string | null => {
      if (!str) return null;
      if (str.length <= maxLength) return str;
      console.warn(`⚠️ Truncating string from ${str.length} to ${maxLength} chars`);
      return str.substring(0, maxLength);
    };

    // Prepare webinar data with all available fields
    const webinarData: any = {
      // Basic fields
      webinar_id: truncateString(webinar.id?.toString(), 255),
      webinar_uuid: truncateString(webinar.uuid, 255),
      connection_id: connectionId,
      topic: truncateString(webinar.topic, 500),
      type: webinar.type,
      start_time: webinar.start_time,
      duration: webinar.duration,
      timezone: truncateString(webinar.timezone, 100),
      status: truncateString(webinar.status, 50),
      host_id: truncateString(webinar.host_id, 255),
      host_email: truncateString(webinar.host_email, 255),
      
      // Registration and attendance
      total_registrants: webinar.registrants_count || 0,
      total_attendees: totalAttendees !== undefined ? totalAttendees : null,
      
      // URLs - Check multiple possible locations
      join_url: webinar.join_url || settings.join_url || null,
      registration_url: webinar.registration_url || settings.registration_url || settings.registrants_confirmation_email?.body || null,
      start_url: webinar.start_url || settings.start_url || null,
      
      // Passwords - check all possible locations and extract from URL if needed
      password: truncateString(webinar.password || settings.password || extractedPassword, 255),
      h323_password: truncateString(webinar.h323_password || settings.h323_password, 255),
      pstn_password: truncateString(webinar.pstn_password || settings.pstn_password, 255),
      encrypted_password: truncateString(webinar.encrypted_password || settings.encrypted_password, 255),
      h323_passcode: truncateString(webinar.h323_passcode || settings.h323_passcode, 255),
      encrypted_passcode: truncateString(webinar.encrypted_passcode || settings.encrypted_passcode, 255),
      
      // Settings and configuration
      approval_type: webinar.approval_type || settings.approval_type || null,
      registration_type: webinar.registration_type || settings.registration_type || null,
      registration_required: settings.approval_type !== null || settings.registration_type !== null || !!webinar.registration_url,
      max_registrants: settings.registrants_restrict_number ? (settings.registrants_restriction || null) : null,
      max_attendees: settings.attendees_restrict_number ? (settings.attendees_restriction || null) : null,
      
      // Additional fields
      agenda: webinar.agenda,
      alternative_hosts: settings.alternative_hosts ? 
        (typeof settings.alternative_hosts === 'string' ? 
          settings.alternative_hosts.split(',').map((h: string) => h.trim()) : 
          settings.alternative_hosts) : null,
      audio: webinar.audio || settings.audio || null,
      auto_recording: settings.auto_recording || null,
      
      // Settings object - store the COMPLETE settings object, not an empty one
      settings: settings && Object.keys(settings).length > 0 ? settings : null,
      
      // Tracking and recurrence
      tracking_fields: webinar.tracking_fields || settings.tracking_fields || null,
      recurrence: webinar.recurrence || null,
      occurrences: webinar.occurrences || null,
      
      // Occurrence specific
      occurrence_id: webinar.occurrence_id || null,
      
      // Creation info
      creation_source: webinar.creation_source || null,
      is_simulive: webinar.is_simulive || false,
      record_file_id: webinar.record_file_id || null,
      transition_to_live: webinar.transition_to_live || false,
      
      // Participant sync status
      participant_sync_status: participantSyncStatus,
      participant_sync_error: participantSyncError,
      participant_sync_attempted_at: totalAttendees !== null || participantError ? new Date().toISOString() : null,
      participant_sync_api_used: totalAttendees !== null ? 'report' : null,
      
      // Timestamps
      webinar_created_at: webinar.created_at,
      synced_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    // Calculate additional metrics if we have attendee data
    if (totalAttendees !== null && totalAttendees > 0) {
      // These would need to be calculated from participant data
      // For now, we'll leave them as is
      webinarData.total_minutes = webinar.total_minutes || null;
      webinarData.avg_attendance_duration = webinar.avg_attendance_duration || null;
    }
    
    // Remove undefined values to avoid overwriting with null
    Object.keys(webinarData).forEach(key => {
      if (webinarData[key] === undefined) {
        delete webinarData[key];
      }
    });
    
    console.log(`📄 Upserting webinar with ${Object.keys(webinarData).length} fields`);
    console.log(`🔐 Password fields populated:`, {
      password: !!webinarData.password,
      h323_password: !!webinarData.h323_password,
      encrypted_password: !!webinarData.encrypted_password,
      settings_stored: !!webinarData.settings
    });
    
    // FIXED: Proper upsert logic with better error handling
    const { data, error } = await supabase
      .from('zoom_webinars')
      .upsert(webinarData, {
        onConflict: 'webinar_id,connection_id',
        returning: 'minimal'
      });

    if (error) {
      console.error(`❌ Error storing webinar ${webinar.id}:`, error);
      console.error(`❌ Error details:`, JSON.stringify(error, null, 2));
      console.error(`❌ Webinar data that failed:`, JSON.stringify(webinarData, null, 2));
      return false; // Return false on failure
    }
    
    console.log(`✅ Successfully stored webinar ${webinar.id} in database (sync status: ${participantSyncStatus})`);
    return true; // Return true on success
  } catch (error) {
    console.error(`💥 Failed to store webinar ${webinar.id} in database:`, error);
    return false; // Return false on exception
  }
}

async function storeParticipantsInDatabase(supabase: any, participants: any[], webinarId: string, connectionId: string): Promise<void> {
  try {
    // First, get the webinar UUID from the database
    const { data: webinarData, error: webinarError } = await supabase
      .from('zoom_webinars')
      .select('id')
      .eq('webinar_id', webinarId)
      .eq('connection_id', connectionId)
      .single();
    
    if (webinarError || !webinarData) {
      console.error(`❌ Could not find webinar ${webinarId} in database`);
      return;
    }
    
    // Prepare participant records
    const participantRecords = participants.map(participant => ({
      webinar_id: webinarData.id,
      registrant_id: participant.registrant_id || null,
      participant_id: participant.id || participant.participant_id || null,
      participant_user_id: participant.user_id || null,
      participant_email: participant.email || null,
      participant_name: participant.name || participant.display_name || 'Unknown',
      join_time: participant.join_time,
      leave_time: participant.leave_time,
      duration: participant.duration || 0,
      attentiveness_score: participant.attentiveness_score || null,
      customer_key: participant.customer_key || null,
      status: participant.status || 'attended',
      failover: participant.failover || false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }));
    
    // Batch insert participants
    const { error } = await supabase
      .from('zoom_participants')
      .upsert(participantRecords, {
        onConflict: 'webinar_id,participant_id'
      });
    
    if (error) {
      console.error(`❌ Error storing participants for webinar ${webinarId}:`, error);
      throw error;
    }
    
    console.log(`✅ Successfully stored ${participants.length} participants for webinar ${webinarId}`);
  } catch (error) {
    console.error(`💥 Failed to store participants for webinar ${webinarId}:`, error);
    throw error;
  }
}

async function storeRegistrantsInDatabase(supabase: any, registrants: any[], webinarId: string, connectionId: string): Promise<void> {
  try {
    // First, get the webinar UUID from the database
    const { data: webinarData, error: webinarError } = await supabase
      .from('zoom_webinars')
      .select('id')
      .eq('webinar_id', webinarId)
      .eq('connection_id', connectionId)
      .single();
    
    if (webinarError || !webinarData) {
      console.error(`❌ Could not find webinar ${webinarId} in database`);
      return;
    }
    
    // Prepare registrant records
    const registrantRecords = registrants.map(registrant => ({
      webinar_id: webinarData.id,
      registrant_id: registrant.id || registrant.registrant_id,
      registrant_email: registrant.email,
      first_name: registrant.first_name || null,
      last_name: registrant.last_name || null,
      phone: registrant.phone || null,
      address: registrant.address || null,
      city: registrant.city || null,
      country: registrant.country || null,
      zip: registrant.zip || null,
      state: registrant.state || null,
      comments: registrant.comments || null,
      custom_questions: registrant.custom_questions || {},
      registration_time: registrant.create_time || registrant.registration_time || new Date().toISOString(),
      status: registrant.status || 'approved',
      job_title: registrant.job_title || null,
      purchasing_time_frame: registrant.purchasing_time_frame || null,
      role_in_purchase_process: registrant.role_in_purchase_process || null,
      no_of_employees: registrant.no_of_employees || null,
      industry: registrant.industry || null,
      org: registrant.org || null,
      language: registrant.language || null,
      join_url: registrant.join_url || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }));
    
    // Batch insert registrants
    const { error } = await supabase
      .from('zoom_registrants')
      .upsert(registrantRecords, {
        onConflict: 'webinar_id,registrant_id'
      });
    
    if (error) {
      console.error(`❌ Error storing registrants for webinar ${webinarId}:`, error);
      throw error;
    }
    
    console.log(`✅ Successfully stored ${registrants.length} registrants for webinar ${webinarId}`);
  } catch (error) {
    console.error(`💥 Failed to store registrants for webinar ${webinarId}:`, error);
    throw error;
  }
}
