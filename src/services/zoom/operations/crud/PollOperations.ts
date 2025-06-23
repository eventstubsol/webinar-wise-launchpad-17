
import { supabase } from '@/integrations/supabase/client';
import { InteractionTransformers } from '../../utils/transformers/interactionTransformers';

/**
 * Database operations for webinar polls
 */
export class PollOperations {
  /**
   * Upsert polls for a webinar
   */
  static async upsertPolls(polls: any[], webinarDbId: string): Promise<void> {
    if (!polls || polls.length === 0) return;

    const transformedPolls = polls.map(poll => {
      const transformed = InteractionTransformers.transformPoll(poll, webinarDbId);
      return {
        ...transformed,
        questions: transformed.questions ? JSON.parse(JSON.stringify(transformed.questions)) : [],
        updated_at: new Date().toISOString()
      };
    });

    const { error } = await supabase
      .from('zoom_polls')
      .upsert(
        transformedPolls,
        {
          onConflict: 'webinar_id,poll_id',
          ignoreDuplicates: false
        }
      );

    if (error) {
      throw new Error(`Failed to upsert polls: ${error.message}`);
    }
  }
}
