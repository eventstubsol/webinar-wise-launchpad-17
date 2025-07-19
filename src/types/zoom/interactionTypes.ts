
/**
 * Database types for Zoom polls, Q&A, and other interactions
 */

import { QnaStatus } from './enums';
import { PollQuestion, PollResponse } from './jsonTypes';

/** Poll configuration and questions */
export interface ZoomPoll {
  id: string;
  webinar_id: string;
  poll_id: string;
  poll_title: string;
  poll_type: string | null;
  status: string | null;
  anonymous: boolean | null;
  questions: PollQuestion[] | null;
  created_at: string | null;
  updated_at: string | null;
}

/** Individual poll responses from participants */
export interface ZoomPollResponse {
  id: string;
  poll_id: string;
  participant_id: string | null;
  participant_name: string | null;
  participant_email: string | null;
  responses: PollResponse[] | null;
  submitted_at: string;
  created_at: string | null;
}

/** Q&A session questions and answers */
export interface ZoomQna {
  id: string;
  webinar_id: string;
  question_id: string;
  question: string;
  answer: string | null;
  asker_name: string;
  asker_email: string | null;
  answered_by: string | null;
  asked_at: string;
  answered_at: string | null;
  upvote_count: number | null;
  status: QnaStatus | null;
  anonymous: boolean | null;
  created_at: string | null;
  updated_at: string | null;
}
