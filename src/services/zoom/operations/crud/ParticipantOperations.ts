
import { supabase } from '@/integrations/supabase/client';
import { ParticipantTransformers } from '../../utils/transformers/participantTransformers';

/**
 * Database operations for webinar participants
 */
export class ParticipantOperations {
  /**
   * Upsert participants for a webinar
   */
  static async upsertParticipants(participants: any[], webinarDbId: string): Promise<void> {
    if (!participants || participants.length === 0) return;

    const transformedParticipants = participants.map(participant => {
      const transformed = ParticipantTransformers.transformParticipant(participant, webinarDbId);
      return {
        ...transformed,
        updated_at: new Date().toISOString()
      };
    });

    const { error } = await supabase
      .from('zoom_participants')
      .upsert(
        transformedParticipants,
        {
          onConflict: 'webinar_id,participant_id',
          ignoreDuplicates: false
        }
      );

    if (error) {
      throw new Error(`Failed to upsert participants: ${error.message}`);
    }
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
