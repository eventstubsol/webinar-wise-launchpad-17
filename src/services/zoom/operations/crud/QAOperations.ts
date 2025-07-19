
import { supabase } from '@/integrations/supabase/client';
import { InteractionTransformers } from '../../utils/transformers/interactionTransformers';

/**
 * Database operations for webinar Q&A
 */
export class QAOperations {
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
