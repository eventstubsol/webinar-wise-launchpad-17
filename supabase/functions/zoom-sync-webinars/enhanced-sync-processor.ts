import { updateSyncLog, updateSyncStage } from './database-operations.ts';
import { SyncOperation } from './types.ts';
import { WebinarStatusDetector } from './webinar-status-detector.ts';

export async function processComprehensiveSync(
  supabase: any,
  syncOperation: SyncOperation,
  connection: any,
  syncLogId: string
): Promise<void> {
  console.log(`Starting enhanced comprehensive sync for connection: ${connection.id}`);
  
  try {
    // Initialize Zoom API client with enhanced error handling
    const zoomApi = await import('./zoom-api-client.ts');
    const client = await zoomApi.createZoomAPIClient(connection, supabase);
    
    // Fetch webinars list with comprehensive data
    console.log('Fetching webinars list...');
    await updateSyncStage(supabase, syncLogId, null, 'fetching_webinar_list', 10);
    
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
    let failedCount = 0;
    const totalWebinars = webinars.length;
    const errors: string[] = [];
    
    // Process each webinar with enhanced error tracking
    for (const webinar of webinars) {
      try {
        await updateSyncStage(
          supabase, 
          syncLogId, 
          webinar.id?.toString(), 
          'starting_webinar', 
          Math.round((processedCount / totalWebinars) * 90) + 10
        );
        
        console.log(`Processing webinar ${webinar.id} (${processedCount + 1}/${totalWebinars})`);
        
        // Fetch detailed webinar information
        await updateSyncStage(supabase, syncLogId, webinar.id?.toString(), 'webinar_details', null);
        const webinarDetails = await client.getWebinar(webinar.id);
        
        // Fetch registrants with proper error handling
        await updateSyncStage(supabase, syncLogId, webinar.id?.toString(), 'registrants', null);
        let registrants = [];
        try {
          registrants = await client.getWebinarRegistrants(webinar.id);
          console.log(`Fetched ${registrants.length} registrants for webinar ${webinar.id}`);
        } catch (registrantError) {
          console.log(`No registrants data available for webinar ${webinar.id}: ${registrantError.message}`);
        }

        // Fetch participants with proper error handling
        await updateSyncStage(supabase, syncLogId, webinar.id?.toString(), 'participants', null);
        let participants = [];
        try {
          participants = await client.getWebinarParticipants(webinar.id);
          console.log(`Fetched ${participants.length} participants for webinar ${webinar.id}`);
        } catch (participantError) {
          console.log(`No participants data available for webinar ${webinar.id}: ${participantError.message}`);
        }
        
        // Process webinar data with enhanced validation
        console.log(`Syncing webinar data for webinar ${webinar.id}...`);
        await updateSyncStage(supabase, syncLogId, webinar.id?.toString(), 'saving_webinar', null);
        
        const insertionResult = await syncWebinarWithValidation(
          supabase,
          webinarDetails,
          registrants,
          participants,
          connection.id
        );
        
        if (insertionResult.success) {
          console.log(`Successfully synced webinar ${webinar.id} to database`);
          successCount++;
        } else {
          console.error(`Failed to sync webinar ${webinar.id}: ${insertionResult.error}`);
          errors.push(`Webinar ${webinar.id}: ${insertionResult.error}`);
          failedCount++;
        }
        
        processedCount++;
        await updateSyncStage(
          supabase, 
          syncLogId, 
          webinar.id?.toString(), 
          insertionResult.success ? 'webinar_completed' : 'webinar_failed', 
          Math.round((processedCount / totalWebinars) * 90) + 10
        );
        
      } catch (webinarError) {
        console.error(`Error processing webinar ${webinar.id}:`, webinarError);
        await updateSyncStage(supabase, syncLogId, webinar.id?.toString(), 'webinar_failed', null);
        errors.push(`Webinar ${webinar.id}: ${webinarError.message}`);
        failedCount++;
        processedCount++;
      }
    }
    
    // Complete the sync with detailed results
    const syncStatus = failedCount === 0 ? 'completed' : (successCount > 0 ? 'partial' : 'failed');
    
    await updateSyncLog(supabase, syncLogId, {
      sync_status: syncStatus,
      processed_items: processedCount,
      completed_at: new Date().toISOString(),
      sync_stage: 'completed',
      stage_progress_percentage: 100,
      error_message: errors.length > 0 ? `${failedCount} webinars failed to sync` : null,
      error_details: errors.length > 0 ? { errors, successCount, failedCount } : null
    });
    
    console.log(`Enhanced sync completed. Success: ${successCount}, Failed: ${failedCount}, Total: ${totalWebinars}`);
    
  } catch (error) {
    console.error('Enhanced sync failed:', error);
    throw error;
  }
}

/**
 * Sync webinar with comprehensive validation and error handling
 */
async function syncWebinarWithValidation(
  supabase: any,
  webinarData: any,
  registrants: any[],
  participants: any[],
  connectionId: string
): Promise<{ success: boolean; error?: string; webinarId?: string }> {
  console.log(`Starting validated webinar sync for webinar ${webinarData.id}`);
  
  try {
    // Transform webinar with enhanced status detection
    const transformedWebinar = transformWebinarWithStatusDetection(webinarData, connectionId);
    
    console.log(`Transformed webinar ${webinarData.id}:`, {
      id: transformedWebinar.webinar_id,
      status: transformedWebinar.status,
      title: transformedWebinar.topic,
      startTime: transformedWebinar.start_time
    });

    // Attempt to insert webinar with detailed error catching
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
      console.error('Webinar insertion failed:', webinarError);
      return { 
        success: false, 
        error: `Database insertion failed: ${webinarError.message}` 
      };
    }

    console.log(`Webinar inserted successfully with ID: ${webinarRecord.id}`);
    
    // Process registrants if available
    if (registrants && registrants.length > 0) {
      console.log(`Processing ${registrants.length} registrants for webinar ${webinarData.id}`);
      
      const transformedRegistrants = registrants.map(registrant => 
        transformRegistrantForDatabase(registrant, webinarRecord.id)
      );
      
      const { error: registrantsError } = await supabase
        .from('zoom_registrants')
        .upsert(
          transformedRegistrants,
          {
            onConflict: 'webinar_id,registrant_id',
            ignoreDuplicates: false
          }
        );

      if (registrantsError) {
        console.error('Registrants insertion failed:', registrantsError);
        // Don't fail the entire operation for registrant errors
        console.log(`Continuing despite registrants error for webinar ${webinarData.id}`);
      } else {
        console.log(`Successfully inserted ${transformedRegistrants.length} registrants`);
      }
    }

    // Process participants if available
    if (participants && participants.length > 0) {
      console.log(`Processing ${participants.length} participants for webinar ${webinarData.id}`);
      
      const transformedParticipants = participants.map(participant => 
        transformParticipantForDatabase(participant, webinarRecord.id)
      );
      
      const { error: participantsError } = await supabase
        .from('zoom_participants')
        .upsert(
          transformedParticipants,
          {
            onConflict: 'webinar_id,participant_id',
            ignoreDuplicates: false
          }
        );

      if (participantsError) {
        console.error('Participants insertion failed:', participantsError);
        // Don't fail the entire operation for participant errors
        console.log(`Continuing despite participants error for webinar ${webinarData.id}`);
      } else {
        console.log(`Successfully inserted ${transformedParticipants.length} participants`);
      }
    }

    // Update webinar metrics
    await updateWebinarMetrics(supabase, webinarRecord.id, registrants || [], participants || []);

    return { 
      success: true, 
      webinarId: webinarRecord.id 
    };
    
  } catch (error) {
    console.error(`Validation error for webinar ${webinarData.id}:`, error);
    return { 
      success: false, 
      error: `Validation failed: ${error.message}` 
    };
  }
}

/**
 * Transform webinar with enhanced status detection
 */
function transformWebinarWithStatusDetection(apiWebinar: any, connectionId: string): any {
  // Detect proper status using the enhanced detector
  const detectedStatus = WebinarStatusDetector.detectStatus(apiWebinar);
  
  console.log(`Status detection for webinar ${apiWebinar.id}:`, {
    originalStatus: apiWebinar.status,
    detectedStatus: detectedStatus,
    startTime: apiWebinar.start_time
  });
  
  return {
    connection_id: connectionId,
    webinar_id: apiWebinar.id?.toString() || apiWebinar.webinar_id?.toString(),
    webinar_uuid: apiWebinar.uuid,
    host_id: apiWebinar.host_id,
    host_email: apiWebinar.host_email || null,
    topic: apiWebinar.topic,
    agenda: apiWebinar.agenda || null,
    type: apiWebinar.type || 5,
    status: detectedStatus,
    start_time: apiWebinar.start_time || null,
    duration: apiWebinar.duration || null,
    timezone: apiWebinar.timezone || null,
    registration_required: !!apiWebinar.registration_url,
    registration_type: apiWebinar.settings?.registration_type || null,
    registration_url: apiWebinar.registration_url || null,
    join_url: apiWebinar.join_url || null,
    approval_type: apiWebinar.settings?.approval_type || null,
    alternative_hosts: apiWebinar.settings?.alternative_hosts ? 
      apiWebinar.settings.alternative_hosts.split(',').map((h: string) => h.trim()) : null,
    max_registrants: apiWebinar.settings?.registrants_restrict_number || null,
    max_attendees: null,
    occurrence_id: apiWebinar.occurrences?.[0]?.occurrence_id || apiWebinar.occurrence_id || null,
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
    settings: apiWebinar.settings || null,
    tracking_fields: apiWebinar.tracking_fields || null,
    recurrence: apiWebinar.recurrence || null,
    occurrences: apiWebinar.occurrences || null,
    
    // New fields from schema
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
 * Transform registrant data for database insertion
 */
function transformRegistrantForDatabase(apiRegistrant: any, webinarDbId: string): any {
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
    comments: apiRegistrant.comments || null,
    custom_questions: apiRegistrant.custom_questions ? JSON.stringify(apiRegistrant.custom_questions) : null,
    registration_time: apiRegistrant.registration_time || apiRegistrant.create_time || new Date().toISOString(),
    source_id: apiRegistrant.source_id || null,
    tracking_source: apiRegistrant.tracking_source || null,
    status: apiRegistrant.status || 'approved',
    join_time: apiRegistrant.join_time || null,
    leave_time: apiRegistrant.leave_time || null,
    duration: apiRegistrant.duration || null,
    attended: !!apiRegistrant.join_time,
    job_title: apiRegistrant.job_title || null,
    purchasing_time_frame: apiRegistrant.purchasing_time_frame || null,
    role_in_purchase_process: apiRegistrant.role_in_purchase_process || null,
    no_of_employees: apiRegistrant.no_of_employees || null,
    industry: apiRegistrant.industry || null,
    org: apiRegistrant.org || null,
    language: apiRegistrant.language || null,
    join_url: apiRegistrant.join_url || null,
    create_time: apiRegistrant.create_time || apiRegistrant.registration_time || null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
}

/**
 * Transform participant data for database insertion
 */
function transformParticipantForDatabase(apiParticipant: any, webinarDbId: string): any {
  const details = apiParticipant.details?.[0] || {};
  
  return {
    webinar_id: webinarDbId,
    participant_id: apiParticipant.id || apiParticipant.participant_id || apiParticipant.user_id,
    registrant_id: null, // This would need to be linked separately
    participant_name: apiParticipant.name || apiParticipant.participant_name || apiParticipant.user_name,
    participant_email: apiParticipant.user_email || apiParticipant.participant_email || apiParticipant.email || null,
    participant_user_id: apiParticipant.user_id || null,
    join_time: apiParticipant.join_time,
    leave_time: apiParticipant.leave_time || null,
    duration: apiParticipant.duration || null,
    attentiveness_score: apiParticipant.attentiveness_score || null,
    camera_on_duration: details.camera_on_duration || null,
    share_application_duration: details.share_application_duration || null,
    share_desktop_duration: details.share_desktop_duration || null,
    posted_chat: apiParticipant.posted_chat || false,
    raised_hand: apiParticipant.raised_hand || false,
    answered_polling: apiParticipant.answered_polling || false,
    asked_question: apiParticipant.asked_question || false,
    device: details.device || null,
    ip_address: details.ip_address || null,
    location: details.location || null,
    network_type: details.network_type || null,
    version: details.version || null,
    customer_key: apiParticipant.customer_key || null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
}

/**
 * Update webinar metrics after syncing
 */
async function updateWebinarMetrics(
  supabase: any,
  webinarDbId: string,
  registrants: any[],
  participants: any[]
): Promise<void> {
  console.log(`Calculating metrics for webinar ${webinarDbId}`);
  
  try {
    const totalRegistrants = registrants?.length || 0;
    const attendees = registrants?.filter(r => r.join_time) || [];
    const totalAttendees = participants?.length || attendees.length;
    
    let totalMinutes = 0;
    let avgAttendanceDuration = 0;
    
    if (participants && participants.length > 0) {
      // Use participant data for more accurate metrics
      totalMinutes = participants.reduce((sum, participant) => {
        return sum + (participant.duration || 0);
      }, 0);
      avgAttendanceDuration = Math.round(totalMinutes / participants.length);
    } else if (attendees.length > 0) {
      // Fallback to registrant data
      totalMinutes = attendees.reduce((sum, attendee) => {
        return sum + (attendee.duration || 0);
      }, 0);
      avgAttendanceDuration = Math.round(totalMinutes / attendees.length);
    }
    
    console.log(`Calculated metrics:`, {
      totalRegistrants,
      totalAttendees,
      totalMinutes,
      avgAttendanceDuration
    });

    const { error: updateError } = await supabase
      .from('zoom_webinars')
      .update({
        total_registrants: totalRegistrants,
        total_attendees: totalAttendees,
        total_minutes: totalMinutes,
        avg_attendance_duration: avgAttendanceDuration,
        updated_at: new Date().toISOString()
      })
      .eq('id', webinarDbId);

    if (updateError) {
      console.error('Failed to update webinar metrics:', updateError);
    } else {
      console.log(`Successfully updated metrics for webinar ${webinarDbId}`);
    }
  } catch (error) {
    console.error('Error calculating webinar metrics:', error);
  }
}
