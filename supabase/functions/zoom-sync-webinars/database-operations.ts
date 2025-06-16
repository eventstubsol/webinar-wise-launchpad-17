
export async function createSyncLog(supabase: any, connectionId: string, syncType: string, webinarId?: string): Promise<string> {
  const { data, error } = await supabase
    .from('zoom_sync_logs')
    .insert({
      connection_id: connectionId,
      sync_type: syncType,
      sync_status: 'started',
      resource_type: syncType === 'single' ? 'webinar' : 'webinars',
      resource_id: webinarId || null,
      started_at: new Date().toISOString(),
    })
    .select('id')
    .single();

  if (error) {
    console.error('Failed to create sync log:', error);
    throw new Error('Failed to initialize sync operation');
  }
  return data.id;
}

export async function updateSyncLog(supabase: any, syncLogId: string, updates: Record<string, any>): Promise<void> {
  const { error } = await supabase
    .from('zoom_sync_logs')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', syncLogId);
  if (error) console.error(`Failed to update sync log ${syncLogId}:`, error);
}

export async function updateSyncStage(supabase: any, syncLogId: string, webinarId: string | null, stage: string, progress: number): Promise<void> {
  await updateSyncLog(supabase, syncLogId, {
    current_webinar_id: webinarId,
    sync_stage: stage,
    stage_progress_percentage: Math.max(0, Math.min(100, progress)),
  });
  console.log(`Sync ${syncLogId}: ${stage} (${progress}%) - Webinar: ${webinarId || 'N/A'}`);
}

export async function saveWebinarToDatabase(supabase: any, webinarData: any, connectionId: string): Promise<void> {
  // Normalize the status using the same logic as the API client
  const normalizedStatus = normalizeWebinarStatus(webinarData.status);
  
  const webinarInsert = {
    connection_id: connectionId,
    webinar_id: webinarData.id.toString(),
    webinar_uuid: webinarData.uuid,
    topic: webinarData.topic,
    start_time: webinarData.start_time,
    duration: webinarData.duration,
    timezone: webinarData.timezone,
    host_id: webinarData.host_id,
    host_email: webinarData.host_email,
    status: normalizedStatus, // Use normalized status
    agenda: webinarData.agenda,
    type: webinarData.type,
    settings: webinarData.settings,
    synced_at: new Date().toISOString(),
  };

  const { error } = await supabase
    .from('zoom_webinars')
    .upsert(webinarInsert, { onConflict: 'connection_id,webinar_id' });

  if (error) {
    console.error(`Error saving webinar ${webinarData.id}:`, error);
    throw error;
  }
  
  console.log(`Saved webinar ${webinarData.id} with status: ${normalizedStatus}`);
}

function normalizeWebinarStatus(zoomStatus: string): string {
  // Map Zoom API status values to our database enum values
  switch (zoomStatus?.toLowerCase()) {
    case 'available':
    case 'waiting':
      return 'available';
    case 'started':
    case 'live':
      return 'started';
    case 'ended':
    case 'finished':
      return 'ended';
    case 'aborted':
    case 'cancelled':
      return 'aborted';
    case 'deleted':
      return 'deleted';
    case 'unavailable':
      return 'unavailable';
    default:
      console.log(`Unknown status '${zoomStatus}', defaulting to 'unavailable'`);
      return 'unavailable';
  }
}
