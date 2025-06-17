
/**
 * Sync basic webinar data only - no registrants, participants, etc.
 */
export async function syncBasicWebinarData(
  supabase: any,
  webinarData: any,
  connectionId: string
): Promise<string> {
  console.log(`Storing basic webinar data for webinar ${webinarData.id}`);
  
  try {
    const transformedWebinar = transformSimpleWebinarForDatabase(webinarData, connectionId);
    
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
 * Transform Zoom API webinar to database format - simplified version
 */
function transformSimpleWebinarForDatabase(apiWebinar: any, connectionId: string): any {
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
    // Set these to null since we're not calculating them
    total_registrants: null,
    total_attendees: null,
    total_minutes: null,
    avg_attendance_duration: null,
    synced_at: new Date().toISOString(),
    
    // Basic field mapping
    password: apiWebinar.password || null,
    h323_password: apiWebinar.h323_password || apiWebinar.h323_passcode || null,
    pstn_password: apiWebinar.pstn_password || null,
    encrypted_password: apiWebinar.encrypted_password || apiWebinar.encrypted_passcode || null,
    settings: settings,
    tracking_fields: apiWebinar.tracking_fields || null,
    recurrence: apiWebinar.recurrence || null,
    occurrences: apiWebinar.occurrences || null,
    
    // Additional fields
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
