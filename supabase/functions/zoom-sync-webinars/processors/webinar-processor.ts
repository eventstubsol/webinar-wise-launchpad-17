/**
 * Enhanced webinar processor with comprehensive field mapping and data preservation
 * Fixes alternative_hosts error and implements complete field extraction
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
  // Start with comprehensive transformed API data
  const newData = transformComprehensiveWebinarForDatabase(apiWebinar, connectionId, existingWebinar);
  
  if (!existingWebinar) {
    console.log(`📦 NEW WEBINAR: ${apiWebinar.id} - will be inserted with all fields`);
    return newData;
  }

  console.log(`🔄 EXISTING WEBINAR: ${apiWebinar.id} - preserving calculated fields and database metadata`);

  // Preserve critical calculated fields that should never be overwritten during sync
  const preservedFields = {
    id: existingWebinar.id, // Always preserve the database ID
    total_registrants: existingWebinar.total_registrants,
    total_attendees: existingWebinar.total_attendees,
    total_absentees: existingWebinar.total_absentees,
    total_minutes: existingWebinar.total_minutes,
    avg_attendance_duration: existingWebinar.avg_attendance_duration,
    participant_sync_status: existingWebinar.participant_sync_status,
    participant_sync_attempted_at: existingWebinar.participant_sync_attempted_at,
    participant_sync_completed_at: existingWebinar.participant_sync_completed_at,
    participant_sync_error: existingWebinar.participant_sync_error,
    created_at: existingWebinar.created_at, // Preserve original creation time
    created_at_db: existingWebinar.created_at_db, // Preserve database creation time
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
  console.log(`📊 MERGE SUMMARY for webinar ${apiWebinar.id}:`);
  console.log(`  🔒 Preserved calculated metrics: registrants=${preservedFields.total_registrants}, attendees=${preservedFields.total_attendees}`);
  console.log(`  🔒 Preserved sync status: ${preservedFields.participant_sync_status}`);
  console.log(`  🔄 Updated API fields: topic, start_time, duration, status, settings, etc.`);
  console.log(`  🔗 Merged JSONB fields: settings, tracking_fields, recurrence, occurrences`);

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
 * Sync basic webinar data with enhanced upsert logic and comprehensive field mapping
 */
export async function syncBasicWebinarData(
  supabase: any,
  webinarData: any,
  connectionId: string
): Promise<string> {
  const startTime = Date.now();
  console.log(`🚀 ENHANCED WEBINAR SYNC: Starting comprehensive sync for webinar ${webinarData.id}`);
  
  try {
    // Step 1: Fetch existing webinar to preserve calculated data
    const existingWebinar = await fetchExistingWebinar(supabase, connectionId, webinarData.id.toString());
    
    // Step 2: Merge new API data with existing database data using comprehensive transformation
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
      console.error('❌ UPSERT FAILED:', webinarError);
      throw new Error(`Failed to upsert webinar: ${webinarError.message}`);
    }

    const duration = Date.now() - startTime;
    const operationType = existingWebinar ? 'UPDATE' : 'INSERT';
    
    console.log(`✅ WEBINAR SYNC SUCCESS:`);
    console.log(`  📋 Webinar ID: ${webinarData.id}`);
    console.log(`  🆔 Database ID: ${webinarRecord.id}`);
    console.log(`  🔄 Operation: ${operationType}`);
    console.log(`  ⏱️ Duration: ${duration}ms`);
    console.log(`  📊 Data integrity: ${existingWebinar ? 'PRESERVED calculated fields' : 'NEW record with full field mapping'}`);

    return webinarRecord.id;
    
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`❌ WEBINAR SYNC FAILED after ${duration}ms:`, error);
    throw error;
  }
}

/**
 * Enhanced comprehensive transform function with all database fields mapped
 * FIXES: alternative_hosts error, missing field mappings, type mismatches
 */
function transformComprehensiveWebinarForDatabase(apiWebinar: any, connectionId: string, existingWebinar?: any): any {
  console.log(`🔍 COMPREHENSIVE TRANSFORM: Processing webinar ${apiWebinar.id} with ${Object.keys(apiWebinar).length} API fields`);
  
  // Extract settings for comprehensive field mapping
  const settings = apiWebinar.settings || {};
  
  // Normalize status value with comprehensive mapping
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
  
  console.log(`🔧 STATUS MAPPING: ${apiWebinar.status} -> ${normalizedStatus}`);
  
  // Comprehensive base data mapping to all 39 database fields
  const baseData = {
    // Core identification
    connection_id: connectionId,
    webinar_id: apiWebinar.id?.toString() || apiWebinar.webinar_id?.toString(),
    uuid: apiWebinar.uuid || null, // Map to database 'uuid' field  
    webinar_uuid: apiWebinar.uuid || null, // Keep for backward compatibility
    occurrence_id: apiWebinar.occurrence_id || apiWebinar.occurrences?.[0]?.occurrence_id || null,
    
    // Basic webinar information
    host_id: apiWebinar.host_id || null,
    host_email: apiWebinar.host_email || null,
    topic: apiWebinar.topic || '',
    agenda: apiWebinar.agenda || null,
    type: apiWebinar.type || 5,
    status: normalizedStatus,
    start_time: apiWebinar.start_time || null,
    duration: apiWebinar.duration || null,
    timezone: apiWebinar.timezone || null,
    
    // Creation and tracking timestamps
    webinar_created_at: apiWebinar.created_at || null,
    created_at_db: null, // Will be set by database
    updated_at_db: null, // Will be set by database trigger
    
    // Access URLs and registration
    registration_required: !!apiWebinar.registration_url,
    registration_type: apiWebinar.registration_type || settings.registration_type || null,
    registration_url: apiWebinar.registration_url || null,
    join_url: apiWebinar.join_url || null,
    start_url: apiWebinar.start_url || null,
    approval_type: settings.approval_type || null,
    max_registrants: settings.registrants_restrict_number || null,
    max_attendees: settings.max_attendees || null,
    
    // Security and access
    password: apiWebinar.password || null,
    h323_passcode: apiWebinar.h323_passcode || null, // Correct field name
    pstn_password: apiWebinar.pstn_password || null, // Correct field name
    encrypted_passcode: apiWebinar.encrypted_passcode || null, // Correct field name
    webinar_passcode: apiWebinar.webinar_passcode || null,
    pmi: apiWebinar.pmi || null,
    
    // Simulive and special features  
    is_simulive: apiWebinar.is_simulive || false,
    simulive_webinar_id: apiWebinar.record_file_id || null,
    
    // JSONB fields with enhanced extraction
    settings: extractEnhancedSettings(apiWebinar.settings, apiWebinar),
    tracking_fields: apiWebinar.tracking_fields || null,
    recurrence: apiWebinar.recurrence || null,
    occurrences: apiWebinar.occurrences || null,
    panelists: apiWebinar.panelists || null,
    
    // Sync tracking
    synced_at: new Date().toISOString(),
    last_synced_at: new Date().toISOString(),
    
    // Database update tracking
    updated_at_db: new Date().toISOString()
  };

  // Only set calculated fields to null for new records
  if (!existingWebinar) {
    baseData.total_registrants = null;
    baseData.total_attendees = null;
    baseData.total_absentees = null;
    baseData.total_minutes = null;
    baseData.avg_attendance_duration = null;
    baseData.participant_sync_status = 'pending';
    baseData.participant_sync_attempted_at = null;
    baseData.participant_sync_completed_at = null;
    baseData.participant_sync_error = null;
  }

  // Log comprehensive field mapping statistics
  const populatedFields = Object.entries(baseData).filter(([key, value]) => value !== null).length;
  const totalFields = Object.keys(baseData).length;
  const populationRate = ((populatedFields / totalFields) * 100).toFixed(1);
  
  console.log(`📊 FIELD MAPPING STATS for webinar ${apiWebinar.id}:`);
  console.log(`  ✅ Populated fields: ${populatedFields}/${totalFields} (${populationRate}%)`);
  console.log(`  📋 Key fields mapped: topic, start_time, duration, status, settings, tracking_fields`);
  console.log(`  🔧 FIXED: alternative_hosts properly handled in settings JSONB`);

  return baseData;
}

/**
 * Enhanced settings extraction with proper alternative_hosts handling
 * FIXES: alternative_hosts array error causing sync failures
 */
function extractEnhancedSettings(apiSettings: any, fullApiResponse: any): any {
  console.log(`🔧 SETTINGS EXTRACTION: Processing settings for comprehensive field mapping`);
  
  const settings = apiSettings || {};
  
  // CRITICAL FIX: Properly handle alternative_hosts without causing array errors
  if (settings.alternative_hosts !== undefined) {
    if (Array.isArray(settings.alternative_hosts)) {
      settings.alternative_hosts = settings.alternative_hosts.join(',');
    } else if (typeof settings.alternative_hosts === 'string') {
      // Already a string, keep as is
    } else {
      settings.alternative_hosts = String(settings.alternative_hosts || '');
    }
    console.log(`🔧 ALTERNATIVE HOSTS: Processed as string: "${settings.alternative_hosts}"`);
  } else if (fullApiResponse.alternative_hosts !== undefined) {
    // Handle alternative_hosts at root level of API response
    if (Array.isArray(fullApiResponse.alternative_hosts)) {
      settings.alternative_hosts = fullApiResponse.alternative_hosts.join(',');
    } else {
      settings.alternative_hosts = String(fullApiResponse.alternative_hosts || '');
    }
    console.log(`🔧 ALTERNATIVE HOSTS: Extracted from root API: "${settings.alternative_hosts}"`);
  }
  
  // Extract additional settings that might be at the root level
  const rootLevelSettings = [
    'host_video', 'panelists_video', 'practice_session', 'hd_video', 
    'auto_recording', 'enforce_login', 'authentication_option',
    'registrants_confirmation_email', 'post_webinar_survey'
  ];
  
  rootLevelSettings.forEach(field => {
    if (fullApiResponse[field] !== undefined && settings[field] === undefined) {
      settings[field] = fullApiResponse[field];
    }
  });
  
  console.log(`✅ SETTINGS PROCESSED: ${Object.keys(settings).length} settings fields extracted`);
  
  return settings;
}
