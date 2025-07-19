
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

/**
 * Validate webinar statuses after sync completion
 */
export async function validateSyncedWebinarStatuses(
  supabase: any,
  connectionId: string
): Promise<{ 
  totalChecked: number;
  correctStatuses: number;
  incorrectStatuses: number;
  statusDistribution: Record<string, number>;
}> {
  console.log(`🔍 SYNC VALIDATION: Checking webinar statuses for connection ${connectionId}`);
  
  try {
    // Get all webinars for this connection
    const { data: webinars, error } = await supabase
      .from('zoom_webinars')
      .select('id, status, start_time, duration, topic')
      .eq('connection_id', connectionId)
      .not('start_time', 'is', null)
      .not('duration', 'is', null);

    if (error) {
      console.error('❌ Failed to fetch webinars for validation:', error);
      throw error;
    }

    const now = new Date();
    let correctStatuses = 0;
    let incorrectStatuses = 0;
    const statusDistribution: Record<string, number> = {};

    for (const webinar of webinars) {
      // Calculate expected status
      const startTime = new Date(webinar.start_time);
      const endTime = new Date(startTime.getTime() + webinar.duration * 60 * 1000);
      const bufferEnd = new Date(endTime.getTime() + 5 * 60 * 1000);

      let expectedStatus: string;
      if (now < startTime) {
        expectedStatus = 'upcoming';
      } else if (now >= startTime && now <= bufferEnd) {
        expectedStatus = 'live';
      } else {
        expectedStatus = 'ended';
      }

      // Track status distribution
      statusDistribution[webinar.status] = (statusDistribution[webinar.status] || 0) + 1;

      // Check if status is correct
      if (webinar.status === expectedStatus) {
        correctStatuses++;
      } else {
        incorrectStatuses++;
        console.log(`⚠️ STATUS MISMATCH: "${webinar.topic}" (${webinar.id}) has '${webinar.status}' but should be '${expectedStatus}'`);
      }
    }

    const results = {
      totalChecked: webinars.length,
      correctStatuses,
      incorrectStatuses,
      statusDistribution
    };

    console.log(`✅ SYNC VALIDATION COMPLETE:`);
    console.log(`  📊 Total webinars checked: ${results.totalChecked}`);
    console.log(`  ✅ Correct statuses: ${results.correctStatuses}`);
    console.log(`  ⚠️ Incorrect statuses: ${results.incorrectStatuses}`);
    console.log(`  📈 Status distribution:`, results.statusDistribution);

    return results;

  } catch (error) {
    console.error('❌ SYNC VALIDATION ERROR:', error);
    throw error;
  }
}

/**
 * Force refresh all webinar statuses using the database function
 */
export async function refreshAllWebinarStatuses(supabase: any): Promise<void> {
  console.log('🔄 FORCE REFRESH: Updating all webinar statuses using database function');
  
  try {
    const { data, error } = await supabase.rpc('system_update_webinar_statuses');

    if (error) {
      console.error('❌ Failed to refresh webinar statuses:', error);
      throw error;
    }

    const result = data[0];
    console.log(`✅ STATUS REFRESH COMPLETE:`);
    console.log(`  🔄 Updated: ${result.updated_count} webinars`);
    console.log(`  📅 Upcoming: ${result.upcoming_count}`);
    console.log(`  🔴 Live: ${result.live_count}`);
    console.log(`  ✅ Ended: ${result.ended_count}`);

  } catch (error) {
    console.error('❌ STATUS REFRESH ERROR:', error);
    throw error;
  }
}
