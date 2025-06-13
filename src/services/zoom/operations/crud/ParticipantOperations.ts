
import { supabase } from '@/integrations/supabase/client';
import { ZoomDataTransformers } from '../../utils/dataTransformers';

/**
 * Database operations for registrants and participants
 */
export class ParticipantOperations {
  /**
   * Upsert registrants for a webinar
   */
  static async upsertRegistrants(registrants: any[], webinarDbId: string): Promise<void> {
    if (!registrants || registrants.length === 0) return;

    const transformedRegistrants = registrants.map(registrant => {
      const transformed = ZoomDataTransformers.transformRegistrant(registrant, webinarDbId);
      return {
        ...transformed,
        // Convert CustomQuestion[] to Json format
        custom_questions: transformed.custom_questions ? JSON.parse(JSON.stringify(transformed.custom_questions)) : null,
        updated_at: new Date().toISOString()
      };
    });

    const { error } = await supabase
      .from('zoom_registrants')
      .upsert(
        transformedRegistrants,
        {
          onConflict: 'webinar_id,registrant_id',
          ignoreDuplicates: false
        }
      );

    if (error) {
      throw new Error(`Failed to upsert registrants: ${error.message}`);
    }
  }

  /**
   * Upsert participants for a webinar
   */
  static async upsertParticipants(participants: any[], webinarDbId: string): Promise<void> {
    if (!participants || participants.length === 0) return;

    const transformedParticipants = participants.map(participant => {
      const transformed = ZoomDataTransformers.transformParticipant(participant, webinarDbId);
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
}
