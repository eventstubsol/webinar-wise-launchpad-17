
import { ZoomPoll, ZoomQna } from '@/types/zoom';

/**
 * Data transformation utilities for polls and Q&A interactions
 */
export class InteractionTransformers {
  /**
   * Transform Zoom API poll to database format
   */
  static transformPoll(
    apiPoll: any,
    webinarId: string
  ): Omit<ZoomPoll, 'id' | 'created_at' | 'updated_at'> {
    return {
      webinar_id: webinarId,
      poll_id: apiPoll.id || apiPoll.poll_id,
      poll_title: apiPoll.title || apiPoll.poll_title,
      poll_type: apiPoll.type || null,
      status: apiPoll.status || null,
      anonymous: apiPoll.anonymous || false,
      questions: apiPoll.questions || [],
    };
  }

  /**
   * Transform Zoom API Q&A to database format
   */
  static transformQnA(
    apiQnA: any,
    webinarId: string
  ): Omit<ZoomQna, 'id' | 'created_at' | 'updated_at'> {
    return {
      webinar_id: webinarId,
      question_id: apiQnA.question_id || apiQnA.id,
      question: apiQnA.question,
      answer: apiQnA.answer || null,
      asker_name: apiQnA.asker_name,
      asker_email: apiQnA.asker_email || null,
      answered_by: apiQnA.answered_by || null,
      asked_at: apiQnA.asked_at || apiQnA.question_time,
      answered_at: apiQnA.answered_at || apiQnA.answer_time || null,
      upvote_count: apiQnA.upvote_count || 0,
      status: apiQnA.status || 'open',
      anonymous: apiQnA.anonymous || false,
    };
  }
}
