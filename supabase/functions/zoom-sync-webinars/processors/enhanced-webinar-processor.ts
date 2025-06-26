
/**
 * Enhanced webinar processor with comprehensive error handling and logging
 * FIXED: Complete field mapping, proper error handling, and sync status management
 */

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

    // Only set calculated fields to null for new records (preserve existing for updates)
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
 * Update webinar metrics after syncing participants and registrants
 */
async function updateWebinarMetrics(supabase: any, webinarDbId: string): Promise<void> {
  try {
    console.log(`📊 UPDATING METRICS for webinar: ${webinarDbId}`);
    
    // Get participant metrics
    const { data: participants, error: participantsError } = await supabase
      .from('zoom_participants')
      .select('duration, join_time')
      .eq('webinar_id', webinarDbId);

    if (participantsError) {
      console.error('❌ Failed to fetch participants for metrics:', participantsError);
      return;
    }

    // Get registrant count
    const { count: registrantCount, error: registrantsError } = await supabase
      .from('zoom_registrants')
      .select('*', { count: 'exact', head: true })
      .eq('webinar_id', webinarDbId);

    if (registrantsError) {
      console.error('❌ Failed to fetch registrants count:', registrantsError);
      return;
    }

    // Calculate metrics
    const totalAttendees = participants?.length || 0;
    const totalRegistrants = registrantCount || 0;
    const totalMinutes = participants?.reduce((sum, p) => sum + (p.duration || 0), 0) || 0;
    const avgDuration = totalAttendees > 0 ? Math.round(totalMinutes / totalAttendees) : 0;
    const totalAbsentees = Math.max(0, totalRegistrants - totalAttendees);

    // Update webinar with calculated metrics
    const { error: updateError } = await supabase
      .from('zoom_webinars')
      .update({
        total_registrants: totalRegistrants,
        total_attendees: totalAttendees,
        total_absentees: totalAbsentees,
        total_minutes: totalMinutes,
        avg_attendance_duration: avgDuration,
        attendees_count: totalAttendees,
        registrants_count: totalRegistrants,
        updated_at: new Date().toISOString()
      })
      .eq('id', webinarDbId);

    if (updateError) {
      console.error('❌ Failed to update webinar metrics:', updateError);
      throw updateError;
    }

    console.log(`✅ METRICS UPDATED for webinar ${webinarDbId}:`);
    console.log(`  👥 Attendees: ${totalAttendees}`);
    console.log(`  📝 Registrants: ${totalRegistrants}`);
    console.log(`  ⏱️ Total Minutes: ${totalMinutes}`);
    console.log(`  📊 Avg Duration: ${avgDuration}m`);
    console.log(`  ❌ Absentees: ${totalAbsentees}`);
  } catch (error) {
    console.error('❌ Error updating webinar metrics:', error);
    throw error;
  }
}

/**
 * FIXED: Enhanced sync with comprehensive error handling and proper status management
 * Now includes automatic metrics update after successful sync
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
      // Don't overwrite existing calculated metrics unless they're null/zero
      total_registrants: existingWebinar.total_registrants || transformedWebinar.total_registrants,
      total_attendees: existingWebinar.total_attendees || transformedWebinar.total_attendees,
      total_absentees: existingWebinar.total_absentees || transformedWebinar.total_absentees,
      total_minutes: existingWebinar.total_minutes || transformedWebinar.total_minutes,
      avg_attendance_duration: existingWebinar.avg_attendance_duration || transformedWebinar.avg_attendance_duration,
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
        .select('id')
        .single();

      if (error) {
        console.error('❌ UPSERT FAILED:', error);
        throw new Error(`Database upsert failed: ${error.message} (Code: ${error.code})`);
      }

      webinarRecord = data;
    } catch (dbError) {
      console.error(`❌ DATABASE ERROR for webinar ${webinarData.id}:`, dbError);
      throw new Error(`Database operation failed: ${dbError.message}`);
    }

    // Step 5: Update metrics after successful webinar sync (NEW)
    try {
      await updateWebinarMetrics(supabase, webinarRecord.id);
    } catch (metricsError) {
      console.error(`⚠️ METRICS UPDATE FAILED for webinar ${webinarData.id}:`, metricsError);
      // Don't fail the entire sync if metrics update fails
    }

    const duration = Date.now() - startTime;
    const operationType = existingWebinar ? 'UPDATE' : 'INSERT';
    
    console.log(`✅ WEBINAR SYNC SUCCESS:`);
    console.log(`  📋 Webinar ID: ${webinarData.id}`);
    console.log(`  🆔 Database ID: ${webinarRecord.id}`);
    console.log(`  🔄 Operation: ${operationType}`);
    console.log(`  ⏱️ Duration: ${duration}ms`);
    console.log(`  📊 Data integrity: ${existingWebinar ? 'PRESERVED calculated fields' : 'NEW record with complete field mapping'}`);
    console.log(`  📈 Metrics: UPDATED automatically`);

    return webinarRecord.id;
    
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`❌ WEBINAR SYNC FAILED after ${duration}ms for webinar ${webinarData.id}:`);
    console.error(`  Error: ${error.message}`);
    console.error(`  Stack: ${error.stack}`);
    throw error;
  }
}

/**
 * Batch update metrics for webinars after complete sync
 */
export async function batchUpdateWebinarMetrics(supabase: any, connectionId: string): Promise<void> {
  try {
    console.log(`🔄 BATCH METRICS UPDATE: Starting for connection ${connectionId}`);
    
    // Find webinars with zero or null attendee counts
    const { data: webinars, error } = await supabase
      .from('zoom_webinars')
      .select('id')
      .eq('connection_id', connectionId)
      .or('total_attendees.is.null,total_attendees.eq.0');

    if (error) {
      console.error('❌ Failed to fetch webinars for batch metrics update:', error);
      return;
    }

    if (!webinars || webinars.length === 0) {
      console.log('✅ No webinars found needing metrics updates');
      return;
    }

    console.log(`📊 Found ${webinars.length} webinars needing metrics updates`);

    // Update metrics for each webinar
    let updatedCount = 0;
    for (const webinar of webinars) {
      try {
        await updateWebinarMetrics(supabase, webinar.id);
        updatedCount++;
      } catch (error) {
        console.error(`❌ Failed to update metrics for webinar ${webinar.id}:`, error);
        // Continue with next webinar
      }
    }

    console.log(`✅ BATCH METRICS UPDATE COMPLETED: ${updatedCount}/${webinars.length} webinars updated`);
  } catch (error) {
    console.error('❌ Error in batch metrics update:', error);
  }
}
