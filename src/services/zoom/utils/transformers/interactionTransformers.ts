
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
      created_at: new Date().toISOString()
    };
  }

  static transformQnA(apiQnA: any, webinarId: string) {
    return {
      webinar_id: webinarId,
      question_id: apiQnA.id,
      question_text: apiQnA.question,
      answer_text: apiQnA.answer,
      created_at: new Date().toISOString()
    };
  }
}
