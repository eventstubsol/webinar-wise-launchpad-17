
import { supabase } from '@/integrations/supabase/client';

/**
 * Database operations for webinar interactions (Q&A, Polls, etc.)
 */
export class ZoomInteractionOperations {
  /**
   * Upsert Q&A data for a webinar
   */
  static async upsertQnA(qnaData: any[], webinarDbId: string): Promise<void> {
    if (!qnaData || qnaData.length === 0) return;

    const transformedQnA = qnaData.map(item => ({
      webinar_id: webinarDbId,
      question_id: item.id || item.question_id || `qna_${Date.now()}_${Math.random()}`,
      question: item.question || '',
      answer: item.answer || '',
      asker_name: item.asker_name || '',
      answerer_name: item.answerer_name || '',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }));

    const { error } = await supabase
      .from('zoom_qna')
      .upsert(transformedQnA, {
        onConflict: 'webinar_id',
        ignoreDuplicates: false
      });

    if (error) {
      throw new Error(`Failed to upsert Q&A data: ${error.message}`);
    }
  }

  /**
   * Upsert poll responses for a webinar
   */
  static async upsertPollResponses(pollResponses: any[], webinarDbId: string): Promise<void> {
    if (!pollResponses || pollResponses.length === 0) return;

    const transformedPolls = pollResponses.map(poll => ({
      webinar_id: webinarDbId,
      poll_id: poll.poll_id || poll.id || `poll_${Date.now()}_${Math.random()}`,
      title: poll.title || poll.question || 'Poll',
      questions: JSON.stringify(poll.questions || [poll]),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }));

    const { error } = await supabase
      .from('zoom_polls')
      .insert(transformedPolls);

    if (error) {
      throw new Error(`Failed to upsert poll data: ${error.message}`);
    }
  }
}

// Export for backward compatibility
export const InteractionOperations = ZoomInteractionOperations;
