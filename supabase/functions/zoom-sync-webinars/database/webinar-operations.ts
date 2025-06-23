
/**
 * Webinar database operations
 */
export async function saveWebinarToDatabase(supabase: any, webinarData: any, connectionId: string): Promise<void> {
  console.log(`🔄 Enhanced saveWebinarToDatabase for webinar ${webinarData.id}`);
  
  try {
    const { syncBasicWebinarData } = await import('../processors/webinar-processor.ts');
    const webinarId = await syncBasicWebinarData(supabase, webinarData, connectionId);
    
    console.log(`✅ Enhanced saveWebinarToDatabase completed - Database ID: ${webinarId}`);
  } catch (error) {
    console.error(`❌ Enhanced saveWebinarToDatabase failed for webinar ${webinarData.id}:`, error);
    throw error;
  }
}

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
