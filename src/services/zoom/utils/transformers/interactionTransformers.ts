
/**
 * Interaction data transformation utilities (polls, Q&A)
 */
export class InteractionTransformers {
  static transformPoll(apiPoll: any, webinarId: string) {
    return {
      webinar_id: webinarId,
      poll_id: apiPoll.id,
      poll_title: apiPoll.title,
      poll_type: apiPoll.type,
      questions: apiPoll.questions || [], // FIXED: Added missing questions field
      created_at: new Date().toISOString()
    };
  }

  static transformQnA(apiQnA: any, webinarId: string) {
    return {
      webinar_id: webinarId,
      question_id: apiQnA.id,
      question: apiQnA.question, // FIXED: Changed from question_text to question
      answer: apiQnA.answer, // FIXED: Changed from answer_text to answer
      asker_name: apiQnA.asker_name || 'Anonymous', // FIXED: Added required field
      asker_email: apiQnA.asker_email || null,
      asked_at: apiQnA.asked_at || new Date().toISOString(), // FIXED: Added required field
      answered_at: apiQnA.answered_at || null,
      answered_by: apiQnA.answered_by || null,
      upvote_count: apiQnA.upvote_count || 0,
      status: apiQnA.status || 'open',
      anonymous: apiQnA.anonymous || false,
      created_at: new Date().toISOString()
    };
  }
}
