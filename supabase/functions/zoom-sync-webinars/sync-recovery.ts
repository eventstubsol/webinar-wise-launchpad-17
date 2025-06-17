
/**
 * Recovery utilities for stuck syncs and data restoration
 */

export async function clearStuckSync(supabase: any, syncLogId: string): Promise<void> {
  console.log(`Clearing stuck sync: ${syncLogId}`);
  
  try {
    const { error } = await supabase
      .from('zoom_sync_logs')
      .update({
        sync_status: 'failed',
        error_message: 'Sync cleared due to timeout - manual recovery',
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', syncLogId);

    if (error) {
      console.error('Failed to clear stuck sync:', error);
      throw new Error(`Failed to clear stuck sync: ${error.message}`);
    }

    console.log(`Successfully cleared stuck sync: ${syncLogId}`);
  } catch (error) {
    console.error('Error clearing stuck sync:', error);
    throw error;
  }
}

export async function findAndClearStuckSyncs(supabase: any, connectionId: string): Promise<number> {
  console.log('Finding and clearing stuck syncs...');
  
  // Consider syncs stuck if they've been running for more than 30 minutes
  const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();
  
  const { data: stuckSyncs, error: findError } = await supabase
    .from('zoom_sync_logs')
    .select('id, sync_status, created_at, current_webinar_id')
    .eq('connection_id', connectionId)
    .in('sync_status', ['started', 'in_progress'])
    .lt('created_at', thirtyMinutesAgo);

  if (findError) {
    console.error('Error finding stuck syncs:', findError);
    return 0;
  }

  if (stuckSyncs && stuckSyncs.length > 0) {
    console.log(`Found ${stuckSyncs.length} stuck syncs, clearing them...`);
    
    for (const sync of stuckSyncs) {
      await clearStuckSync(supabase, sync.id);
    }
    
    return stuckSyncs.length;
  }

  console.log('No stuck syncs found');
  return 0;
}

export async function validateConnectionData(supabase: any, connectionId: string): Promise<{
  webinarCount: number;
  registrantCount: number;
  participantCount: number;
}> {
  console.log(`Validating data for connection: ${connectionId}`);
  
  try {
    const [webinarsResult, registrantsResult, participantsResult] = await Promise.all([
      supabase
        .from('zoom_webinars')
        .select('id', { count: 'exact' })
        .eq('connection_id', connectionId),
      supabase
        .from('zoom_registrants')
        .select('id', { count: 'exact' })
        .eq('webinar_id', `(SELECT id FROM zoom_webinars WHERE connection_id = '${connectionId}')`),
      supabase
        .from('zoom_participants')
        .select('id', { count: 'exact' })
        .eq('webinar_id', `(SELECT id FROM zoom_webinars WHERE connection_id = '${connectionId}')`)
    ]);

    const counts = {
      webinarCount: webinarsResult.count || 0,
      registrantCount: registrantsResult.count || 0,
      participantCount: participantsResult.count || 0
    };

    console.log('Current data counts:', counts);
    return counts;
  } catch (error) {
    console.error('Error validating connection data:', error);
    return { webinarCount: 0, registrantCount: 0, participantCount: 0 };
  }
}
