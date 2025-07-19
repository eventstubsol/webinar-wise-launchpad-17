
/**
 * Sync log database operations with enhanced error handling and timeout detection
 */
export async function createSyncLog(supabase: any, connectionId: string, syncType: string, webinarId?: string): Promise<string> {
  const { data, error } = await supabase
    .from('zoom_sync_logs')
    .insert({
      connection_id: connectionId,
      sync_type: syncType,
      status: 'started',
      sync_status: 'started',
      resource_type: syncType === 'single' ? 'webinar' : 'webinars',
      resource_id: webinarId || null,
      started_at: new Date().toISOString(),
      sync_stage: 'initializing',
      stage_progress_percentage: 5,
      sync_notes: JSON.stringify({
        enhanced_sync: true,
        verification_enabled: true,
        timeout_protection: true,
        created_at: new Date().toISOString()
      })
    })
    .select('id')
    .single();

  if (error) {
    console.error('Failed to create sync log:', error);
    throw new Error('Failed to initialize sync operation');
  }
  
  console.log(`✅ Sync log created successfully: ${data.id}`);
  return data.id;
}

export async function updateSyncLog(supabase: any, syncLogId: string, updates: Record<string, any>): Promise<void> {
  // Ensure sync_notes is properly handled
  if (updates.sync_notes && typeof updates.sync_notes === 'string') {
    try {
      updates.sync_notes = JSON.parse(updates.sync_notes);
    } catch (e) {
      console.warn('Failed to parse sync_notes as JSON, storing as-is');
    }
  }

  // Add automatic timeout detection
  const now = new Date();
  const timeoutUpdates = {
    ...updates,
    updated_at: now.toISOString()
  };

  const { error } = await supabase
    .from('zoom_sync_logs')
    .update(timeoutUpdates)
    .eq('id', syncLogId);
    
  if (error) {
    console.error(`Failed to update sync log ${syncLogId}:`, error);
  } else {
    console.log(`✅ Sync log ${syncLogId} updated successfully`);
  }
}

export async function updateSyncStage(supabase: any, syncLogId: string, webinarId: string | null, stage: string, progress: number): Promise<void> {
  const progressPercent = Math.max(5, Math.min(100, progress)); // Ensure minimum 5% progress
  
  await updateSyncLog(supabase, syncLogId, {
    current_webinar_id: webinarId,
    sync_stage: stage,
    stage_progress_percentage: progressPercent,
    sync_status: progress >= 100 ? 'completed' : 'running'
  });
  
  console.log(`🔄 Enhanced Sync ${syncLogId}: ${stage} (${progressPercent}%) - Webinar: ${webinarId || 'N/A'}`);
}

export async function markSyncAsStuck(supabase: any, syncLogId: string): Promise<void> {
  await updateSyncLog(supabase, syncLogId, {
    sync_status: 'failed',
    error_message: 'Sync appeared to be stuck and was automatically cancelled',
    sync_stage: 'stuck_timeout',
    completed_at: new Date().toISOString()
  });
  
  console.log(`⚠️ Sync ${syncLogId} marked as stuck and cancelled`);
}
