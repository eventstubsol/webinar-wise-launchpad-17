/**
 * Enhanced database operations with proper sync status management
 * FIXED: Now properly manages sync status progression and triggers metrics updates
 */

// Re-export everything from the new modular structure
export * from './database/index.ts';

/**
 * Update webinar participant sync status with proper state management
 * FIXED: Now properly tracks sync progression and triggers metrics updates
 */
export async function updateWebinarParticipantSyncStatus(
  supabase: any,
  webinarDbId: string,
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'no_participants' | 'not_applicable',
  errorMessage?: string
): Promise<void> {
  try {
    console.log(`📝 Updating participant sync status for webinar ${webinarDbId}: ${status}`);
    
    const updateData: any = {
      participant_sync_status: status,
      updated_at: new Date().toISOString()
    };

    // Set appropriate timestamps based on status
    if (status === 'processing') {
      updateData.participant_sync_attempted_at = new Date().toISOString();
    } else if (status === 'completed') {
      updateData.participant_sync_completed_at = new Date().toISOString();
      updateData.participant_sync_error = null; // Clear any previous errors
      console.log(`✅ Participant sync completed for webinar: ${webinarDbId}`);
    } else if (status === 'failed' && errorMessage) {
      updateData.participant_sync_error = errorMessage;
      console.log(`❌ Participant sync failed for webinar: ${webinarDbId}, error: ${errorMessage}`);
    } else if (status === 'no_participants') {
      updateData.participant_sync_completed_at = new Date().toISOString();
      updateData.participant_sync_error = null;
      console.log(`📭 No participants found for webinar: ${webinarDbId}`);
    }

    const { error } = await supabase
      .from('zoom_webinars')
      .update(updateData)
      .eq('id', webinarDbId);

    if (error) {
      console.error('❌ Failed to update participant sync status:', error);
      throw error;
    }

    console.log(`✅ Updated participant sync status to: ${status} for webinar: ${webinarDbId}`);
  } catch (error) {
    console.error('❌ Error updating participant sync status:', error);
    throw error;
  }
}

/**
 * Update sync stage for progress tracking
 * ENHANCED: Better stage tracking and progress reporting
 */
export async function updateSyncStage(
  supabase: any,
  syncLogId: string,
  stage: string,
  progress?: number
): Promise<void> {
  try {
    const updateData: any = {
      sync_stage: stage,
      updated_at: new Date().toISOString()
    };

    if (progress !== undefined) {
      updateData.stage_progress_percentage = Math.min(100, Math.max(0, progress));
    }

    const { error } = await supabase
      .from('zoom_sync_logs')
      .update(updateData)
      .eq('id', syncLogId);

    if (error) {
      console.error('❌ Failed to update sync stage:', error);
      // Don't throw - stage updates shouldn't fail the sync
    } else {
      console.log(`📊 Updated sync stage: ${stage}${progress !== undefined ? ` (${progress}%)` : ''}`);
    }
  } catch (error) {
    console.error('❌ Error updating sync stage:', error);
    // Don't throw - stage updates shouldn't fail the sync
  }
}
