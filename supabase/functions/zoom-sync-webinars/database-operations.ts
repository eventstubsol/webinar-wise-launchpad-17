// Database operations for Zoom sync
export async function createSyncLog(supabase: any, connectionId: string, syncType: string): Promise<string> {
  const { data, error } = await supabase
    .from('zoom_sync_logs')
    .insert({
      connection_id: connectionId,
      sync_type: syncType,
      sync_status: 'started',
      started_at: new Date().toISOString(),
      total_items: 0,
      processed_items: 0,
      failed_items: 0
    })
    .select('id')
    .single();

  if (error) {
    console.error('Error creating sync log:', error);
    throw error;
  }

  return data.id;
}

export async function updateSyncLog(supabase: any, syncLogId: string, updates: any): Promise<void> {
  const { error } = await supabase
    .from('zoom_sync_logs')
    .update(updates)
    .eq('id', syncLogId);

  if (error) {
    console.error('Error updating sync log:', error);
    throw error;
  }
}

export async function updateSyncStage(
  supabase: any,
  syncLogId: string,
  itemId: string | null,
  stage: string,
  progressPercentage?: number
): Promise<void> {
  const updates: any = {
    sync_stage: stage,
    updated_at: new Date().toISOString()
  };

  if (itemId) {
    updates.current_webinar_id = itemId;
  }

  if (progressPercentage !== undefined) {
    updates.stage_progress_percentage = progressPercentage;
  }

  await updateSyncLog(supabase, syncLogId, updates);
}
