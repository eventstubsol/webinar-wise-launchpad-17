import { EnhancedWebinarOperations } from './enhanced-webinar-operations.ts';
import { updateSyncStage } from './database-operations.ts';
import { SyncOperation } from './types.ts';

export async function processComprehensiveSync(
  supabase: any,
  syncOperation: SyncOperation,
  connection: any,
  syncLogId: string
): Promise<void> {
  console.log(`Starting enhanced comprehensive sync for operation: ${syncOperation.id}`);
  
  try {
    const { createZoomAPIClient } = await import('./zoom-api-client.ts');
    const apiClient = await createZoomAPIClient(connection, supabase);

    await updateSyncStage(supabase, syncLogId, null, 'fetching_webinars', 5);
    console.log('Fetching webinars with extended range...');

    // Fetch webinars with extended range to get both past and upcoming
    const webinars = await apiClient.listWebinarsWithRange({
      from: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000), // 90 days ago
      to: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),   // 90 days future
      type: 'all'
    });

    console.log(`Found ${webinars.length} webinars to sync`);

    if (webinars.length === 0) {
      await updateSyncStage(supabase, syncLogId, null, 'completed', 100);
      console.log('No webinars found to sync');
      return;
    }

    // Process each webinar with enhanced status detection
    for (let i = 0; i < webinars.length; i++) {
      const webinar = webinars[i];
      const progress = Math.round(((i + 1) / webinars.length) * 100);
      
      try {
        await updateSyncStage(supabase, syncLogId, webinar.id, 'processing_webinar', progress);
        console.log(`Processing webinar ${i + 1}/${webinars.length}: ${webinar.id} (${webinar.topic})`);

        // Fetch detailed webinar information for better status detection
        const detailedWebinar = await apiClient.getWebinar(webinar.id);
        const webinarToProcess = detailedWebinar || webinar;

        console.log(`Enhanced webinar data for ${webinar.id}:`, {
          status: webinarToProcess.status,
          start_time: webinarToProcess.start_time,
          duration: webinarToProcess.duration,
          type: webinarToProcess.type
        });

        // Upsert webinar with enhanced status detection
        const webinarDbId = await EnhancedWebinarOperations.upsertWebinar(supabase, webinarToProcess, connection.id);
        
        // Progressive sync: Focus on registrants first, then enhance with participants later
        console.log(`Syncing registrants for webinar ${webinar.id}...`);
        const registrants = await apiClient.getWebinarRegistrants(webinar.id);
        console.log(`Found ${registrants.length} registrants for webinar ${webinar.id}`);

        // Process registrants
        if (registrants.length > 0) {
          await processRegistrants(supabase, registrants, webinarDbId);
        }

        // For completed webinars, also sync participants
        if (webinarToProcess.status === 'finished' || 
            (webinarToProcess.start_time && new Date(webinarToProcess.start_time) < new Date())) {
          console.log(`Syncing participants for completed webinar ${webinar.id}...`);
          try {
            const participants = await apiClient.getWebinarParticipants(webinar.id);
            console.log(`Found ${participants.length} participants for webinar ${webinar.id}`);
            
            if (participants.length > 0) {
              await processParticipants(supabase, participants, webinarDbId);
            }
          } catch (participantError) {
            console.log(`Could not fetch participants for webinar ${webinar.id}:`, participantError.message);
          }
        }

        // Update metrics after processing all data
        await EnhancedWebinarOperations.updateWebinarMetrics(supabase, webinarDbId);
        
        console.log(`Successfully processed webinar ${webinar.id} with enhanced status detection`);

      } catch (webinarError) {
        console.error(`Error processing webinar ${webinar.id}:`, webinarError);
        // Continue with next webinar instead of failing entire sync
      }
    }

    await updateSyncStage(supabase, syncLogId, null, 'completed', 100);
    console.log(`Enhanced comprehensive sync completed. Successfully processed ${webinars.length} webinars.`);

  } catch (error) {
    console.error('Enhanced comprehensive sync failed:', error);
    await updateSyncStage(supabase, syncLogId, null, 'failed', 0);
    throw error;
  }
}

async function processRegistrants(supabase: any, registrants: any[], webinarDbId: string): Promise<void> {
  const { WebinarTransformers } = await import('./webinar-transformers.ts');
  
  for (const registrant of registrants) {
    try {
      const transformedRegistrant = WebinarTransformers.transformRegistrant(registrant, webinarDbId);
      
      const { error } = await supabase
        .from('zoom_registrants')
        .upsert(
          {
            ...transformedRegistrant,
            updated_at: new Date().toISOString()
          },
          {
            onConflict: 'webinar_id,registrant_id',
            ignoreDuplicates: false
          }
        );

      if (error) {
        console.error(`Failed to upsert registrant ${registrant.id} for webinar ${webinarDbId}:`, error);
      } else {
        console.log(`Upserted registrant ${registrant.id} for webinar ${webinarDbId}`);
      }
    } catch (registrantError) {
      console.error(`Error processing registrant ${registrant.id} for webinar ${webinarDbId}:`, registrantError);
    }
  }
}

async function processParticipants(supabase: any, participants: any[], webinarDbId: string): Promise<void> {
  const { ParticipantTransformers } = await import('./participant-transformers.ts');
  
  for (const participant of participants) {
    try {
      const transformedParticipant = ParticipantTransformers.transformParticipant(participant, webinarDbId);
      
      const { error } = await supabase
        .from('zoom_participants')
        .upsert(
          {
            ...transformedParticipant,
            updated_at: new Date().toISOString()
          },
          {
            onConflict: 'webinar_id,participant_id',
            ignoreDuplicates: false
          }
        );

      if (error) {
        console.error(`Failed to upsert participant ${participant.id} for webinar ${webinarDbId}:`, error);
      } else {
        console.log(`Upserted participant ${participant.id} for webinar ${webinarDbId}`);
      }
    } catch (participantError) {
      console.error(`Error processing participant ${participant.id} for webinar ${webinarDbId}:`, participantError);
    }
  }
}
