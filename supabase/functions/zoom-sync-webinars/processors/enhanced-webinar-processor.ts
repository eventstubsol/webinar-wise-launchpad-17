import { updateSyncStage } from '../database-operations.ts';

/**
 * Enhanced webinar sync with detailed data capture and updated field names
 */
export async function syncWebinarWithDetails(
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
 * Update webinar totals after syncing registrants and participants
 */
export async function updateWebinarTotals(
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
 * Transform Zoom API webinar with enhanced field mapping and updated field names
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
    registration_type: apiWebinar.registration_type || settings.registration_type || null,
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
    
    // Updated field names to match Zoom API
    password: apiWebinar.password || null,
    h323_passcode: apiWebinar.h323_passcode || null, // Updated field name
    pstn_password: apiWebinar.pstn_password || null, // Updated field name
    encrypted_passcode: apiWebinar.encrypted_passcode || null, // Updated field name
    
    // New Zoom API fields
    start_url: apiWebinar.start_url || null,
    pmi: apiWebinar.pmi || null,
    webinar_passcode: apiWebinar.webinar_passcode || null,
    
    // Enhanced field mapping
    settings: settings,
    tracking_fields: apiWebinar.tracking_fields || null,
    recurrence: apiWebinar.recurrence || null,
    occurrences: apiWebinar.occurrences || null,
    creation_source: apiWebinar.creation_source || null,
    is_simulive: apiWebinar.is_simulive || false,
    record_file_id: apiWebinar.record_file_id || null,
    transition_to_live: apiWebinar.transition_to_live || false,
    webinar_created_at: apiWebinar.created_at || null,
    
    updated_at: new Date().toISOString()
  };
}
