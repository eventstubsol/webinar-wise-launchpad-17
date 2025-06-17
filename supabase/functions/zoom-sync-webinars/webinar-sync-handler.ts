
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
          ignoreDuplicates: false  // FIXED: Allow updates to existing webinars
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
    
    // If no record returned, fetch the existing one
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
            ignoreDuplicates: false  // FIXED: Allow updates to existing registrants
          }
        );

      if (registrantsError) {
        console.error('Registrants insertion failed:', registrantsError);
        console.log(`Continuing despite registrants error for webinar ${webinarData.id}`);
      } else {
        console.log(`Successfully processed ${transformedRegistrants.length} registrants`);
      }
    }

    // ENHANCED: Process participants with comprehensive logging and debugging
    if (participants && participants.length > 0) {
      console.log(`=== PARTICIPANT PROCESSING DEBUG START ===`);
      console.log(`Raw participants count from Zoom API: ${participants.length}`);
      console.log(`Webinar DB ID for participants: ${webinarDbId}`);
      console.log(`Sample raw participant data:`, JSON.stringify(participants[0], null, 2));
      
      let transformedParticipants = [];
      let transformationErrors = [];
      
      // Transform participants with individual error handling
      for (let i = 0; i < participants.length; i++) {
        try {
          const transformed = transformParticipantForDatabase(participants[i], webinarDbId);
          transformedParticipants.push(transformed);
          console.log(`✅ Participant ${i + 1} transformed successfully`);
        } catch (transformError) {
          console.error(`❌ Failed to transform participant ${i + 1}:`, transformError);
          console.error(`Problematic participant data:`, JSON.stringify(participants[i], null, 2));
          transformationErrors.push({
            index: i,
            error: transformError.message,
            data: participants[i]
          });
        }
      }
      
      console.log(`Transformation results: ${transformedParticipants.length} successful, ${transformationErrors.length} failed`);
      
      if (transformedParticipants.length > 0) {
        console.log(`Sample transformed participant:`, JSON.stringify(transformedParticipants[0], null, 2));
        
        // Process participants in smaller batches with detailed logging
        const batchSize = 10; // Smaller batches for better error isolation
        let successfulInserts = 0;
        let batchErrors = [];
        
        for (let i = 0; i < transformedParticipants.length; i += batchSize) {
          const batch = transformedParticipants.slice(i, i + batchSize);
          const batchNumber = Math.floor(i / batchSize) + 1;
          
          console.log(`Processing participant batch ${batchNumber}: ${batch.length} participants`);
          
          try {
            const { data: insertedParticipants, error: participantsError } = await supabase
              .from('zoom_participants')
              .upsert(
                batch,
                {
                  onConflict: 'webinar_id,participant_id',
                  ignoreDuplicates: false  // FIXED: Allow updates to existing participants
                }
              )
              .select('id');

            if (participantsError) {
              console.error(`❌ Batch ${batchNumber} insertion failed:`, participantsError);
              console.error(`Batch ${batchNumber} sample data:`, JSON.stringify(batch[0], null, 2));
              
              batchErrors.push({
                batch: batchNumber,
                error: participantsError.message,
                sampleData: batch[0]
              });
              
              // Try individual inserts to identify problematic records
              console.log(`Attempting individual inserts for batch ${batchNumber}...`);
              for (let j = 0; j < batch.length; j++) {
                try {
                  const { error: individualError } = await supabase
                    .from('zoom_participants')
                    .upsert(
                      batch[j],
                      {
                        onConflict: 'webinar_id,participant_id',
                        ignoreDuplicates: false
                      }
                    );
                  
                  if (individualError) {
                    console.error(`❌ Individual participant ${j + 1} in batch ${batchNumber} failed:`, individualError);
                    console.error(`Failed participant data:`, JSON.stringify(batch[j], null, 2));
                  } else {
                    successfulInserts++;
                    console.log(`✅ Individual participant ${j + 1} in batch ${batchNumber} succeeded`);
                  }
                } catch (individualException) {
                  console.error(`❌ Exception inserting individual participant ${j + 1}:`, individualException);
                }
              }
            } else {
              successfulInserts += batch.length;
              console.log(`✅ Batch ${batchNumber} successful: ${batch.length} participants inserted`);
              if (insertedParticipants) {
                console.log(`Batch ${batchNumber} returned ${insertedParticipants.length} IDs`);
              }
            }
          } catch (batchException) {
            console.error(`❌ Batch ${batchNumber} exception:`, batchException);
            batchErrors.push({
              batch: batchNumber,
              error: batchException.message,
              type: 'exception'
            });
          }
        }
        
        console.log(`=== PARTICIPANT PROCESSING SUMMARY ===`);
        console.log(`Total participants from API: ${participants.length}`);
        console.log(`Successfully transformed: ${transformedParticipants.length}`);
        console.log(`Transformation errors: ${transformationErrors.length}`);
        console.log(`Successfully inserted to DB: ${successfulInserts}`);
        console.log(`Batch errors: ${batchErrors.length}`);
        
        if (transformationErrors.length > 0) {
          console.log(`Transformation error details:`, transformationErrors);
        }
        
        if (batchErrors.length > 0) {
          console.log(`Batch error details:`, batchErrors);
        }
        
        // Verify actual database insertion
        const { data: dbParticipants, error: verifyError } = await supabase
          .from('zoom_participants')
          .select('id, participant_name, participant_email')
          .eq('webinar_id', webinarDbId);
        
        if (verifyError) {
          console.error(`❌ Failed to verify participants in database:`, verifyError);
        } else {
          console.log(`✅ Database verification: ${dbParticipants?.length || 0} participants found in DB for webinar ${webinarDbId}`);
          if (dbParticipants && dbParticipants.length > 0) {
            console.log(`Sample DB participant:`, dbParticipants[0]);
          }
        }
        
        console.log(`=== PARTICIPANT PROCESSING DEBUG END ===`);
      } else {
        console.log(`❌ No valid participants to process for webinar ${webinarData.id} after transformation`);
      }
    } else {
      console.log(`ℹ️ No participants data to process for webinar ${webinarData.id}`);
    }

    // Update webinar metrics
    await updateWebinarMetrics(supabase, webinarDbId, registrants || [], participants || []);

    return { 
      success: true, 
      webinarId: webinarDbId 
    };
    
  } catch (error) {
    console.error(`❌ Validation error for webinar ${webinarData.id}:`, error);
    return { 
      success: false, 
      error: `Validation failed: ${error.message}` 
    };
  }
}
