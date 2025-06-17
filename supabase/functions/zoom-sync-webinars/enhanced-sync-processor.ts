
import { updateSyncLog, updateSyncStage } from './database-operations.ts';
import { SyncOperation } from './types.ts';

export async function processEnhancedWebinarSync(
  supabase: any,
  syncOperation: SyncOperation,
  connection: any,
  syncLogId: string
): Promise<void> {
  console.log(`Starting enhanced webinar sync for connection: ${connection.id}`);
  
  try {
    // Initialize Zoom API client
    const zoomApi = await import('./zoom-api-client.ts');
    const client = await zoomApi.createZoomAPIClient(connection, supabase);
    
    // Fetch webinars list
    console.log('Fetching webinars list...');
    await updateSyncStage(supabase, syncLogId, null, 'fetching_webinars', 10);
    
    const webinars = await client.listWebinarsWithRange({
      type: 'all'
    });
    
    console.log(`Found ${webinars.length} webinars to sync`);
    
    if (webinars.length === 0) {
      await updateSyncLog(supabase, syncLogId, {
        sync_status: 'completed',
        processed_items: 0,
        completed_at: new Date().toISOString(),
        sync_stage: 'completed',
        stage_progress_percentage: 100
      });
      return;
    }
    
    let processedCount = 0;
    let successCount = 0;
    let registrantsTotal = 0;
    let participantsTotal = 0;
    const totalWebinars = webinars.length;
    
    // Process each webinar with comprehensive data
    for (const webinar of webinars) {
      try {
        const webinarProgress = Math.round((processedCount / totalWebinars) * 20);
        await updateSyncStage(
          supabase, 
          syncLogId, 
          webinar.id?.toString(), 
          'processing_webinar', 
          webinarProgress
        );
        
        console.log(`Processing webinar ${webinar.id} (${processedCount + 1}/${totalWebinars})`);
        
        // Get basic webinar details
        const webinarDetails = await client.getWebinar(webinar.id);
        
        // Store webinar data and get database ID
        const webinarDbId = await syncEnhancedWebinarData(supabase, webinarDetails, connection.id);
        
        // Fetch and process registrants
        const registrantsProgress = 20 + Math.round((processedCount / totalWebinars) * 30);
        await updateSyncStage(supabase, syncLogId, webinar.id?.toString(), 'fetching_registrants', registrantsProgress);
        
        try {
          const registrants = await client.getWebinarRegistrants(webinar.id);
          console.log(`Found ${registrants.length} registrants for webinar ${webinar.id}`);
          
          if (registrants.length > 0) {
            await syncRegistrantsData(supabase, registrants, webinarDbId);
            registrantsTotal += registrants.length;
          }
        } catch (registrantError) {
          console.error(`Error fetching registrants for webinar ${webinar.id}:`, registrantError);
          // Continue with participants even if registrants fail
        }
        
        // Fetch and process participants
        const participantsProgress = 50 + Math.round((processedCount / totalWebinars) * 40);
        await updateSyncStage(supabase, syncLogId, webinar.id?.toString(), 'fetching_participants', participantsProgress);
        
        try {
          const participants = await client.getWebinarParticipants(webinar.id);
          console.log(`Found ${participants.length} participants for webinar ${webinar.id}`);
          
          if (participants.length > 0) {
            await syncParticipantsData(supabase, participants, webinarDbId);
            participantsTotal += participants.length;
          }
        } catch (participantError) {
          console.error(`Error fetching participants for webinar ${webinar.id}:`, participantError);
          // Continue with next webinar even if participants fail
        }
        
        console.log(`Successfully processed webinar ${webinar.id}`);
        successCount++;
        processedCount++;
        
      } catch (webinarError) {
        console.error(`Error processing webinar ${webinar.id}:`, webinarError);
        processedCount++;
        // Continue with next webinar
      }
    }
    
    // Complete the sync
    await updateSyncLog(supabase, syncLogId, {
      sync_status: 'completed',
      processed_items: processedCount,
      completed_at: new Date().toISOString(),
      sync_stage: 'completed',
      stage_progress_percentage: 100
    });
    
    console.log(`Enhanced webinar sync completed. Successfully processed ${successCount}/${totalWebinars} webinars, ${registrantsTotal} registrants, ${participantsTotal} participants.`);
    
  } catch (error) {
    console.error('Enhanced webinar sync failed:', error);
    throw error;
  }
}

/**
 * Sync enhanced webinar data with calculated metrics
 */
async function syncEnhancedWebinarData(
  supabase: any,
  webinarData: any,
  connectionId: string
): Promise<string> {
  console.log(`Storing enhanced webinar data for webinar ${webinarData.id}`);
  
  try {
    const transformedWebinar = transformEnhancedWebinarForDatabase(webinarData, connectionId);
    
    console.log(`Transformed webinar data for ${webinarData.id}:`, {
      status: transformedWebinar.status,
      type: transformedWebinar.type,
      title: transformedWebinar.topic
    });

    const { data: webinarRecord, error: webinarError } = await supabase
      .from('zoom_webinars')
      .upsert(
        transformedWebinar,
        {
          onConflict: 'connection_id,webinar_id',
          ignoreDuplicates: false
        }
      )
      .select('id')
      .single();

    if (webinarError) {
      console.error('Failed to upsert webinar:', webinarError);
      throw new Error(`Failed to upsert webinar: ${webinarError.message}`);
    }

    console.log(`Webinar stored successfully with ID: ${webinarRecord.id}`);
    return webinarRecord.id;
    
  } catch (error) {
    console.error(`Error storing webinar data for ${webinarData.id}:`, error);
    throw error;
  }
}

/**
 * Sync registrants data to database
 */
async function syncRegistrantsData(
  supabase: any,
  registrants: any[],
  webinarDbId: string
): Promise<void> {
  console.log(`Syncing ${registrants.length} registrants for webinar ${webinarDbId}`);
  
  try {
    const transformedRegistrants = registrants.map(registrant => 
      transformRegistrantForDatabase(registrant, webinarDbId)
    );

    const { error } = await supabase
      .from('zoom_registrants')
      .upsert(
        transformedRegistrants,
        {
          onConflict: 'webinar_id,registrant_id',
          ignoreDuplicates: false
        }
      );

    if (error) {
      console.error('Failed to upsert registrants:', error);
      throw new Error(`Failed to upsert registrants: ${error.message}`);
    }

    console.log(`Successfully synced ${registrants.length} registrants`);
    
  } catch (error) {
    console.error(`Error syncing registrants:`, error);
    throw error;
  }
}

/**
 * Sync participants data to database
 */
async function syncParticipantsData(
  supabase: any,
  participants: any[],
  webinarDbId: string
): Promise<void> {
  console.log(`Syncing ${participants.length} participants for webinar ${webinarDbId}`);
  
  try {
    const transformedParticipants = participants.map(participant => 
      transformParticipantForDatabase(participant, webinarDbId)
    );

    const { error } = await supabase
      .from('zoom_participants')
      .upsert(
        transformedParticipants,
        {
          onConflict: 'webinar_id,participant_id',
          ignoreDuplicates: false
        }
      );

    if (error) {
      console.error('Failed to upsert participants:', error);
      throw new Error(`Failed to upsert participants: ${error.message}`);
    }

    console.log(`Successfully synced ${participants.length} participants`);
    
  } catch (error) {
    console.error(`Error syncing participants:`, error);
    throw error;
  }
}

/**
 * Transform Zoom API webinar to database format - enhanced version
 */
function transformEnhancedWebinarForDatabase(apiWebinar: any, connectionId: string): any {
  const settings = apiWebinar.settings || {};
  
  // Normalize status value
  let normalizedStatus = 'available';
  if (apiWebinar.status) {
    const statusMap: { [key: string]: string } = {
      'available': 'available',
      'unavailable': 'unavailable', 
      'started': 'started',
      'ended': 'ended',
      'deleted': 'deleted',
      'scheduled': 'scheduled'
    };
    normalizedStatus = statusMap[apiWebinar.status.toLowerCase()] || 'available';
  }
  
  return {
    connection_id: connectionId,
    webinar_id: apiWebinar.id?.toString() || apiWebinar.webinar_id?.toString(),
    webinar_uuid: apiWebinar.uuid,
    host_id: apiWebinar.host_id,
    host_email: apiWebinar.host_email || null,
    topic: apiWebinar.topic,
    agenda: apiWebinar.agenda || null,
    type: apiWebinar.type || 5,
    status: normalizedStatus,
    start_time: apiWebinar.start_time || null,
    duration: apiWebinar.duration || null,
    timezone: apiWebinar.timezone || null,
    registration_required: !!apiWebinar.registration_url,
    registration_type: settings.registration_type || null,
    registration_url: apiWebinar.registration_url || null,
    join_url: apiWebinar.join_url || null,
    approval_type: settings.approval_type || null,
    alternative_hosts: settings.alternative_hosts ? 
      settings.alternative_hosts.split(',').map((h: string) => h.trim()) : null,
    max_registrants: settings.registrants_restrict_number || null,
    max_attendees: null,
    occurrence_id: apiWebinar.occurrences?.[0]?.occurrence_id || apiWebinar.occurrence_id || null,
    
    // Initialize metrics - will be calculated later
    total_registrants: null,
    total_attendees: null,
    total_minutes: null,
    avg_attendance_duration: null,
    
    synced_at: new Date().toISOString(),
    
    // Enhanced field mapping
    password: apiWebinar.password || null,
    h323_password: apiWebinar.h323_password || apiWebinar.h323_passcode || null,
    pstn_password: apiWebinar.pstn_password || null,
    encrypted_password: apiWebinar.encrypted_password || apiWebinar.encrypted_passcode || null,
    settings: settings,
    tracking_fields: apiWebinar.tracking_fields || null,
    recurrence: apiWebinar.recurrence || null,
    occurrences: apiWebinar.occurrences || null,
    start_url: apiWebinar.start_url || null,
    encrypted_passcode: apiWebinar.encrypted_passcode || apiWebinar.encrypted_password || null,
    creation_source: apiWebinar.creation_source || null,
    is_simulive: apiWebinar.is_simulive || false,
    record_file_id: apiWebinar.record_file_id || null,
    transition_to_live: apiWebinar.transition_to_live || false,
    webinar_created_at: apiWebinar.created_at || null,
    
    updated_at: new Date().toISOString()
  };
}

/**
 * Transform Zoom API registrant to database format
 */
function transformRegistrantForDatabase(apiRegistrant: any, webinarDbId: string): any {
  // Normalize status
  let normalizedStatus = 'approved';
  if (apiRegistrant.status) {
    const statusMap: { [key: string]: string } = {
      'approved': 'approved',
      'pending': 'pending',
      'denied': 'denied',
      'cancelled': 'cancelled'
    };
    normalizedStatus = statusMap[apiRegistrant.status.toLowerCase()] || 'approved';
  }

  return {
    webinar_id: webinarDbId,
    registrant_id: apiRegistrant.id || apiRegistrant.registrant_id,
    registrant_email: apiRegistrant.email,
    first_name: apiRegistrant.first_name || null,
    last_name: apiRegistrant.last_name || null,
    address: apiRegistrant.address || null,
    city: apiRegistrant.city || null,
    state: apiRegistrant.state || null,
    zip: apiRegistrant.zip || null,
    country: apiRegistrant.country || null,
    phone: apiRegistrant.phone || null,
    industry: apiRegistrant.industry || null,
    org: apiRegistrant.org || null,
    job_title: apiRegistrant.job_title || null,
    purchasing_time_frame: apiRegistrant.purchasing_time_frame || null,
    role_in_purchase_process: apiRegistrant.role_in_purchase_process || null,
    no_of_employees: apiRegistrant.no_of_employees || null,
    comments: apiRegistrant.comments || null,
    custom_questions: apiRegistrant.custom_questions || null,
    registration_time: apiRegistrant.registration_time || new Date().toISOString(),
    source_id: apiRegistrant.source_id || null,
    tracking_source: apiRegistrant.tracking_source || null,
    status: normalizedStatus,
    join_url: apiRegistrant.join_url || null,
    create_time: apiRegistrant.create_time || null,
    language: apiRegistrant.language || null,
    join_time: null, // Will be updated from participant data if available
    leave_time: null,
    duration: null,
    attended: false, // Will be updated from participant data if available
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
}

/**
 * Transform Zoom API participant to database format
 */
function transformParticipantForDatabase(apiParticipant: any, webinarDbId: string): any {
  return {
    webinar_id: webinarDbId,
    participant_id: apiParticipant.id || apiParticipant.participant_id,
    registrant_id: apiParticipant.registrant_id || null,
    participant_name: apiParticipant.name || apiParticipant.participant_name,
    participant_email: apiParticipant.user_email || apiParticipant.participant_email || null,
    participant_user_id: apiParticipant.user_id || null,
    join_time: apiParticipant.join_time || null,
    leave_time: apiParticipant.leave_time || null,
    duration: apiParticipant.duration || null,
    attentiveness_score: apiParticipant.attentiveness_score || null,
    camera_on_duration: apiParticipant.camera_on_duration || null,
    share_application_duration: apiParticipant.share_application_duration || null,
    share_desktop_duration: apiParticipant.share_desktop_duration || null,
    posted_chat: apiParticipant.posted_chat || false,
    raised_hand: apiParticipant.raised_hand || false,
    answered_polling: apiParticipant.answered_polling || false,
    asked_question: apiParticipant.asked_question || false,
    device: apiParticipant.device || null,
    ip_address: apiParticipant.ip_address || null,
    location: apiParticipant.location || null,
    network_type: apiParticipant.network_type || null,
    version: apiParticipant.version || null,
    customer_key: apiParticipant.customer_key || null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
}
