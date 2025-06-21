
import { updateSyncStage } from '../database-operations.ts';

/**
 * Database operations for participant sync
 */
export async function saveParticipantsToDatabase(
  supabase: any,
  transformedParticipants: any[],
  webinarId: string,
  debugMode = false
): Promise<{ success: boolean; count: number; error?: any }> {
  console.log(`ENHANCED: Preparing database insertion for ${transformedParticipants.length} participants`);
  
  if (debugMode) {
    console.log(`DEBUG: Database insertion details:`);
    console.log(`  - Table: zoom_participants`);
    console.log(`  - Conflict resolution: webinar_id,participant_id`);
    console.log(`  - Operation: upsert`);
    console.log(`  - Sample payload structure:`, Object.keys(transformedParticipants[0] || {}));
  }

  try {
    // Upsert participants to database
    const { error, data } = await supabase
      .from('zoom_participants')
      .upsert(
        transformedParticipants,
        {
          onConflict: 'webinar_id,participant_id',
          ignoreDuplicates: false
        }
      )
      .select('id');

    if (error) {
      console.error('ENHANCED: Database insertion failed for participants:', {
        error: error,
        webinarId: webinarId,
        participantCount: transformedParticipants.length
      });
      
      if (debugMode) {
        console.log(`DEBUG: Database error details:`, JSON.stringify(error, null, 2));
        console.log(`DEBUG: Failed payload sample:`, JSON.stringify(transformedParticipants[0], null, 2));
      }
      
      return { success: false, count: 0, error };
    }

    return { 
      success: true, 
      count: transformedParticipants.length,
      data
    };

  } catch (error) {
    console.error(`ENHANCED: Exception during database insertion:`, error);
    return { success: false, count: 0, error };
  }
}
