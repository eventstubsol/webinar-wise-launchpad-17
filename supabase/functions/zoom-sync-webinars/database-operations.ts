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

// Enhanced helper functions for participant sync status management with validation support
export async function updateWebinarParticipantSyncStatus(
  supabase: any, 
  webinarDbId: string, 
  status: 'not_applicable' | 'pending' | 'synced' | 'failed' | 'no_participants',
  errorMessage?: string,
  validationData?: {
    participantCount?: number;
    registrantCount?: number;
    validationFlags?: string[];
  }
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

  // Add validation data if provided
  if (validationData) {
    updates.sync_validation_data = JSON.stringify(validationData);
  }

  const { error } = await supabase
    .from('zoom_webinars')
    .update(updates)
    .eq('id', webinarDbId);

  if (error) {
    console.error(`Failed to update participant sync status for webinar ${webinarDbId}:`, error);
  } else {
    console.log(`Updated webinar ${webinarDbId} participant sync status to: ${status}${validationData ? ' (with validation data)' : ''}`);
  }
}

// ENHANCED: Better initial status determination based on webinar status
export async function determineParticipantSyncStatus(webinarData: any): Promise<'not_applicable' | 'pending'> {
  // PRIORITY: Use webinar status first
  const status = webinarData.status?.toLowerCase();
  
  if (status) {
    // Finished webinars should be pending for participant sync
    if (['finished', 'ended', 'completed'].includes(status)) {
      console.log(`✅ STATUS-BASED: Webinar status '${status}' -> setting participant_sync_status to 'pending'`);
      return 'pending';
    }
    
    // Future webinars are not applicable
    if (['available', 'scheduled', 'waiting'].includes(status)) {
      console.log(`❌ STATUS-BASED: Webinar status '${status}' -> setting participant_sync_status to 'not_applicable'`);
      return 'not_applicable';
    }
  }
  
  // FALLBACK: Time-based determination
  if (!webinarData.start_time) {
    return 'not_applicable';
  }

  const startTime = new Date(webinarData.start_time);
  const now = new Date();
  const fiveMinutesAgo = new Date(now.getTime() - (5 * 60 * 1000));

  // Future webinars are not applicable
  if (startTime > now) {
    console.log(`⏰ TIME-BASED: Future webinar -> setting participant_sync_status to 'not_applicable'`);
    return 'not_applicable';
  }

  // Very recent webinars might not have participant data ready
  if (startTime > fiveMinutesAgo) {
    console.log(`⏰ TIME-BASED: Recent webinar -> setting participant_sync_status to 'not_applicable'`);
    return 'not_applicable';
  }

  console.log(`⏰ TIME-BASED: Past webinar -> setting participant_sync_status to 'pending'`);
  return 'pending';
}

// New validation helper function
export async function validateSyncResults(
  supabase: any,
  webinarDbId: string,
  syncResults: {
    participantCount: number;
    registrantCount: number;
    webinarStatus: string;
    webinarStartTime: Date | null;
  }
): Promise<{
  hasErrors: boolean;
  hasWarnings: boolean;
  validationMessages: string[];
}> {
  const now = new Date();
  const fiveMinutesAgo = new Date(now.getTime() - (5 * 60 * 1000));
  const isPastWebinar = syncResults.webinarStartTime && syncResults.webinarStartTime < now;
  const isRecentWebinar = syncResults.webinarStartTime && syncResults.webinarStartTime > fiveMinutesAgo;
  const isEndedWebinar = ['ended', 'finished'].includes(syncResults.webinarStatus?.toLowerCase());

  let hasErrors = false;
  let hasWarnings = false;
  const validationMessages: string[] = [];

  // Validate participant count
  if (syncResults.participantCount === 0) {
    if (isEndedWebinar && !isRecentWebinar) {
      hasErrors = true;
      validationMessages.push(`ERROR: Ended webinar has no participants - likely sync failure`);
    } else if (isPastWebinar && !isRecentWebinar) {
      hasWarnings = true;
      validationMessages.push(`WARNING: Past webinar has no participants - may indicate low attendance or sync issue`);
    }
  }

  // Validate registrant count (when implemented)
  if (syncResults.registrantCount === 0 && isPastWebinar) {
    hasWarnings = true;
    validationMessages.push(`WARNING: Past webinar has no registrants - may indicate registration issues`);
  }

  // Update webinar with validation status
  if (hasErrors || hasWarnings) {
    const status = hasErrors ? 'validation_error' : 'validation_warning';
    await updateWebinarParticipantSyncStatus(
      supabase,
      webinarDbId,
      status,
      validationMessages.join('; '),
      {
        participantCount: syncResults.participantCount,
        registrantCount: syncResults.registrantCount,
        validationFlags: validationMessages
      }
    );
  }

  return {
    hasErrors,
    hasWarnings,
    validationMessages
  };
}
