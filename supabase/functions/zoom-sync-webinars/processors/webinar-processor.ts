/**
 * Enhanced webinar processor with proper upsert logic and data preservation
 */

/**
 * Fetch existing webinar from database to preserve calculated fields and ID
 */
async function fetchExistingWebinar(
  supabase: any,
  connectionId: string,
  zoomWebinarId: string
): Promise<any | null> {
  const { data, error } = await supabase
    .from('zoom_webinars')
    .select('*')
    .eq('connection_id', connectionId)
    .eq('webinar_id', zoomWebinarId)
    .maybeSingle();

  if (error) {
    console.error('Error fetching existing webinar:', error);
    return null;
  }

  return data;
}

/**
 * Intelligently merge new API data with existing database data
 */
function mergeWebinarData(apiWebinar: any, existingWebinar: any | null, connectionId: string): any {
  // Start with transformed API data
  const newData = transformSimpleWebinarForDatabase(apiWebinar, connectionId, existingWebinar);
  
  if (!existingWebinar) {
    console.log(`New webinar detected: ${apiWebinar.id} - will be inserted`);
    return newData;
  }

  console.log(`Existing webinar found: ${apiWebinar.id} - will be updated, preserving calculated fields`);

  // Preserve critical calculated fields that should never be overwritten during sync
  const preservedFields = {
    id: existingWebinar.id, // Always preserve the database ID
    total_registrants: existingWebinar.total_registrants,
    total_attendees: existingWebinar.total_attendees,
    total_minutes: existingWebinar.total_minutes,
    avg_attendance_duration: existingWebinar.avg_attendance_duration,
    participant_sync_status: existingWebinar.participant_sync_status,
    participant_sync_attempted_at: existingWebinar.participant_sync_attempted_at,
    participant_sync_error: existingWebinar.participant_sync_error,
    created_at: existingWebinar.created_at, // Preserve original creation time
  };

  // Merge JSONB fields instead of replacing them
  const mergedSettings = mergeJSONBField(existingWebinar.settings, newData.settings);
  const mergedTrackingFields = mergeJSONBField(existingWebinar.tracking_fields, newData.tracking_fields);
  const mergedRecurrence = mergeJSONBField(existingWebinar.recurrence, newData.recurrence);
  const mergedOccurrences = mergeJSONBField(existingWebinar.occurrences, newData.occurrences);

  const mergedData = {
    ...newData,
    ...preservedFields,
    settings: mergedSettings,
    tracking_fields: mergedTrackingFields,
    recurrence: mergedRecurrence,
    occurrences: mergedOccurrences,
  };

  // Log what's being preserved vs updated
  console.log(`Webinar ${apiWebinar.id} merge summary:`);
  console.log(`- Preserved calculated metrics: registrants=${preservedFields.total_registrants}, attendees=${preservedFields.total_attendees}`);
  console.log(`- Preserved participant sync status: ${preservedFields.participant_sync_status}`);
  console.log(`- Merged JSONB fields: settings, tracking_fields, recurrence, occurrences`);
  console.log(`- Updated API fields: topic, start_time, duration, status, etc.`);

  return mergedData;
}

/**
 * Merge JSONB fields intelligently
 */
function mergeJSONBField(existingValue: any, newValue: any): any {
  // If new value is null or undefined, keep existing
  if (newValue == null) {
    return existingValue;
  }
  
  // If existing value is null or undefined, use new value
  if (existingValue == null) {
    return newValue;
  }
  
  // If both are objects, merge them
  if (typeof existingValue === 'object' && typeof newValue === 'object' && 
      !Array.isArray(existingValue) && !Array.isArray(newValue)) {
    return { ...existingValue, ...newValue };
  }
  
  // Otherwise, use new value (for arrays and primitives)
  return newValue;
}

/**
 * Sync basic webinar data with enhanced upsert logic
 */
export async function syncBasicWebinarData(
  supabase: any,
  webinarData: any,
  connectionId: string
): Promise<string> {
  const startTime = Date.now();
  console.log(`Starting enhanced sync for webinar ${webinarData.id}`);
  
  try {
    // Step 1: Fetch existing webinar to preserve calculated data
    const existingWebinar = await fetchExistingWebinar(supabase, connectionId, webinarData.id.toString());
    
    // Step 2: Merge new API data with existing database data
    const mergedWebinar = mergeWebinarData(webinarData, existingWebinar, connectionId);
    
    // Step 3: Perform the upsert with proper conflict resolution
    const { data: webinarRecord, error: webinarError } = await supabase
      .from('zoom_webinars')
      .upsert(
        mergedWebinar,
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

    const duration = Date.now() - startTime;
    const operationType = existingWebinar ? 'UPDATE' : 'INSERT';
    
    console.log(`✅ Webinar ${operationType} completed successfully:`);
    console.log(`- Webinar ID: ${webinarData.id}`);
    console.log(`- Database ID: ${webinarRecord.id}`);
    console.log(`- Operation: ${operationType}`);
    console.log(`- Duration: ${duration}ms`);
    console.log(`- Data integrity: ${existingWebinar ? 'PRESERVED calculated fields' : 'NEW record created'}`);

    return webinarRecord.id;
    
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`❌ Error syncing webinar ${webinarData.id} after ${duration}ms:`, error);
    throw error;
  }
}

/**
 * Enhanced transform function that supports data merging
 */
function transformSimpleWebinarForDatabase(apiWebinar: any, connectionId: string, existingWebinar?: any): any {
  // Extract settings for basic field mapping
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
  
  console.log(`Status mapping for webinar ${apiWebinar.id}: ${apiWebinar.status} -> ${normalizedStatus}`);
  
  const baseData = {
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
    
    // Enhanced field mapping
    password: apiWebinar.password || null,
    h323_password: apiWebinar.h323_password || apiWebinar.h323_passcode || null,
    pstn_password: apiWebinar.pstn_password || null,
    encrypted_password: apiWebinar.encrypted_password || apiWebinar.encrypted_passcode || null,
    start_url: apiWebinar.start_url || null,
    encrypted_passcode: apiWebinar.encrypted_passcode || apiWebinar.encrypted_password || null,
    creation_source: apiWebinar.creation_source || null,
    is_simulive: apiWebinar.is_simulive || false,
    record_file_id: apiWebinar.record_file_id || null,
    transition_to_live: apiWebinar.transition_to_live || false,
    webinar_created_at: apiWebinar.created_at || null,
    
    // JSONB fields - will be merged in mergeWebinarData if existing record
    settings: settings,
    tracking_fields: apiWebinar.tracking_fields || null,
    recurrence: apiWebinar.recurrence || null,
    occurrences: apiWebinar.occurrences || null,
    
    synced_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  // Only set calculated fields to null for new records
  // For existing records, these will be preserved in mergeWebinarData
  if (!existingWebinar) {
    baseData.total_registrants = null;
    baseData.total_attendees = null;
    baseData.total_minutes = null;
    baseData.avg_attendance_duration = null;
  }

  return baseData;
}
