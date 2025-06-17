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
  console.log(`🔄 Enhanced saveWebinarToDatabase for webinar ${webinarData.id}`);
  
  try {
    // Use the same enhanced sync logic from webinar-processor
    const { syncBasicWebinarData } = await import('./processors/webinar-processor.ts');
    const webinarId = await syncBasicWebinarData(supabase, webinarData, connectionId);
    
    console.log(`✅ saveWebinarToDatabase completed - Database ID: ${webinarId}`);
  } catch (error) {
    console.error(`❌ saveWebinarToDatabase failed for webinar ${webinarData.id}:`, error);
    throw error;
  }
}

// New helper functions for participant sync status management
export async function updateWebinarParticipantSyncStatus(
  supabase: any, 
  webinarDbId: string, 
  status: 'not_applicable' | 'pending' | 'synced' | 'failed' | 'no_participants',
  errorMessage?: string
): Promise<void> {
  const updates: any = {
    participant_sync_status: status,
    participant_sync_attempted_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  if (errorMessage) {
    updates.participant_sync_error = errorMessage;
  } else {
    updates.participant_sync_error = null;
  }

  const { error } = await supabase
    .from('zoom_webinars')
    .update(updates)
    .eq('id', webinarDbId);

  if (error) {
    console.error(`Failed to update participant sync status for webinar ${webinarDbId}:`, error);
  } else {
    console.log(`Updated webinar ${webinarDbId} participant sync status to: ${status}`);
  }
}

export async function determineParticipantSyncStatus(webinarData: any): Promise<'not_applicable' | 'pending'> {
  // Determine initial status based on webinar eligibility
  if (!webinarData.start_time) {
    return 'not_applicable';
  }

  const startTime = new Date(webinarData.start_time);
  const now = new Date();
  const fiveMinutesAgo = new Date(now.getTime() - (5 * 60 * 1000));

  // Future webinars are not applicable
  if (startTime > now) {
    return 'not_applicable';
  }

  // Very recent webinars might not have participant data ready
  if (startTime > fiveMinutesAgo) {
    return 'not_applicable';
  }

  // Check if webinar has valid status for participant sync
  const validStatuses = ['ended', 'finished', 'available'];
  if (!validStatuses.includes(webinarData.status?.toLowerCase())) {
    return 'not_applicable';
  }

  return 'pending';
}
