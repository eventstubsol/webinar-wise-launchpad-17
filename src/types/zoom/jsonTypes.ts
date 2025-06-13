
/**
 * JSON field types for Zoom data structures
 */

/** Structure for poll questions stored in JSON */
export interface PollQuestion {
  id: string;
  name: string;
  type: 'single' | 'multiple' | 'rating' | 'rank_order';
  prompts: Array<{
    prompt_question: string;
    prompt_right_answers?: string[];
  }>;
  [key: string]: any; // Index signature for Json compatibility
}

/** Structure for poll responses stored in JSON */
export interface PollResponse {
  question_id: string;
  question: string;
  answer: string;
  date_time: string;
  [key: string]: any; // Index signature for Json compatibility
}

/** Custom registration questions */
export interface CustomQuestion {
  title: string;
  value: string;
  required?: boolean;
  [key: string]: any; // Index signature for Json compatibility
}

/** Sync error details stored in JSON - compatible with Supabase Json type */
export interface SyncErrorDetails {
  error_code?: string;
  error_message: string;
  failed_items?: Array<{
    id: string;
    type: string;
    error: string;
  }>;
  retry_count?: number;
  last_retry_at?: string;
  [key: string]: any; // Index signature for Json compatibility
}
