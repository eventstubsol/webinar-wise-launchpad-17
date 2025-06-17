
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

/** Webinar settings structure */
export interface WebinarSettings {
  host_video?: boolean;
  panelists_video?: boolean;
  practice_session?: boolean;
  hd_video?: boolean;
  approval_type?: number;
  registration_type?: number;
  audio?: string;
  auto_recording?: string;
  alternative_hosts?: string;
  close_registration?: boolean;
  show_share_button?: boolean;
  allow_multiple_devices?: boolean;
  on_demand?: boolean;
  global_dial_in_countries?: string[];
  contact_name?: string;
  contact_email?: string;
  registrants_restrict_number?: number;
  post_webinar_survey?: boolean;
  survey_url?: string;
  registrants_email_notification?: boolean;
  meeting_authentication?: boolean;
  authentication_option?: string;
  authentication_domains?: string;
  [key: string]: any; // Index signature for Json compatibility
}

/** Registrant information structure */
export interface RegistrantInfo {
  custom_questions?: CustomQuestion[];
  [key: string]: any; // Index signature for Json compatibility
}

/** Recording information structure */
export interface RecordingInfo {
  id?: string;
  meeting_id?: string;
  recording_start?: string;
  recording_end?: string;
  file_type?: string;
  file_size?: number;
  play_url?: string;
  download_url?: string;
  status?: string;
  recording_type?: string;
  [key: string]: any; // Index signature for Json compatibility
}

/** Panelist information structure */
export interface PanelistInfo {
  id?: string;
  name?: string;
  email?: string;
  join_url?: string;
  [key: string]: any; // Index signature for Json compatibility
}

/** Chat message information structure */
export interface ChatMessageInfo {
  message_id?: string;
  sender?: string;
  message?: string;
  timestamp?: string;
  message_type?: string;
  [key: string]: any; // Index signature for Json compatibility
}

/** Tracking information structure */
export interface TrackingInfo {
  field?: string;
  value?: string;
  visible?: boolean;
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
