
import { updateSyncLog, updateSyncStage } from './database-operations.ts';
import { SyncOperation } from './types.ts';

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
    
    // Use the correct method from ZoomAPIClient
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
    const totalWebinars = webinars.length;
    
    // Process each webinar with comprehensive data extraction
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
        
        // Fetch detailed webinar information with all fields
        await updateSyncStage(supabase, syncLogId, webinar.id?.toString(), 'webinar_details', null);
        const webinarDetails = await client.getWebinar(webinar.id);
        console.log(`Fetched webinar details for ${webinar.id}:`, {
          hasSettings: !!webinarDetails.settings,
          hasStartUrl: !!webinarDetails.start_url,
          hasEncryptedPasscode: !!webinarDetails.encrypted_passcode,
          creationSource: webinarDetails.creation_source,
          isSimulive: webinarDetails.is_simulive
        });
        
        // Fetch registrants
        await updateSyncStage(supabase, syncLogId, webinar.id?.toString(), 'registrants', null);
        const registrants = await client.getWebinarRegistrants(webinar.id);
        console.log(`Fetched ${registrants.length} registrants for webinar ${webinar.id}`);
        
        // Fetch participants/attendees
        await updateSyncStage(supabase, syncLogId, webinar.id?.toString(), 'participants', null);
        let participants = [];
        try {
          participants = await client.getWebinarParticipants(webinar.id);
          console.log(`Fetched ${participants.length} participants for webinar ${webinar.id}`);
        } catch (participantError) {
          console.log(`No participants data available for webinar ${webinar.id} (likely not started yet)`);
        }
        
        // Fetch polls
        await updateSyncStage(supabase, syncLogId, webinar.id?.toString(), 'polls', null);
        let polls = [];
        try {
          polls = await client.getWebinarPolls(webinar.id);
          console.log(`Fetched ${polls.length} polls for webinar ${webinar.id}`);
        } catch (pollError) {
          console.log(`No polls data available for webinar ${webinar.id}`);
        }
        
        // Fetch Q&A
        await updateSyncStage(supabase, syncLogId, webinar.id?.toString(), 'qa', null);
        let qnaData = [];
        try {
          qnaData = await client.getWebinarQA(webinar.id);
          console.log(`Fetched ${qnaData.length} Q&A items for webinar ${webinar.id}`);
        } catch (qnaError) {
          console.log(`No Q&A data available for webinar ${webinar.id}`);
        }
        
        // Process all data using embedded comprehensive operations
        console.log(`Syncing comprehensive data for webinar ${webinar.id}...`);
        await updateSyncStage(supabase, syncLogId, webinar.id?.toString(), 'saving_comprehensive_data', null);
        
        const webinarDbId = await syncCompleteWebinarData(
          supabase,
          webinarDetails, // Use detailed webinar data with all fields
          registrants,
          participants,
          polls,
          qnaData,
          connection.id
        );
        
        console.log(`Data collected for webinar ${webinar.id}:`, {
          registrants: registrants.length,
          participants: participants.length,
          polls: polls.length,
          qa: qnaData.length
        });
        
        processedCount++;
        await updateSyncStage(
          supabase, 
          syncLogId, 
          webinar.id?.toString(), 
          'webinar_completed', 
          Math.round((processedCount / totalWebinars) * 90) + 10
        );
        
        console.log(`Successfully processed webinar ${webinar.id} with comprehensive data`);
        
      } catch (webinarError) {
        console.error(`Error processing webinar ${webinar.id}:`, webinarError);
        await updateSyncStage(supabase, syncLogId, webinar.id?.toString(), 'webinar_failed', null);
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
    
    console.log(`Enhanced comprehensive sync completed. Processed ${processedCount}/${totalWebinars} webinars with full data extraction.`);
    
  } catch (error) {
    console.error('Enhanced comprehensive sync failed:', error);
    throw error;
  }
}

/**
 * Complete webinar data sync with all related data and metrics calculation
 * This is embedded in the edge function to avoid import issues
 */
async function syncCompleteWebinarData(
  supabase: any,
  webinarData: any,
  registrants: any[],
  participants: any[],
  polls: any[],
  qnaData: any[],
  connectionId: string
): Promise<string> {
  console.log(`Starting comprehensive sync for webinar ${webinarData.id}`);
  
  try {
    // Transform webinar data for database
    const transformedWebinar = transformWebinarForDatabase(webinarData, connectionId);
    
    // Enhanced field mapping to capture all available Zoom API data
    const enhancedWebinar = {
      ...transformedWebinar,
      // Ensure status is properly mapped from API
      status: webinarData.status || 'available',
      
      // Map settings fields that were previously missing
      approval_type: webinarData.settings?.approval_type || null,
      registration_type: webinarData.settings?.registration_type || null,
      
      // New fields from schema update
      start_url: webinarData.start_url || null,
      encrypted_passcode: webinarData.encrypted_passcode || webinarData.encrypted_password || null,
      creation_source: webinarData.creation_source || null,
      is_simulive: webinarData.is_simulive || false,
      record_file_id: webinarData.record_file_id || null,
      transition_to_live: webinarData.transition_to_live || false,
      webinar_created_at: webinarData.created_at || null,
      
      // Enhanced password field mapping
      password: webinarData.password || null,
      h323_password: webinarData.h323_password || webinarData.h323_passcode || null,
      pstn_password: webinarData.pstn_password || null,
      encrypted_password: webinarData.encrypted_password || webinarData.encrypted_passcode || null,
      
      // Comprehensive settings and metadata
      settings: webinarData.settings ? JSON.stringify(webinarData.settings) : null,
      tracking_fields: webinarData.tracking_fields ? JSON.stringify(webinarData.tracking_fields) : null,
      recurrence: webinarData.recurrence ? JSON.stringify(webinarData.recurrence) : null,
      occurrences: webinarData.occurrences ? JSON.stringify(webinarData.occurrences) : null,
      
      updated_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('zoom_webinars')
      .upsert(
        enhancedWebinar,
        {
          onConflict: 'connection_id,webinar_id',
          ignoreDuplicates: false
        }
      )
      .select('id')
      .single();

    if (error) {
      console.error('Failed to upsert enhanced webinar:', error);
      throw new Error(`Failed to upsert webinar: ${error.message}`);
    }

    console.log(`Enhanced webinar upserted with comprehensive data mapping: ${data.id}`);
    return data.id;
  } catch (error) {
    console.error(`Error in comprehensive webinar sync for ${webinarData.id}:`, error);
    throw error;
  }
}

/**
 * Transform Zoom API webinar to database format with comprehensive field mapping
 * Embedded function to avoid import issues
 */
function transformWebinarForDatabase(apiWebinar: any, connectionId: string): any {
  // Extract settings for better field mapping
  const settings = apiWebinar.settings || {};
  
  return {
    connection_id: connectionId,
    webinar_id: apiWebinar.id?.toString() || apiWebinar.webinar_id?.toString(),
    webinar_uuid: apiWebinar.uuid,
    host_id: apiWebinar.host_id,
    host_email: apiWebinar.host_email || null,
    topic: apiWebinar.topic,
    agenda: apiWebinar.agenda || null,
    type: apiWebinar.type || 5,
    status: apiWebinar.status || 'available',
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
    total_registrants: null,
    total_attendees: null,
    total_minutes: null,
    avg_attendance_duration: null,
    synced_at: new Date().toISOString(),
    
    // Enhanced field mapping for missing data
    password: apiWebinar.password || null,
    h323_password: apiWebinar.h323_password || apiWebinar.h323_passcode || null,
    pstn_password: apiWebinar.pstn_password || null,
    encrypted_password: apiWebinar.encrypted_password || apiWebinar.encrypted_passcode || null,
    settings: settings,
    tracking_fields: apiWebinar.tracking_fields || null,
    recurrence: apiWebinar.recurrence || null,
    occurrences: apiWebinar.occurrences || null,
    
    // New fields from Zoom API schema
    start_url: apiWebinar.start_url || null,
    encrypted_passcode: apiWebinar.encrypted_passcode || apiWebinar.encrypted_password || null,
    creation_source: apiWebinar.creation_source || null,
    is_simulive: apiWebinar.is_simulive || false,
    record_file_id: apiWebinar.record_file_id || null,
    transition_to_live: apiWebinar.transition_to_live || false,
    webinar_created_at: apiWebinar.created_at || null,
  };
}
