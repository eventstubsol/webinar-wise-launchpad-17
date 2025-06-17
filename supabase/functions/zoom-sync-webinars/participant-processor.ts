
/**
 * Dedicated participant processing module with proper constraint handling
 */

import { transformParticipantForDatabase } from './data-transformers.ts';

export interface ParticipantProcessingResult {
  successfulInserts: number;
  transformationErrors: Array<{
    index: number;
    error: string;
    data: any;
  }>;
  batchErrors: Array<{
    batch: number;
    error: string;
    type?: string;
    sampleData?: any;
  }>;
  totalProcessed: number;
}

/**
 * Process participants with proper database constraint handling
 */
export async function processParticipantsForWebinar(
  supabase: any,
  participants: any[],
  webinarDbId: string,
  webinarId: string
): Promise<ParticipantProcessingResult> {
  console.log(`=== PARTICIPANT PROCESSING START FOR WEBINAR ${webinarId} ===`);
  console.log(`Raw participants count: ${participants.length}`);
  console.log(`Target webinar DB ID: ${webinarDbId}`);
  
  const result: ParticipantProcessingResult = {
    successfulInserts: 0,
    transformationErrors: [],
    batchErrors: [],
    totalProcessed: 0
  };
  
  if (!participants || participants.length === 0) {
    console.log('No participants to process');
    return result;
  }
  
  // Transform participants with enhanced error handling
  const transformedParticipants = [];
  
  for (let i = 0; i < participants.length; i++) {
    try {
      const transformed = transformParticipantForDatabase(participants[i], webinarDbId);
      
      // Ensure join_time is properly set for the unique constraint
      if (!transformed.join_time) {
        // Use a timestamp based on the participant data or a fallback
        const fallbackTime = participants[i].join_time || 
                            participants[i].registration_time || 
                            new Date().toISOString();
        transformed.join_time = fallbackTime;
        console.log(`⚠️ Participant ${i + 1} missing join_time, using fallback: ${fallbackTime}`);
      }
      
      transformedParticipants.push(transformed);
    } catch (transformError) {
      console.error(`❌ Failed to transform participant ${i + 1}:`, transformError);
      result.transformationErrors.push({
        index: i,
        error: transformError.message,
        data: participants[i]
      });
    }
  }
  
  console.log(`Transformation complete: ${transformedParticipants.length} valid, ${result.transformationErrors.length} failed`);
  
  if (transformedParticipants.length === 0) {
    console.log('No valid participants after transformation');
    return result;
  }
  
  // Process in batches with the correct database constraint
  const batchSize = 10;
  
  for (let i = 0; i < transformedParticipants.length; i += batchSize) {
    const batch = transformedParticipants.slice(i, i + batchSize);
    const batchNumber = Math.floor(i / batchSize) + 1;
    
    console.log(`Processing batch ${batchNumber}: ${batch.length} participants`);
    
    try {
      const { data: insertedParticipants, error: participantsError } = await supabase
        .from('zoom_participants')
        .upsert(
          batch,
          {
            onConflict: 'webinar_id,participant_id,join_time', // Correct constraint
            ignoreDuplicates: false
          }
        )
        .select('id');

      if (participantsError) {
        console.error(`❌ Batch ${batchNumber} failed:`, participantsError);
        result.batchErrors.push({
          batch: batchNumber,
          error: participantsError.message,
          sampleData: batch[0]
        });
        
        // Try individual inserts for failed batch
        for (const participant of batch) {
          try {
            const { error: individualError } = await supabase
              .from('zoom_participants')
              .upsert(
                participant,
                {
                  onConflict: 'webinar_id,participant_id,join_time',
                  ignoreDuplicates: false
                }
              );
            
            if (individualError) {
              console.error(`❌ Individual participant failed:`, individualError);
            } else {
              result.successfulInserts++;
            }
          } catch (individualException) {
            console.error(`❌ Individual participant exception:`, individualException);
          }
        }
      } else {
        result.successfulInserts += batch.length;
        console.log(`✅ Batch ${batchNumber} successful: ${batch.length} participants`);
      }
    } catch (batchException) {
      console.error(`❌ Batch ${batchNumber} exception:`, batchException);
      result.batchErrors.push({
        batch: batchNumber,
        error: batchException.message,
        type: 'exception'
      });
    }
  }
  
  result.totalProcessed = transformedParticipants.length;
  
  // Verify database state
  const { data: dbParticipants, error: verifyError } = await supabase
    .from('zoom_participants')
    .select('id')
    .eq('webinar_id', webinarDbId);
  
  if (!verifyError && dbParticipants) {
    console.log(`✅ Verification: ${dbParticipants.length} participants in DB for webinar ${webinarDbId}`);
  }
  
  console.log(`=== PARTICIPANT PROCESSING COMPLETE ===`);
  console.log(`Successful inserts: ${result.successfulInserts}`);
  console.log(`Transformation errors: ${result.transformationErrors.length}`);
  console.log(`Batch errors: ${result.batchErrors.length}`);
  
  return result;
}
