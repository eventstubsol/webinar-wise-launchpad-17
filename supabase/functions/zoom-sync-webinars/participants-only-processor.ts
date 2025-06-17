
import { updateSyncLog, updateSyncStage } from './database-operations.ts';
import { SyncOperation } from './types.ts';

interface ParticipantSyncResult {
  webinarId: string;
  webinarDbId: string;
  title: string;
  success: boolean;
  participantsFetched: number;
  participantsBefore: number;
  participantsAfter: number;
  apiResponseTime: number | null;
  dbOperationTime: number | null;
  errorMessage?: string;
  errorDetails?: any;
}

interface ParticipantsOnlySyncReport {
  totalWebinars: number;
  successfulWebinars: number;
  failedWebinars: number;
  totalParticipantsFetched: number;
  results: ParticipantSyncResult[];
  overallSuccess: boolean;
}

export async function processParticipantsOnlySync(
  supabase: any,
  syncOperation: SyncOperation,
  connection: any,
  syncLogId: string
): Promise<void> {
  const webinarIds = syncOperation.webinarIds || [];
  
  if (webinarIds.length === 0) {
    throw new Error('No webinar IDs provided for participants-only sync');
  }

  console.log(`Starting participants-only sync for ${webinarIds.length} webinars`);
  
  try {
    await updateSyncStage(supabase, syncLogId, null, 'initializing', 5);

    // Create Zoom API client
    const zoomApiClient = await createZoomAPIClient(connection);
    
    // Get webinar details from database
    const { data: webinars, error: webinarsError } = await supabase
      .from('zoom_webinars')
      .select('id, webinar_id, topic, participant_sync_status')
      .eq('connection_id', connection.id)
      .in('webinar_id', webinarIds);

    if (webinarsError) {
      throw new Error(`Failed to fetch webinar data: ${webinarsError.message}`);
    }

    if (!webinars || webinars.length === 0) {
      throw new Error('No webinars found with the provided IDs');
    }

    await updateSyncLog(supabase, syncLogId, {
      total_items: webinars.length,
      processed_items: 0
    });

    const results: ParticipantSyncResult[] = [];
    let processedCount = 0;

    // Process each webinar
    for (const webinar of webinars) {
      await updateSyncStage(supabase, syncLogId, webinar.webinar_id, 'processing_participants', 
        Math.round(((processedCount + 0.5) / webinars.length) * 100));

      console.log(`Processing participants for webinar: ${webinar.topic} (${webinar.webinar_id})`);

      const syncResult = await processWebinarParticipants(
        supabase,
        syncLogId,
        webinar,
        zoomApiClient,
        true // Force sync
      );

      results.push(syncResult);
      processedCount++;

      await updateSyncLog(supabase, syncLogId, {
        processed_items: processedCount
      });
    }

    // Generate final report
    const report: ParticipantsOnlySyncReport = {
      totalWebinars: webinars.length,
      successfulWebinars: results.filter(r => r.success).length,
      failedWebinars: results.filter(r => !r.success).length,
      totalParticipantsFetched: results.reduce((sum, r) => sum + r.participantsFetched, 0),
      results,
      overallSuccess: results.every(r => r.success)
    };

    // Complete the sync
    await updateSyncStage(supabase, syncLogId, null, 'completed', 100);
    await updateSyncLog(supabase, syncLogId, {
      sync_status: 'completed',
      completed_at: new Date().toISOString(),
      error_details: { participantsOnlyReport: report }
    });

    console.log('\n=== PARTICIPANTS-ONLY SYNC COMPLETED ===');
    console.log(`Total webinars processed: ${report.totalWebinars}`);
    console.log(`Successful: ${report.successfulWebinars}`);
    console.log(`Failed: ${report.failedWebinars}`);
    console.log(`Total participants fetched: ${report.totalParticipantsFetched}`);

  } catch (error) {
    console.error('Participants-only sync failed:', error);
    throw error;
  }
}

async function processWebinarParticipants(
  supabase: any,
  syncLogId: string,
  webinar: any,
  zoomApiClient: any,
  forceSync: boolean = false
): Promise<ParticipantSyncResult> {
  const startTime = Date.now();
  
  try {
    // Create sync report entry
    const { data: reportEntry, error: reportError } = await supabase
      .from('participant_sync_reports')
      .insert({
        sync_log_id: syncLogId,
        webinar_id: webinar.id,
        webinar_zoom_id: webinar.webinar_id,
        webinar_title: webinar.topic,
        sync_status: 'processing',
        forced_sync: forceSync,
        started_at: new Date().toISOString()
      })
      .select()
      .single();

    if (reportError) {
      console.error('Failed to create sync report entry:', reportError);
    }

    // Count existing participants
    const { count: participantsBefore } = await supabase
      .from('zoom_participants')
      .select('*', { count: 'exact', head: true })
      .eq('webinar_id', webinar.id);

    console.log(`Fetching participants for webinar: ${webinar.topic}`);
    const apiStartTime = Date.now();
    
    const participantsResponse = await zoomApiClient.makeRequest(
      `/report/webinars/${webinar.webinar_id}/participants?page_size=300`
    );
    
    const apiEndTime = Date.now();
    const apiResponseTime = apiEndTime - apiStartTime;
    const participants = participantsResponse.participants || [];
    
    console.log(`✓ Fetched ${participants.length} participants for ${webinar.topic} (${apiResponseTime}ms)`);

    let participantsAfter = participantsBefore || 0;
    let dbOperationTime: number | null = null;

    if (participants.length > 0) {
      const dbStartTime = Date.now();
      
      // Save participants to database (with upsert to handle duplicates)
      await saveParticipantsToDatabase(supabase, webinar.id, participants);
      
      // Update webinar participant sync status
      await updateWebinarParticipantSyncStatus(supabase, webinar.id, 'synced');
      
      const dbEndTime = Date.now();
      dbOperationTime = dbEndTime - dbStartTime;

      // Count participants after sync
      const { count: newCount } = await supabase
        .from('zoom_participants')
        .select('*', { count: 'exact', head: true })
        .eq('webinar_id', webinar.id);
      
      participantsAfter = newCount || 0;
    } else {
      await updateWebinarParticipantSyncStatus(supabase, webinar.id, 'no_participants');
    }

    // Update sync report
    if (reportEntry) {
      await supabase
        .from('participant_sync_reports')
        .update({
          sync_status: 'completed',
          participants_before_sync: participantsBefore || 0,
          participants_after_sync: participantsAfter,
          participants_fetched: participants.length,
          api_response_time_ms: apiResponseTime,
          database_operation_time_ms: dbOperationTime,
          completed_at: new Date().toISOString()
        })
        .eq('id', reportEntry.id);
    }

    return {
      webinarId: webinar.webinar_id,
      webinarDbId: webinar.id,
      title: webinar.topic,
      success: true,
      participantsFetched: participants.length,
      participantsBefore: participantsBefore || 0,
      participantsAfter,
      apiResponseTime,
      dbOperationTime
    };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.log(`✗ Failed to fetch participants for ${webinar.topic}: ${errorMessage}`);

    // Update sync report with error
    const { data: reportEntry } = await supabase
      .from('participant_sync_reports')
      .select('id')
      .eq('sync_log_id', syncLogId)
      .eq('webinar_id', webinar.id)
      .single();

    if (reportEntry) {
      await supabase
        .from('participant_sync_reports')
        .update({
          sync_status: 'failed',
          error_message: errorMessage,
          error_details: { error: error instanceof Error ? error.stack : error },
          completed_at: new Date().toISOString()
        })
        .eq('id', reportEntry.id);
    }

    return {
      webinarId: webinar.webinar_id,
      webinarDbId: webinar.id,
      title: webinar.topic,
      success: false,
      participantsFetched: 0,
      participantsBefore: 0,
      participantsAfter: 0,
      apiResponseTime: null,
      dbOperationTime: null,
      errorMessage,
      errorDetails: error instanceof Error ? error.stack : error
    };
  }
}

// Helper function to save participants
async function saveParticipantsToDatabase(supabase: any, webinarDbId: string, participants: any[]): Promise<void> {
  const participantInserts = participants.map(p => ({
    webinar_id: webinarDbId,
    zoom_user_id: p.user_id || p.id,
    name: p.name || `${p.first_name || ''} ${p.last_name || ''}`.trim(),
    email: p.email,
    join_time: p.join_time,
    leave_time: p.leave_time,
    duration: p.duration,
    participant_data: p,
    created_at: new Date().toISOString()
  }));

  if (participantInserts.length > 0) {
    const { error } = await supabase
      .from('zoom_participants')
      .upsert(participantInserts, { 
        onConflict: 'webinar_id,zoom_user_id',
        ignoreDuplicates: false 
      });

    if (error) {
      throw new Error(`Failed to save participants: ${error.message}`);
    }
  }
}

// Helper function to update webinar participant sync status
async function updateWebinarParticipantSyncStatus(
  supabase: any, 
  webinarDbId: string, 
  status: string,
  errorMessage?: string
): Promise<void> {
  const updates: any = {
    participant_sync_status: status,
    participant_sync_attempted_at: new Date().toISOString()
  };

  if (errorMessage) {
    updates.participant_sync_error = errorMessage;
  }

  const { error } = await supabase
    .from('zoom_webinars')
    .update(updates)
    .eq('id', webinarDbId);

  if (error) {
    console.error(`Failed to update participant sync status for webinar ${webinarDbId}:`, error);
  }
}

// Helper function to create Zoom API client
async function createZoomAPIClient(connection: any) {
  return {
    async makeRequest(endpoint: string) {
      const response = await fetch(`https://api.zoom.us/v2${endpoint}`, {
        headers: {
          'Authorization': `Bearer ${connection.access_token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`Zoom API error: ${response.status} ${response.statusText}`);
      }
      
      return await response.json();
    }
  };
}
