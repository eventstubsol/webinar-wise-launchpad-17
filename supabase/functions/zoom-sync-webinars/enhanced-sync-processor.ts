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
    let successCount = 0;
    const totalWebinars = webinars.length;
    
    // Process each webinar with focus on webinar details and registrants
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
          isSimulive: webinarDetails.is_simulive,
          status: webinarDetails.status
        });
        
        // Fetch registrants with proper error handling
        await updateSyncStage(supabase, syncLogId, webinar.id?.toString(), 'registrants', null);
        let registrants = [];
        try {
          registrants = await client.getWebinarRegistrants(webinar.id);
          console.log(`Fetched ${registrants.length} registrants for webinar ${webinar.id}`);
        } catch (registrantError) {
          console.log(`No registrants data available for webinar ${webinar.id}: ${registrantError.message}`);
          // Continue processing even if registrants fail
        }
        
        // Skip participants, polls, and Q&A for now to focus on webinar + registrants
        console.log(`Skipping participants, polls, and Q&A for progressive build - focusing on registrants`);
        
        // Process webinar and registrant data with metrics calculation
        console.log(`Syncing webinar and registrant data for webinar ${webinar.id}...`);
        await updateSyncStage(supabase, syncLogId, webinar.id?.toString(), 'saving_webinar_and_registrants', null);
        
        const webinarDbId = await syncWebinarAndRegistrants(
          supabase,
          webinarDetails,
          registrants,
          connection.id
        );
        
        console.log(`Successfully synced webinar ${webinar.id} to database with ID: ${webinarDbId}`);
        
        // Calculate and update webinar metrics
        console.log(`Calculating metrics for webinar ${webinar.id}...`);
        await updateSyncStage(supabase, syncLogId, webinar.id?.toString(), 'calculating_metrics', null);
        await updateWebinarMetrics(supabase, webinarDbId, registrants);
        
        console.log(`Data collected for webinar ${webinar.id}:`, {
          registrants: registrants.length,
          participants: 'skipped',
          polls: 'skipped',
          qa: 'skipped'
        });
        
        successCount++;
        processedCount++;
        await updateSyncStage(
          supabase, 
          syncLogId, 
          webinar.id?.toString(), 
          'webinar_completed', 
          Math.round((processedCount / totalWebinars) * 90) + 10
        );
        
        console.log(`Successfully processed webinar ${webinar.id} with metrics calculated`);
        
      } catch (webinarError) {
        console.error(`Error processing webinar ${webinar.id}:`, webinarError);
        await updateSyncStage(supabase, syncLogId, webinar.id?.toString(), 'webinar_failed', null);
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
    
    console.log(`Progressive sync completed with metrics calculation. Successfully processed ${successCount}/${totalWebinars} webinars.`);
    
  } catch (error) {
    console.error('Progressive sync failed:', error);
    throw error;
  }
}

/**
 * Sync webinar and registrants data with metrics calculation
 */
async function syncWebinarAndRegistrants(
  supabase: any,
  webinarData: any,
  registrants: any[],
  connectionId: string
): Promise<string> {
  console.log(`Starting webinar and registrants sync for webinar ${webinarData.id}`);
  
  try {
    // First, sync the webinar data (we know this works from previous testing)
    const transformedWebinar = transformWebinarForDatabase(webinarData, connectionId);
    console.log(`Transformed webinar data for ${webinarData.id}:`, {
      status: transformedWebinar.status,
      type: transformedWebinar.type,
      hasStartUrl: !!transformedWebinar.start_url,
      hasEncryptedPasscode: !!transformedWebinar.encrypted_passcode,
      creationSource: transformedWebinar.creation_source
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

    console.log(`Webinar upserted successfully with ID: ${webinarRecord.id}`);
    
    // Now sync registrants if we have any
    if (registrants && registrants.length > 0) {
      console.log(`Processing ${registrants.length} registrants for webinar ${webinarData.id}`);
      
      const transformedRegistrants = registrants.map(registrant => 
        transformRegistrantForDatabase(registrant, webinarRecord.id)
      );
      
      console.log(`Sample transformed registrant:`, transformedRegistrants[0]);
      
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
        console.error('Failed to upsert registrants:', registrantsError);
        console.error('Sample registrant data that failed:', transformedRegistrants[0]);
        // Don't throw here - we want to continue even if registrants fail
        console.log(`Continuing despite registrants error for webinar ${webinarData.id}`);
      } else {
        console.log(`Successfully upserted ${transformedRegistrants.length} registrants for webinar ${webinarData.id}`);
      }
    } else {
      console.log(`No registrants to process for webinar ${webinarData.id}`);
    }

    return webinarRecord.id;
  } catch (error) {
    console.error(`Error in webinar and registrants sync for ${webinarData.id}:`, error);
    throw error;
  }
}

/**
 * Update webinar metrics after syncing all data
 */
async function updateWebinarMetrics(
  supabase: any,
  webinarDbId: string,
  registrants: any[]
): Promise<void> {
  console.log(`Calculating metrics for webinar ${webinarDbId}`);
  
  try {
    // Calculate metrics from available data (registrants for now)
    const totalRegistrants = registrants?.length || 0;
    
    // For now, we'll use registrants who have attended (have join_time) as attendees
    // This is a simplification until we get actual participant data
    const attendees = registrants?.filter(r => r.join_time) || [];
    const totalAttendees = attendees.length;
    
    // Calculate total minutes and average duration from registrant attendance data
    let totalMinutes = 0;
    let avgAttendanceDuration = 0;
    
    if (attendees.length > 0) {
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

    // Update webinar with calculated metrics
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
      throw new Error(`Failed to update webinar metrics: ${updateError.message}`);
    }
    
    console.log(`Successfully updated metrics for webinar ${webinarDbId}`);
  } catch (error) {
    console.error('Error calculating webinar metrics:', error);
    // Don't throw here - metrics calculation failure shouldn't stop the entire sync
    console.log(`Continuing sync despite metrics calculation error for webinar ${webinarDbId}`);
  }
}

/**
 * Transform Zoom API webinar to database format (same as before)
 */
function transformWebinarForDatabase(apiWebinar: any, connectionId: string): any {
  // Extract settings for better field mapping
  const settings = apiWebinar.settings || {};
  
  // Normalize status value to ensure it matches our constraint
  let normalizedStatus = 'available'; // default fallback
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
  
  console.log(`Status mapping for webinar ${apiWebinar.id}: ${apiWebinar.status} -> ${normalizedStatus}`);
  
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
    total_registrants: null, // Will be calculated later
    total_attendees: null, // Will be calculated later
    total_minutes: null, // Will be calculated later
    avg_attendance_duration: null, // Will be calculated later
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
    
    updated_at: new Date().toISOString()
  };
}

/**
 * Transform Zoom API registrant to database format
 */
function transformRegistrantForDatabase(apiRegistrant: any, webinarDbId: string): any {
  console.log(`Transforming registrant:`, {
    id: apiRegistrant.id,
    email: apiRegistrant.email,
    firstName: apiRegistrant.first_name,
    lastName: apiRegistrant.last_name
  });
  
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
    registration_time: apiRegistrant.registration_time,
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
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
}
