
import { updateSyncLog, updateSyncStage } from './database-operations.ts';
import { SyncOperation } from './types.ts';

export async function processEnhancedWebinarSync(
  supabase: any,
  syncOperation: SyncOperation,
  connection: any,
  syncLogId: string
): Promise<void> {
  const debugMode = syncOperation.options?.debug || false;
  console.log(`Starting enhanced webinar sync for connection: ${connection.id}${debugMode ? ' (DEBUG MODE)' : ''}`);
  
  try {
    // Initialize Zoom API client
    const zoomApi = await import('./zoom-api-client.ts');
    const client = await zoomApi.createZoomAPIClient(connection, supabase);
    
    // Stage 1: Fetch webinars list (0-15%)
    console.log('Fetching webinars list...');
    await updateSyncStage(supabase, syncLogId, null, 'fetching_webinars', 5);
    
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
    
    await updateSyncStage(supabase, syncLogId, null, 'fetching_webinars', 15);
    
    let processedCount = 0;
    let successCount = 0;
    let totalRegistrantsSynced = 0;
    let totalParticipantsSynced = 0;
    const totalWebinars = webinars.length;
    const webinarMetrics: any[] = [];
    
    // Process each webinar through all stages
    for (const webinar of webinars) {
      try {
        const baseProgress = 15 + Math.round(((processedCount) / totalWebinars) * 70);
        
        // Stage 2: Processing webinar details (15-25%)
        await updateSyncStage(
          supabase, 
          syncLogId, 
          webinar.id?.toString(), 
          'processing_webinar', 
          baseProgress
        );
        
        console.log(`Processing webinar ${webinar.id} (${processedCount + 1}/${totalWebinars})`);
        
        // Get detailed webinar data
        const webinarDetails = await client.getWebinar(webinar.id);
        
        // Store webinar data and get database ID
        const webinarDbId = await syncWebinarWithDetails(supabase, webinarDetails, connection.id);
        
        let registrantCount = 0;
        let participantCount = 0;
        
        // Stage 3: Syncing registrants (25-50%)
        const registrantStartProgress = baseProgress + 5;
        await updateSyncStage(
          supabase, 
          syncLogId, 
          webinar.id?.toString(), 
          'fetching_registrants', 
          registrantStartProgress
        );
        
        try {
          registrantCount = await syncWebinarRegistrantsEnhanced(supabase, client, webinar.id, webinarDbId);
          totalRegistrantsSynced += registrantCount;
          console.log(`Successfully synced ${registrantCount} registrants for webinar ${webinar.id}`);
          
          await updateSyncStage(
            supabase, 
            syncLogId, 
            webinar.id?.toString(), 
            'syncing_registrants', 
            baseProgress + 15
          );
        } catch (registrantError) {
          console.error(`Error syncing registrants for webinar ${webinar.id}:`, registrantError);
          // Continue with participants even if registrants fail
        }
        
        // Stage 4: Syncing participants (50-75%)
        const participantStartProgress = baseProgress + 20;
        await updateSyncStage(
          supabase, 
          syncLogId, 
          webinar.id?.toString(), 
          'fetching_participants', 
          participantStartProgress
        );
        
        try {
          // Import enhanced participant processor
          const participantProcessor = await import('./processors/participant-processor.ts');
          participantCount = await participantProcessor.syncWebinarParticipants(
            supabase, 
            client, 
            webinar.id, 
            webinarDbId,
            debugMode // Pass debug mode to participant processor
          );
          totalParticipantsSynced += participantCount;
          console.log(`Successfully synced ${participantCount} participants for webinar ${webinar.id}`);
          
          await updateSyncStage(
            supabase, 
            syncLogId, 
            webinar.id?.toString(), 
            'syncing_participants', 
            baseProgress + 30
          );
        } catch (participantError) {
          console.error(`Error syncing participants for webinar ${webinar.id}:`, participantError);
          // Continue with next webinar even if participants fail
        }
        
        // Stage 5: Update webinar totals (75-85%)
        await updateSyncStage(
          supabase, 
          syncLogId, 
          webinar.id?.toString(), 
          'updating_totals', 
          baseProgress + 35
        );
        
        try {
          await updateWebinarTotals(supabase, webinarDbId, registrantCount, participantCount);
          webinarMetrics.push({
            webinarId: webinar.id,
            registrants: registrantCount,
            participants: participantCount
          });
        } catch (updateError) {
          console.error(`Error updating totals for webinar ${webinar.id}:`, updateError);
        }
        
        console.log(`Successfully processed webinar ${webinar.id} - ${registrantCount} registrants, ${participantCount} participants`);
        
        successCount++;
        processedCount++;
        
      } catch (webinarError) {
        console.error(`Error processing webinar ${webinar.id}:`, webinarError);
        processedCount++;
        // Continue with next webinar
      }
    }
    
    // Stage 6: Complete the sync (85-100%)
    await updateSyncStage(supabase, syncLogId, null, 'completing', 90);
    
    await updateSyncLog(supabase, syncLogId, {
      sync_status: 'completed',
      processed_items: processedCount,
      total_registrants: totalRegistrantsSynced,
      total_participants: totalParticipantsSynced,
      completed_at: new Date().toISOString(),
      sync_stage: 'completed',
      stage_progress_percentage: 100
    });
    
    console.log(`Enhanced webinar sync completed. Successfully processed ${successCount}/${totalWebinars} webinars, ${totalRegistrantsSynced} registrants, and ${totalParticipantsSynced} participants.`);
    
  } catch (error) {
    console.error('Enhanced webinar sync failed:', error);
    throw error;
  }
}

/**
 * Enhanced webinar sync with detailed data capture
 */
async function syncWebinarWithDetails(
  supabase: any,
  webinarData: any,
  connectionId: string
): Promise<string> {
  console.log(`Storing enhanced webinar data for webinar ${webinarData.id}`);
  
  try {
    const transformedWebinar = transformEnhancedWebinarForDatabase(webinarData, connectionId);

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
 * Enhanced registrant sync with proper status mapping
 */
async function syncWebinarRegistrantsEnhanced(
  supabase: any,
  client: any,
  webinarId: string,
  webinarDbId: string
): Promise<number> {
  console.log(`Syncing registrants for webinar ${webinarId}`);
  
  try {
    // Fetch registrants from Zoom API
    const registrants = await client.getWebinarRegistrants(webinarId);
    
    if (!registrants || registrants.length === 0) {
      console.log(`No registrants found for webinar ${webinarId}`);
      return 0;
    }
    
    console.log(`Found ${registrants.length} registrants for webinar ${webinarId}`);
    
    // Transform registrant data with enhanced status mapping
    const transformedRegistrants = registrants.map(registrant => {
      const transformed = transformRegistrantWithEnhancedStatus(registrant, webinarDbId);
      return {
        ...transformed,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
    });
    
    // Upsert registrants to database
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

    console.log(`Successfully synced ${registrants.length} registrants for webinar ${webinarId}`);
    return registrants.length;
    
  } catch (error) {
    console.error(`Error syncing registrants for webinar ${webinarId}:`, error);
    throw error;
  }
}

/**
 * Enhanced participant sync with proper status mapping
 */
async function syncWebinarParticipantsEnhanced(
  supabase: any,
  client: any,
  webinarId: string,
  webinarDbId: string
): Promise<number> {
  console.log(`Syncing participants for webinar ${webinarId}`);
  
  try {
    // Fetch participants from Zoom API
    const participants = await client.getWebinarParticipants(webinarId);
    
    if (!participants || participants.length === 0) {
      console.log(`No participants found for webinar ${webinarId}`);
      return 0;
    }
    
    console.log(`Found ${participants.length} participants for webinar ${webinarId}`);
    
    // Transform participant data with enhanced status mapping
    const transformedParticipants = participants.map(participant => {
      const transformed = transformParticipantWithEnhancedStatus(participant, webinarDbId);
      return {
        ...transformed,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
    });
    
    // Upsert participants to database
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

    console.log(`Successfully synced ${participants.length} participants for webinar ${webinarId}`);
    return participants.length;
    
  } catch (error) {
    console.error(`Error syncing participants for webinar ${webinarId}:`, error);
    throw error;
  }
}

/**
 * Update webinar totals after syncing registrants and participants
 */
async function updateWebinarTotals(
  supabase: any,
  webinarDbId: string,
  registrantCount: number,
  participantCount: number
): Promise<void> {
  try {
    // Calculate additional metrics
    const { data: participants } = await supabase
      .from('zoom_participants')
      .select('duration')
      .eq('webinar_id', webinarDbId);

    const totalMinutes = participants?.reduce((sum: number, p: any) => sum + (p.duration || 0), 0) || 0;
    const avgDuration = participantCount > 0 ? Math.round(totalMinutes / participantCount) : 0;

    const { error } = await supabase
      .from('zoom_webinars')
      .update({
        total_registrants: registrantCount,
        total_attendees: participantCount,
        total_minutes: totalMinutes,
        avg_attendance_duration: avgDuration,
        updated_at: new Date().toISOString()
      })
      .eq('id', webinarDbId);

    if (error) {
      console.error('Failed to update webinar totals:', error);
      throw error;
    }

    console.log(`Updated webinar totals: ${registrantCount} registrants, ${participantCount} participants`);
  } catch (error) {
    console.error('Error updating webinar totals:', error);
    throw error;
  }
}

/**
 * Transform Zoom API webinar with enhanced field mapping
 */
function transformEnhancedWebinarForDatabase(apiWebinar: any, connectionId: string): any {
  const settings = apiWebinar.settings || {};
  
  // Normalize status value with enhanced mapping
  let normalizedStatus = 'available';
  if (apiWebinar.status) {
    const statusMap: { [key: string]: string } = {
      'available': 'available',
      'unavailable': 'unavailable', 
      'started': 'started',
      'ended': 'ended',
      'deleted': 'deleted',
      'scheduled': 'scheduled',
      'finished': 'ended'
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
    // Initialize totals - will be updated after sync
    total_registrants: 0,
    total_attendees: 0,
    total_minutes: 0,
    avg_attendance_duration: 0,
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
 * Transform registrant with enhanced status mapping
 */
function transformRegistrantWithEnhancedStatus(apiRegistrant: any, webinarDbId: string): any {
  // Enhanced status mapping for registrants
  let normalizedStatus = 'approved';
  if (apiRegistrant.status) {
    const statusMap: { [key: string]: string } = {
      'approved': 'approved',
      'pending': 'pending',
      'denied': 'denied',
      'cancelled': 'cancelled',
      'waiting': 'pending',
      'rejected': 'denied'
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
    attended: false // Will be updated from participant data if available
  };
}

/**
 * Transform participant with enhanced status mapping
 */
function transformParticipantWithEnhancedStatus(apiParticipant: any, webinarDbId: string): any {
  // Enhanced status mapping for participants
  let participantStatus = 'in_meeting'; // Default status
  
  if (apiParticipant.status) {
    const statusMap: { [key: string]: string } = {
      'in_meeting': 'in_meeting',
      'in_waiting_room': 'in_waiting_room',
      'left': 'in_meeting', // They were in meeting but left
      'joined': 'in_meeting',
      'attended': 'in_meeting',
      'no_show': 'in_waiting_room'
    };
    participantStatus = statusMap[apiParticipant.status.toLowerCase()] || 'in_meeting';
  }
  
  // If participant has timing data, they were definitely in the meeting
  if (apiParticipant.join_time && apiParticipant.leave_time) {
    participantStatus = 'in_meeting';
  }

  return {
    webinar_id: webinarDbId,
    participant_id: apiParticipant.id || apiParticipant.participant_id,
    registrant_id: apiParticipant.registrant_id || null,
    participant_name: apiParticipant.name || apiParticipant.participant_name || null,
    participant_email: apiParticipant.user_email || apiParticipant.participant_email || apiParticipant.email || null,
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
    ip_address: apiParticipant.ip_address ? String(apiParticipant.ip_address) : null,
    location: apiParticipant.location || null,
    network_type: apiParticipant.network_type || null,
    version: apiParticipant.version || null,
    customer_key: apiParticipant.customer_key || null,
    participant_status: participantStatus
  };
}
