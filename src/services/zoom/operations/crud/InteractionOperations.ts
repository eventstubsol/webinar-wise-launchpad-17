
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
      question_details: item.question_details || {},
      answer_details: item.answer_details || {},
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
  static async upsertPollResponses(pollResponses: any[], pollId: string): Promise<void> {
    if (!pollResponses || pollResponses.length === 0) return;

    const transformedResponses = pollResponses.map(response => ({
      poll_id: pollId,
      participant_name: response.participant_name || '',
      participant_email: response.participant_email || '',
      question_details: response.question_details || {},
      date_time: response.date_time || new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }));

    const { error } = await supabase
      .from('zoom_poll_responses')
      .upsert(transformedResponses, {
        onConflict: 'poll_id,participant_email',
        ignoreDuplicates: false
      });

    if (error) {
      throw new Error(`Failed to upsert poll responses: ${error.message}`);
    }
  }
}

// Export for backward compatibility
export const InteractionOperations = ZoomInteractionOperations;
