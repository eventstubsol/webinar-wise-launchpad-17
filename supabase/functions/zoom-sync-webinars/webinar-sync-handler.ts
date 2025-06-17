
import { updateSyncStage } from './database-operations.ts';
import { 
  transformWebinarWithStatusDetection,
  transformRegistrantForDatabase, 
  transformParticipantForDatabase 
} from './data-transformers.ts';
import { updateWebinarMetrics } from './metrics-calculator.ts';

/**
 * Sync webinar with comprehensive validation and error handling
 */
export async function syncWebinarWithValidation(
  supabase: any,
  webinarData: any,
  registrants: any[],
  participants: any[],
  connectionId: string
): Promise<{ success: boolean; error?: string; webinarId?: string }> {
  console.log(`Starting validated webinar sync for webinar ${webinarData.id}`);
  
  try {
    // Transform webinar with enhanced status detection
    const transformedWebinar = transformWebinarWithStatusDetection(webinarData, connectionId);
    
    console.log(`Transformed webinar ${webinarData.id}:`, {
      id: transformedWebinar.webinar_id,
      status: transformedWebinar.status,
      title: transformedWebinar.topic,
      startTime: transformedWebinar.start_time
    });

    // Use proper upsert to prevent data deletion
    const { data: webinarRecord, error: webinarError } = await supabase
      .from('zoom_webinars')
      .upsert(
        transformedWebinar,
        {
          onConflict: 'connection_id,webinar_id',
          ignoreDuplicates: true  // FIXED: Prevent deletion of existing data
        }
      )
      .select('id')
      .maybeSingle();

    if (webinarError) {
      console.error('Webinar insertion failed:', webinarError);
      return { 
        success: false, 
        error: `Database insertion failed: ${webinarError.message}` 
      };
    }

    let webinarDbId = webinarRecord?.id;
    
    // If no record returned due to ignoreDuplicates, fetch the existing one
    if (!webinarDbId) {
      const { data: existingWebinar, error: fetchError } = await supabase
        .from('zoom_webinars')
        .select('id')
        .eq('connection_id', connectionId)
        .eq('webinar_id', webinarData.id?.toString() || webinarData.webinar_id?.toString())
        .maybeSingle();
        
      if (fetchError) {
        console.error('Failed to fetch existing webinar:', fetchError);
        return { success: false, error: `Failed to fetch existing webinar: ${fetchError.message}` };
      }
      
      if (!existingWebinar) {
        console.error('No webinar record found after upsert');
        return { success: false, error: 'No webinar record found after upsert' };
      }
      
      webinarDbId = existingWebinar.id;
    }

    console.log(`Webinar processed successfully with ID: ${webinarDbId}`);
    
    // Process registrants if available
    if (registrants && registrants.length > 0) {
      console.log(`Processing ${registrants.length} registrants for webinar ${webinarData.id}`);
      
      const transformedRegistrants = registrants.map(registrant => 
        transformRegistrantForDatabase(registrant, webinarDbId)
      );
      
      const { error: registrantsError } = await supabase
        .from('zoom_registrants')
        .upsert(
          transformedRegistrants,
          {
            onConflict: 'webinar_id,registrant_id',
            ignoreDuplicates: true  // FIXED: Prevent deletion of existing data
          }
        );

      if (registrantsError) {
        console.error('Registrants insertion failed:', registrantsError);
        console.log(`Continuing despite registrants error for webinar ${webinarData.id}`);
      } else {
        console.log(`Successfully processed ${transformedRegistrants.length} registrants`);
      }
    }

    // Process participants with enhanced validation and error handling
    if (participants && participants.length > 0) {
      console.log(`Processing ${participants.length} participants for webinar ${webinarData.id}`);
      console.log(`First participant structure:`, JSON.stringify(participants[0], null, 2));
      
      const transformedParticipants = participants.map(participant => {
        try {
          return transformParticipantForDatabase(participant, webinarDbId);
        } catch (transformError) {
          console.error(`Failed to transform participant:`, transformError, participant);
          return null;
        }
      }).filter(Boolean); // Remove any null transformations
      
      if (transformedParticipants.length > 0) {
        console.log(`First transformed participant:`, JSON.stringify(transformedParticipants[0], null, 2));
        
        // Process participants in smaller batches to avoid constraint violations
        const batchSize = 50;
        let successfulInserts = 0;
        
        for (let i = 0; i < transformedParticipants.length; i += batchSize) {
          const batch = transformedParticipants.slice(i, i + batchSize);
          
          try {
            const { error: participantsError, data: insertedParticipants } = await supabase
              .from('zoom_participants')
              .upsert(
                batch,
                {
                  onConflict: 'webinar_id,participant_id',
                  ignoreDuplicates: true  // FIXED: Prevent deletion of existing data
                }
              )
              .select('id');

            if (participantsError) {
              console.error(`Participants batch ${i}-${i + batch.length} insertion failed:`, participantsError);
              console.error('Batch data sample:', JSON.stringify(batch[0], null, 2));
              
              // Try individual inserts to identify problematic records
              for (const participant of batch) {
                try {
                  await supabase
                    .from('zoom_participants')
                    .upsert(
                      participant,
                      {
                        onConflict: 'webinar_id,participant_id',
                        ignoreDuplicates: true
                      }
                    );
                  successfulInserts++;
                } catch (individualError) {
                  console.error(`Failed to insert individual participant:`, individualError, participant);
                }
              }
            } else {
              successfulInserts += batch.length;
              console.log(`Successfully processed batch ${i}-${i + batch.length} participants`);
            }
          } catch (batchError) {
            console.error(`Batch processing error:`, batchError);
          }
        }
        
        console.log(`Successfully inserted ${successfulInserts} out of ${transformedParticipants.length} participants`);
      } else {
        console.log(`No valid participants to process for webinar ${webinarData.id}`);
      }
    } else {
      console.log(`No participants data to process for webinar ${webinarData.id}`);
    }

    // Update webinar metrics
    await updateWebinarMetrics(supabase, webinarDbId, registrants || [], participants || []);

    return { 
      success: true, 
      webinarId: webinarDbId 
    };
    
  } catch (error) {
    console.error(`Validation error for webinar ${webinarData.id}:`, error);
    return { 
      success: false, 
      error: `Validation failed: ${error.message}` 
    };
  }
}
