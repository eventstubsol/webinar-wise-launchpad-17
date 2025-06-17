
import { updateSyncLog, updateSyncStage, saveWebinarToDatabase, updateWebinarParticipantSyncStatus, determineParticipantSyncStatus } from './database-operations.ts';
import { SyncOperation } from './types.ts';
import { syncWebinarWithDetails, updateWebinarTotals } from './processors/webinar-processor.ts';
import { ParticipantRetryService, RetryableWebinar } from './participant-retry-service.ts';

export async function processEnhancedWebinarSync(
  supabase: any,
  syncOperation: SyncOperation,
  connection: any,
  syncLogId: string
): Promise<void> {
  const zoomApiClient = await createZoomAPIClient(connection);
  
  try {
    await updateSyncStage(supabase, syncLogId, null, 'fetching_webinars', 5);
    
    // Fetch webinars from Zoom
    const webinarsResponse = await zoomApiClient.makeRequest('/users/me/webinars?page_size=100');
    const webinars = webinarsResponse.webinars || [];
    
    if (webinars.length === 0) {
      console.log('No webinars found for enhanced sync');
      await updateSyncLog(supabase, syncLogId, {
        sync_status: 'completed',
        completed_at: new Date().toISOString(),
        total_items: 0,
        processed_items: 0
      });
      return;
    }
    
    await updateSyncLog(supabase, syncLogId, {
      total_items: webinars.length,
      processed_items: 0
    });
    
    console.log(`Starting enhanced sync for ${webinars.length} webinars`);
    
    let processedCount = 0;
    const failedParticipantFetches: RetryableWebinar[] = [];
    
    // Process each webinar
    for (const webinar of webinars) {
      try {
        await updateSyncStage(supabase, syncLogId, webinar.id, 'processing_webinar', 
          Math.round(((processedCount + 0.5) / webinars.length) * 100));
        
        console.log(`Processing webinar: ${webinar.topic} (${webinar.id})`);
        
        // Save basic webinar data
        await saveWebinarToDatabase(supabase, webinar, connection.id);
        
        // Get webinar database ID
        const { data: webinarDbData } = await supabase
          .from('zoom_webinars')
          .select('id')
          .eq('connection_id', connection.id)
          .eq('webinar_id', webinar.id.toString())
          .single();
        
        if (!webinarDbData) {
          console.error(`Could not find database record for webinar ${webinar.id}`);
          continue;
        }
        
        const webinarDbId = webinarDbData.id;
        
        // Determine participant sync status
        const participantSyncStatus = await determineParticipantSyncStatus(webinar);
        
        if (participantSyncStatus === 'pending') {
          // Try to fetch participants
          try {
            console.log(`Fetching participants for webinar: ${webinar.topic}`);
            
            const participantsResponse = await zoomApiClient.makeRequest(
              `/report/webinars/${webinar.id}/participants?page_size=300`
            );
            
            const participants = participantsResponse.participants || [];
            
            if (participants.length > 0) {
              // Save participants to database
              await saveParticipantsToDatabase(supabase, webinarDbId, participants);
              await updateWebinarParticipantSyncStatus(supabase, webinarDbId, 'synced');
              
              console.log(`✓ Saved ${participants.length} participants for ${webinar.topic}`);
            } else {
              await updateWebinarParticipantSyncStatus(supabase, webinarDbId, 'no_participants');
              console.log(`✓ No participants found for ${webinar.topic}`);
            }
            
          } catch (participantError) {
            const errorMessage = participantError instanceof Error ? participantError.message : 'Unknown error';
            console.log(`✗ Failed to fetch participants for ${webinar.topic}: ${errorMessage}`);
            
            // Classify error and add to retry queue if eligible
            const errorType = ParticipantRetryService.classifyError(errorMessage);
            
            if (ParticipantRetryService.isRetryableError(errorType)) {
              failedParticipantFetches.push({
                webinarId: webinar.id.toString(),
                dbId: webinarDbId,
                topic: webinar.topic,
                errorMessage,
                errorType: errorType as any,
                retryAttempt: 0,
                nextRetryAt: new Date().toISOString()
              });
              
              await updateWebinarParticipantSyncStatus(supabase, webinarDbId, 'pending', errorMessage);
            } else {
              await updateWebinarParticipantSyncStatus(supabase, webinarDbId, 'failed', errorMessage);
            }
          }
        } else {
          // Update status to not applicable
          await updateWebinarParticipantSyncStatus(supabase, webinarDbId, participantSyncStatus);
        }
        
        processedCount++;
        
        // Update progress
        await updateSyncLog(supabase, syncLogId, {
          processed_items: processedCount
        });
        
      } catch (webinarError) {
        console.error(`Error processing webinar ${webinar.id}:`, webinarError);
        processedCount++;
        
        await updateSyncLog(supabase, syncLogId, {
          processed_items: processedCount,
          failed_items: (await getCurrentFailedCount(supabase, syncLogId)) + 1
        });
      }
    }
    
    // Handle participant retries if any failures occurred
    if (failedParticipantFetches.length > 0) {
      await updateSyncStage(supabase, syncLogId, null, 'scheduling_retries', 95);
      
      console.log(`\n=== PARTICIPANT RETRY PHASE ===`);
      console.log(`Found ${failedParticipantFetches.length} webinars with failed participant fetches`);
      
      // Get max retries setting
      const { data: syncLogData } = await supabase
        .from('zoom_sync_logs')
        .select('max_participant_retries')
        .eq('id', syncLogId)
        .single();
      
      const maxRetries = syncLogData?.max_participant_retries || 3;
      
      // Schedule retries
      const retrySchedule = await ParticipantRetryService.scheduleRetries(
        supabase,
        syncLogId,
        failedParticipantFetches,
        maxRetries
      );
      
      if (retrySchedule.length > 0) {
        await updateSyncStage(supabase, syncLogId, null, 'executing_retries', 98);
        
        // Execute immediate retries (for errors that don't need backoff)
        const retryResults = await ParticipantRetryService.executeRetries(
          supabase,
          syncLogId,
          retrySchedule,
          zoomApiClient,
          connection.id
        );
        
        console.log(`Retry execution results:`, retryResults);
        
        // Update sync log with retry summary
        const retryErrorDetails = {
          total_failed_participant_fetches: failedParticipantFetches.length,
          immediate_retry_results: retryResults,
          remaining_scheduled_retries: retryResults.deferred
        };
        
        await updateSyncLog(supabase, syncLogId, {
          error_details: retryErrorDetails
        });
      }
    }
    
    // Complete the sync
    await updateSyncStage(supabase, syncLogId, null, 'completed', 100);
    await updateSyncLog(supabase, syncLogId, {
      sync_status: 'completed',
      completed_at: new Date().toISOString()
    });
    
    console.log(`\n=== ENHANCED SYNC COMPLETED ===`);
    console.log(`Total webinars processed: ${processedCount}`);
    console.log(`Failed participant fetches: ${failedParticipantFetches.length}`);
    console.log(`Retries scheduled: ${failedParticipantFetches.length > 0 ? 'Yes' : 'No'}`);
    
  } catch (error) {
    console.error('Enhanced sync failed:', error);
    throw error;
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

// Helper function to get current failed count
async function getCurrentFailedCount(supabase: any, syncLogId: string): Promise<number> {
  const { data } = await supabase
    .from('zoom_sync_logs')
    .select('failed_items')
    .eq('id', syncLogId)
    .single();
  
  return data?.failed_items || 0;
}

// Helper function to create Zoom API client (this should be imported from the existing module)
async function createZoomAPIClient(connection: any) {
  // This should be the same function used elsewhere in the sync system
  // Simplified version for this example
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
