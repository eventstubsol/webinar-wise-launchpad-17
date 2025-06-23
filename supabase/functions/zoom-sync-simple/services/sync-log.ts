/**
 * Sync log management utilities
 */

export async function createSyncLog(
  supabase: any,
  connectionId: string,
  syncType: string
): Promise<string> {
  const { data, error } = await supabase
    .from('zoom_sync_logs')
    .insert({
      connection_id: connectionId,
      sync_type: syncType,
      sync_status: 'pending',
      started_at: new Date().toISOString(),
      total_items: 0,
      processed_items: 0
    })
    .select('id')
    .single();

  if (error) {
    console.error('Failed to create sync log:', error);
    throw new Error('Failed to create sync log');
  }

  return data.id;
}

export async function updateSyncLog(
  supabase: any,
  syncLogId: string,
  updates: Record<string, any>
): Promise<void> {
  const { error } = await supabase
    .from('zoom_sync_logs')
    .update({
      ...updates,
      updated_at: new Date().toISOString()
    })
    .eq('id', syncLogId);

  if (error) {
    console.error('Failed to update sync log:', error);
    throw error;
  }
}

export async function updateSyncProgress(
  supabase: any,
  syncLogId: string,
  processedItems: number,
  totalItems: number
): Promise<void> {
  const progressPercentage = totalItems > 0 
    ? Math.round((processedItems / totalItems) * 100) 
    : 0;

  await updateSyncLog(supabase, syncLogId, {
    processed_items: processedItems,
    total_items: totalItems,
    stage_progress_percentage: progressPercentage
  });
}
