
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
      const avgDuration = totalAttendees > 0 ? totalMinutes / totalAttendees : 0;

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
      const transformedParticipants = participants.map(participant => {
        const transformed = ParticipantTransformers.transformParticipant(participant, webinarDbId);
        return {
          // Map to correct database field names
          webinar_id: webinarDbId,
          participant_id: transformed.participant_id,
          name: transformed.participant_name, // Database uses 'name' not 'participant_name'
          email: transformed.participant_email,
          join_time: transformed.join_time,
          leave_time: transformed.leave_time,
          duration: transformed.duration,
          attentiveness_score: transformed.attentiveness_score,
          answered_polling: transformed.answered_polling,
          asked_question: transformed.asked_question,
          camera_on_duration: transformed.camera_on_duration,
          device: transformed.device,
          ip_address: transformed.ip_address,
          location: transformed.location,
          network_type: transformed.network_type,
          version: transformed.version,
          customer_key: transformed.customer_key,
          created_at: new Date().toISOString(),
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
        console.error('Failed to upsert participants:', error);
        throw new Error(`Failed to upsert participants: ${error.message}`);
      }

      console.log(`Successfully upserted ${participants.length} participants`);
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
