
import { supabase } from '@/integrations/supabase/client';
import { ParticipantTransformers } from '../../utils/transformers/participantTransformers';

/**
 * Database operations for webinar participants
 */
export class ParticipantOperations {
  /**
   * Get participant metrics for a webinar
   */
  static async getParticipantMetrics(webinarDbId: string): Promise<{
    totalAttendees: number;
    totalMinutes: number;
    avgDuration: number;
  }> {
    try {
      // Get all participants with their details to calculate unique attendees
      const { data: participants, error } = await supabase
        .from('zoom_participants')
        .select('participant_id, participant_email, duration')
        .eq('webinar_id', webinarDbId);

      if (error) {
        console.error('Failed to get participant metrics:', error);
        return { totalAttendees: 0, totalMinutes: 0, avgDuration: 0 };
      }

      if (!participants || participants.length === 0) {
        return { totalAttendees: 0, totalMinutes: 0, avgDuration: 0 };
      }

      // Calculate unique attendees based on participant_id or email
      const uniqueParticipants = new Map();
      let totalMinutes = 0;

      participants.forEach(p => {
        // Use participant_id as primary key, fall back to email if not available
        const key = p.participant_id || p.participant_email || `unknown_${Math.random()}`;
        
        if (!uniqueParticipants.has(key)) {
          uniqueParticipants.set(key, { duration: 0 });
        }
        
        // Sum up duration for each unique participant
        uniqueParticipants.get(key).duration += (p.duration || 0);
        totalMinutes += (p.duration || 0);
      });

      const totalAttendees = uniqueParticipants.size;
      const avgDuration = totalAttendees > 0 ? totalMinutes / totalAttendees : 0;

      console.log(`Webinar ${webinarDbId} metrics: ${totalAttendees} unique attendees, ${totalMinutes} total minutes`);

      return {
        totalAttendees,
        totalMinutes,
        avgDuration: Math.round(avgDuration)
      };
    } catch (error) {
      console.error('Error calculating participant metrics:', error);
      return { totalAttendees: 0, totalMinutes: 0, avgDuration: 0 };
    }
  }

  /**
   * Upsert participants for a webinar
   */
  static async upsertParticipants(participants: any[], webinarDbId: string): Promise<void> {
    if (!participants || participants.length === 0) {
      console.log('No participants to upsert');
      return;
    }

    try {
      // Process participants one by one to handle missing fields properly
      for (const participant of participants) {
        const transformed = ParticipantTransformers.transformParticipant(participant, webinarDbId);
        
        const participantData = {
          ...transformed,
          name: transformed.participant_name || 'Unknown Participant',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };

        const { error } = await supabase
          .from('zoom_participants')
          .upsert(
            participantData,
            {
              onConflict: 'webinar_id,participant_id',
              ignoreDuplicates: false
            }
          );

        if (error) {
          console.error('Failed to upsert participant:', error);
          // Continue with next participant instead of throwing
        }
      }

      console.log(`Successfully processed ${participants.length} participants`);
    } catch (error) {
      console.error('Error in upsertParticipants:', error);
      throw error;
    }
  }

  /**
   * Get participants for a webinar with engagement data
   */
  static async getParticipantsWithEngagement(webinarDbId: string) {
    try {
      const { data: participants, error } = await supabase
        .from('zoom_participants')
        .select('*')
        .eq('webinar_id', webinarDbId)
        .order('join_time', { ascending: true });

      if (error) {
        console.error('Failed to get participants:', error);
        return [];
      }

      // Enhance with engagement data
      return participants?.map(participant => ({
        ...participant,
        ...ParticipantTransformers.normalizeEngagementData(participant)
      })) || [];
    } catch (error) {
      console.error('Error getting participants with engagement:', error);
      return [];
    }
  }
}
