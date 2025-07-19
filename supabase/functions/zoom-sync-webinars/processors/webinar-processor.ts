
/**
 * Enhanced webinar processor with comprehensive error handling and logging
 * FIXED: Complete field mapping, proper error handling, and sync status management
 */

/**
 * Validate webinar status calculation after database save
 */
async function validateWebinarStatus(
  supabase: any,
  webinarId: string,
  currentStatus: string,
  startTime: string | null,
  duration: number | null
): Promise<void> {
  try {
    if (!startTime || !duration) {
      console.log(`⚠️ STATUS VALIDATION: Skipping validation for webinar ${webinarId} - missing start_time or duration`);
      return;
    }

    // Calculate what the status should be using the same logic as the database function
    const now = new Date();
    const webinarStart = new Date(startTime);
    const estimatedEnd = new Date(webinarStart.getTime() + duration * 60 * 1000); // duration in minutes
    const bufferEnd = new Date(estimatedEnd.getTime() + 5 * 60 * 1000); // 5 minute buffer

    let expectedStatus: string;
    if (now < webinarStart) {
      expectedStatus = 'upcoming';
    } else if (now >= webinarStart && now <= bufferEnd) {
      expectedStatus = 'live';
    } else {
      expectedStatus = 'ended';
    }

    if (currentStatus !== expectedStatus) {
      console.log(`⚠️ STATUS MISMATCH: Webinar ${webinarId} has status '${currentStatus}' but should be '${expectedStatus}'`);
      console.log(`  📅 Start: ${startTime}`);
      console.log(`  ⏱️ Duration: ${duration} minutes`);
      console.log(`  🕒 Now: ${now.toISOString()}`);
      
      // Log this as a potential issue but don't fail the sync
      // The database trigger should handle this automatically
    } else {
      console.log(`✅ STATUS VALID: Webinar ${webinarId} status '${currentStatus}' is correct`);
    }
  } catch (error) {
    console.error(`❌ STATUS VALIDATION ERROR for webinar ${webinarId}:`, error);
    // Don't fail the sync for validation errors
  }
}

/**
 * Fetch existing webinar from database to preserve calculated fields and ID
 */
async function fetchExistingWebinar(
  supabase: any,
  connectionId: string,
  zoomWebinarId: string
): Promise<any | null> {
  try {
    const { data, error } = await supabase
      .from('zoom_webinars')
      .select('*')
      .eq('connection_id', connectionId)
      .eq('webinar_id', zoomWebinarId)
      .maybeSingle();

    if (error) {
      console.error('❌ Error fetching existing webinar:', error);
      return null;
    }

    if (data) {
      console.log(`📋 EXISTING WEBINAR FOUND: ${zoomWebinarId} - preserving database ID and calculated fields`);
    }

    return data;
  } catch (error) {
    console.error('❌ Exception in fetchExistingWebinar:', error);
    return null;
  }
}

/**
 * FIXED: Enhanced comprehensive transform with proper error handling
 */
function transformComprehensiveWebinarForDatabase(apiWebinar: any, connectionId: string, existingWebinar?: any): any {
  console.log(`🔍 ENHANCED TRANSFORM: Processing webinar ${apiWebinar.id} with comprehensive error handling`);
  
  try {
    // Normalize status with proper error handling
    let normalizedStatus = 'available';
    if (apiWebinar.status) {
      const statusMap: { [key: string]: string } = {
        'available': 'available',
        'unavailable': 'unavailable', 
        'started': 'started',
        'ended': 'ended',
        'deleted': 'deleted',
        'scheduled': 'scheduled',
        'finished': 'finished',
        'cancelled': 'cancelled'
      };
      normalizedStatus = statusMap[apiWebinar.status.toLowerCase()] || 'available';
    }
    
    console.log(`🔧 STATUS PROCESSING: ${apiWebinar.status} -> ${normalizedStatus}`);
    
    // FIXED: Complete field mapping with ALL 39 database fields
    const baseData = {
      // Core identification
      connection_id: connectionId,
      webinar_id: apiWebinar.id?.toString() || apiWebinar.webinar_id?.toString(),
      uuid: apiWebinar.uuid || null,
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
      registration_type: apiWebinar.registration_type || apiWebinar.settings?.registration_type || null,
      registration_url: apiWebinar.registration_url || null,
      join_url: apiWebinar.join_url || null,
      start_url: apiWebinar.start_url || null,
      approval_type: apiWebinar.settings?.approval_type || null,
      max_registrants: apiWebinar.settings?.registrants_restrict_number || null,
      max_attendees: apiWebinar.settings?.max_attendees || null,
      
      // Security and access
      password: apiWebinar.password || null,
      h323_passcode: apiWebinar.h323_passcode || null,
      pstn_password: apiWebinar.pstn_password || null,
      encrypted_passcode: apiWebinar.encrypted_passcode || null,
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
    
    console.log(`✅ TRANSFORM SUCCESS for webinar ${apiWebinar.id}:`);
    console.log(`  📊 Field population: ${populatedFields}/${totalFields} (${populationRate}%)`);
    console.log(`  🔧 Status: ${normalizedStatus}`);
    console.log(`  📋 Key fields: topic, start_time, duration, settings extracted`);

    return baseData;
    
  } catch (error) {
    console.error(`❌ TRANSFORM ERROR for webinar ${apiWebinar.id}:`, error);
    throw new Error(`Failed to transform webinar data: ${error.message}`);
  }
}

/**
 * FIXED: Enhanced settings extraction with proper alternative_hosts handling
 */
function extractEnhancedSettings(apiSettings: any, fullApiResponse: any): any {
  console.log(`🔧 SETTINGS EXTRACTION: Processing settings with error handling`);
  
  try {
    const settings = apiSettings || {};
    
    // CRITICAL FIX: Properly handle alternative_hosts
    if (settings.alternative_hosts !== undefined) {
      if (Array.isArray(settings.alternative_hosts)) {
        settings.alternative_hosts = settings.alternative_hosts.join(',');
      } else {
        settings.alternative_hosts = String(settings.alternative_hosts || '');
      }
      console.log(`🔧 ALTERNATIVE HOSTS: Processed as string: "${settings.alternative_hosts}"`);
    } else if (fullApiResponse.alternative_hosts !== undefined) {
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
    
  } catch (error) {
    console.error('❌ SETTINGS EXTRACTION ERROR:', error);
    return apiSettings || {};
  }
}

/**
 * FIXED: Enhanced sync with comprehensive error handling and proper status management
 */
export async function syncBasicWebinarData(
  supabase: any,
  webinarData: any,
  connectionId: string
): Promise<string> {
  const startTime = Date.now();
  console.log(`🚀 ENHANCED WEBINAR SYNC: Starting sync for webinar ${webinarData.id} with complete error handling`);
  
  try {
    // Step 1: Fetch existing webinar to preserve calculated data
    const existingWebinar = await fetchExistingWebinar(supabase, connectionId, webinarData.id.toString());
    
    // Step 2: Transform data with comprehensive field mapping
    let transformedWebinar;
    try {
      transformedWebinar = transformComprehensiveWebinarForDatabase(webinarData, connectionId, existingWebinar);
    } catch (transformError) {
      console.error(`❌ TRANSFORM FAILED for webinar ${webinarData.id}:`, transformError);
      throw new Error(`Data transformation failed: ${transformError.message}`);
    }
    
    // Step 3: Merge with existing data if present
    const finalData = existingWebinar ? {
      ...transformedWebinar,
      id: existingWebinar.id, // Preserve database ID
      total_registrants: existingWebinar.total_registrants,
      total_attendees: existingWebinar.total_attendees,
      total_absentees: existingWebinar.total_absentees,
      total_minutes: existingWebinar.total_minutes,
      avg_attendance_duration: existingWebinar.avg_attendance_duration,
      participant_sync_status: existingWebinar.participant_sync_status,
      participant_sync_attempted_at: existingWebinar.participant_sync_attempted_at,
      participant_sync_completed_at: existingWebinar.participant_sync_completed_at,
      participant_sync_error: existingWebinar.participant_sync_error,
      created_at: existingWebinar.created_at,
      created_at_db: existingWebinar.created_at_db,
    } : transformedWebinar;
    
    // Step 4: Perform the upsert with enhanced error handling
    let webinarRecord;
    try {
      const { data, error } = await supabase
        .from('zoom_webinars')
        .upsert(
          finalData,
          {
            onConflict: 'connection_id,webinar_id',
            ignoreDuplicates: false
          }
        )
        .select('id, status, start_time, duration')
        .single();

      if (error) {
        console.error('❌ UPSERT FAILED:', error);
        throw new Error(`Database upsert failed: ${error.message} (Code: ${error.code})`);
      }

      webinarRecord = data;
      
      // Step 5: Validate status calculation after database save
      console.log(`🔍 STATUS VALIDATION: Checking calculated status for webinar ${webinarData.id}`);
      await validateWebinarStatus(supabase, webinarRecord.id, webinarRecord.status, webinarRecord.start_time, webinarRecord.duration);
      
    } catch (dbError) {
      console.error(`❌ DATABASE ERROR for webinar ${webinarData.id}:`, dbError);
      throw new Error(`Database operation failed: ${dbError.message}`);
    }

    const duration = Date.now() - startTime;
    const operationType = existingWebinar ? 'UPDATE' : 'INSERT';
    
    console.log(`✅ WEBINAR SYNC SUCCESS:`);
    console.log(`  📋 Webinar ID: ${webinarData.id}`);
    console.log(`  🆔 Database ID: ${webinarRecord.id}`);
    console.log(`  🔄 Operation: ${operationType}`);
    console.log(`  ⏱️ Duration: ${duration}ms`);
    console.log(`  📊 Data integrity: ${existingWebinar ? 'PRESERVED calculated fields' : 'NEW record with complete field mapping'}`);

    return webinarRecord.id;
    
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`❌ WEBINAR SYNC FAILED after ${duration}ms for webinar ${webinarData.id}:`);
    console.error(`  Error: ${error.message}`);
    console.error(`  Stack: ${error.stack}`);
    throw error;
  }
}
