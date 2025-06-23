
import { supabase } from '@/integrations/supabase/client';
import { InteractionTransformers } from '../../utils/transformers/interactionTransformers';

/**
 * Database operations for polls and Q&A interactions
 */
export class InteractionOperations {
  /**
   * Upsert polls for a webinar
   */
  static async upsertPolls(polls: any[], webinarDbId: string): Promise<void> {
    if (!polls || polls.length === 0) return;

    const transformedPolls = polls.map(poll => {
      const transformed = InteractionTransformers.transformPoll(poll, webinarDbId);
      return {
        ...transformed,
        // FIXED: Properly handle questions field
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

  /**
   * Upsert Q&A for a webinar
   */
  static async upsertQnA(qnaData: any[], webinarDbId: string): Promise<void> {
    if (!qnaData || qnaData.length === 0) return;

    const transformedQnA = qnaData.map(qna => {
      const transformed = InteractionTransformers.transformQnA(qna, webinarDbId);
      return {
        ...transformed,
        updated_at: new Date().toISOString()
      };
    });

    const { error } = await supabase
      .from('zoom_qna')
      .upsert(
        transformedQnA,
        {
          onConflict: 'webinar_id,question_id',
          ignoreDuplicates: false
        }
      );

    if (error) {
      throw new Error(`Failed to upsert Q&A: ${error.message}`);
    }
  }
}
