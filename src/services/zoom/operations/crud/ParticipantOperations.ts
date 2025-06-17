
import { supabase } from '@/integrations/supabase/client';
import { ZoomDataTransformers } from '../../utils/dataTransformers';

/**
 * Database operations for webinar participants with enhanced error handling
 */
export class ParticipantOperations {
  /**
   * Upsert participants for a webinar with proper conflict resolution
   */
  static async upsertParticipants(participants: any[], webinarDbId: string): Promise<void> {
    if (!participants || participants.length === 0) return;

    const transformedParticipants = participants.map(participant => {
      const transformed = ZoomDataTransformers.transformParticipant(participant, webinarDbId);
      return {
        ...transformed,
        updated_at: new Date().toISOString()
      };
    }).filter(Boolean); // Remove any null transformations

    if (transformedParticipants.length === 0) {
      console.log('No valid participants to upsert');
      return;
    }

    // Process in batches to avoid constraint violations
    const batchSize = 50;
    let successfulInserts = 0;

    for (let i = 0; i < transformedParticipants.length; i += batchSize) {
      const batch = transformedParticipants.slice(i, i + batchSize);
      
      try {
        const { error } = await supabase
          .from('zoom_participants')
          .upsert(
            batch,
            {
              onConflict: 'webinar_id,participant_id',
              ignoreDuplicates: true // Prevent deletion of existing data
            }
          );

        if (error) {
          console.error(`Participants batch ${i}-${i + batch.length} failed:`, error);
          
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
              console.error(`Failed to insert individual participant:`, individualError);
            }
          }
        } else {
          successfulInserts += batch.length;
        }
      } catch (batchError) {
        console.error(`Batch processing error:`, batchError);
      }
    }

    console.log(`Successfully upserted ${successfulInserts} out of ${transformedParticipants.length} participants`);
  }

  /**
   * Get participant metrics for a webinar
   */
  static async getParticipantMetrics(webinarDbId: string): Promise<{
    totalAttendees: number;
    totalMinutes: number;
    avgDuration: number;
  }> {
    const { data: participants, error } = await supabase
      .from('zoom_participants')
      .select('duration')
      .eq('webinar_id', webinarDbId);

    if (error) {
      console.error('Failed to get participant metrics:', error);
      return { totalAttendees: 0, totalMinutes: 0, avgDuration: 0 };
    }

    const totalAttendees = participants?.length || 0;
    const totalMinutes = participants?.reduce((sum, p) => sum + (p.duration || 0), 0) || 0;
    const avgDuration = totalAttendees > 0 ? Math.round(totalMinutes / totalAttendees) : 0;

    return {
      totalAttendees,
      totalMinutes,
      avgDuration
    };
  }
}
