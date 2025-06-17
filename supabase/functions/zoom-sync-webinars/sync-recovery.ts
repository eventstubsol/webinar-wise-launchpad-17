
/**
 * Enhanced recovery utilities for stuck syncs and data restoration
 */

export async function clearStuckSync(supabase: any, syncLogId: string): Promise<void> {
  console.log(`Clearing stuck sync: ${syncLogId}`);
  
  try {
    const { error } = await supabase
      .from('zoom_sync_logs')
      .update({
        sync_status: 'failed',
        error_message: 'Sync cleared due to timeout - manual recovery initiated',
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
  
  // More aggressive: Consider syncs stuck if they've been running for more than 10 minutes
  const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
  
  const { data: stuckSyncs, error: findError } = await supabase
    .from('zoom_sync_logs')
    .select('id, sync_status, created_at, current_webinar_id, sync_stage')
    .eq('connection_id', connectionId)
    .in('sync_status', ['started', 'in_progress'])
    .lt('created_at', tenMinutesAgo);

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
    // Get webinar count
    const { count: webinarCount, error: webinarError } = await supabase
      .from('zoom_webinars')
      .select('id', { count: 'exact' })
      .eq('connection_id', connectionId);

    if (webinarError) {
      console.error('Error counting webinars:', webinarError);
    }

    // Get registrant count
    const { count: registrantCount, error: registrantError } = await supabase
      .from('zoom_registrants')
      .select('id', { count: 'exact' })
      .in('webinar_id', supabase
        .from('zoom_webinars')
        .select('id')
        .eq('connection_id', connectionId)
      );

    if (registrantError) {
      console.error('Error counting registrants:', registrantError);
    }

    // Get participant count
    const { count: participantCount, error: participantError } = await supabase
      .from('zoom_participants')
      .select('id', { count: 'exact' })
      .in('webinar_id', supabase
        .from('zoom_webinars')
        .select('id')
        .eq('connection_id', connectionId)
      );

    if (participantError) {
      console.error('Error counting participants:', participantError);
    }

    const counts = {
      webinarCount: webinarCount || 0,
      registrantCount: registrantCount || 0,
      participantCount: participantCount || 0
    };

    console.log('Current data counts:', counts);
    return counts;
  } catch (error) {
    console.error('Error validating connection data:', error);
    return { webinarCount: 0, registrantCount: 0, participantCount: 0 };
  }
}

export async function clearAllStuckSyncsForConnection(supabase: any, connectionId: string): Promise<void> {
  console.log(`Clearing ALL stuck syncs for connection: ${connectionId}`);
  
  try {
    const { data: allActiveSyncs, error: findError } = await supabase
      .from('zoom_sync_logs')
      .select('id, sync_status, created_at')
      .eq('connection_id', connectionId)
      .in('sync_status', ['started', 'in_progress']);

    if (findError) {
      console.error('Error finding active syncs:', findError);
      return;
    }

    if (allActiveSyncs && allActiveSyncs.length > 0) {
      console.log(`Found ${allActiveSyncs.length} active syncs to clear`);
      
      const { error: updateError } = await supabase
        .from('zoom_sync_logs')
        .update({
          sync_status: 'failed',
          error_message: 'Sync cleared for recovery - multiple stuck syncs detected',
          completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .in('id', allActiveSyncs.map(s => s.id));

      if (updateError) {
        console.error('Error clearing all stuck syncs:', updateError);
      } else {
        console.log(`Successfully cleared ${allActiveSyncs.length} stuck syncs`);
      }
    }
  } catch (error) {
    console.error('Error in clearAllStuckSyncsForConnection:', error);
  }
}

/**
 * Force clear a specific problematic webinar from sync if it's causing issues
 */
export async function markWebinarAsProblematic(supabase: any, webinarId: string, reason: string): Promise<void> {
  console.log(`Marking webinar ${webinarId} as problematic: ${reason}`);
  
  try {
    // This could be expanded to maintain a problematic webinars table
    console.log(`Webinar ${webinarId} marked as problematic for reason: ${reason}`);
  } catch (error) {
    console.error('Error marking webinar as problematic:', error);
  }
}
