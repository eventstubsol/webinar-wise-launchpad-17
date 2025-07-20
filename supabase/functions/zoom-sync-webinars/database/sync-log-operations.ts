
/**
 * Sync log database operations
 */
export async function createSyncLog(supabase: any, connectionId: string, syncType: string, webinarId?: string): Promise<string> {
  const { data, error } = await supabase
    .from('zoom_sync_logs')
    .insert({
      connection_id: connectionId,
      sync_type: syncType,
      status: 'started',
      resource_type: syncType === 'single' ? 'webinar' : 'webinars',
      resource_id: webinarId || null,
      started_at: new Date().toISOString(),
      sync_notes: JSON.stringify({
        enhanced_sync: true,
        verification_enabled: true,
        created_at: new Date().toISOString()
      })
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
  // Ensure sync_notes is properly handled
  if (updates.sync_notes && typeof updates.sync_notes === 'string') {
    try {
      updates.sync_notes = JSON.parse(updates.sync_notes);
    } catch (e) {
      console.warn('Failed to parse sync_notes as JSON, storing as-is');
    }
  }

  const { error } = await supabase
    .from('zoom_sync_logs')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', syncLogId);
    
  if (error) {
    console.error(`Failed to update sync log ${syncLogId}:`, error);
  }
}

export async function updateSyncStage(supabase: any, syncLogId: string, webinarId: string | null, stage: string, progress: number): Promise<void> {
  await updateSyncLog(supabase, syncLogId, {
    current_webinar_id: webinarId,
    sync_stage: stage,
    stage_progress_percentage: Math.max(0, Math.min(100, progress)),
  });
  console.log(`Enhanced Sync ${syncLogId}: ${stage} (${progress}%) - Webinar: ${webinarId || 'N/A'}`);
}
