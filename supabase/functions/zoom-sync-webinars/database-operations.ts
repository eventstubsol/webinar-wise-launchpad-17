export async function createSyncLog(supabase: any, connectionId: string, syncType: string, webinarId?: string): Promise<string> {
  console.log(`📝 Creating sync log for connection: ${connectionId}, type: ${syncType}`);
  
  const insertData: any = {
    connection_id: connectionId,
    sync_type: syncType,
    sync_status: 'started',
    started_at: new Date().toISOString(),
    total_items: 0,
    processed_items: 0
  };
  
  // Only add optional fields if they have values
  if (syncType === 'single' && webinarId) {
    insertData.resource_type = 'webinar';
    insertData.resource_id = webinarId;
  } else {
    insertData.resource_type = 'webinars';
  }
  
  const { data, error } = await supabase
    .from('zoom_sync_logs')
    .insert(insertData)
    .select('id')
    .single();

  if (error) {
    console.error('❌ Failed to create sync log:', error);
    throw new Error('Failed to initialize sync operation');
  }
  
  console.log(`✅ Sync log created with ID: ${data.id}`);
  return data.id;
}

export async function updateSyncLog(supabase: any, syncLogId: string, updates: Record<string, any>): Promise<void> {
  console.log(`🔄 Updating sync log ${syncLogId}:`, updates);
  
  const { error } = await supabase
    .from('zoom_sync_logs')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', syncLogId);
    
  if (error) {
    console.error(`❌ Failed to update sync log ${syncLogId}:`, error);
  } else {
    console.log(`✅ Sync log ${syncLogId} updated successfully`);
  }
}

export async function updateSyncStage(supabase: any, syncLogId: string, webinarId: string | null, stage: string, progress: number): Promise<void> {
  await updateSyncLog(supabase, syncLogId, {
    current_webinar_id: webinarId,
    sync_stage: stage,
    stage_progress_percentage: Math.max(0, Math.min(100, progress)),
  });
  console.log(`📊 Sync ${syncLogId}: ${stage} (${progress}%) - Webinar: ${webinarId || 'N/A'}`);
}

// Enhanced helper functions for participant sync status management with validation support
export async function updateWebinarParticipantSyncStatus(
  supabase: any, 
  webinarDbId: string, 
  status: 'not_applicable' | 'pending' | 'synced' | 'failed' | 'no_participants' | 'validation_warning' | 'validation_error',
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
