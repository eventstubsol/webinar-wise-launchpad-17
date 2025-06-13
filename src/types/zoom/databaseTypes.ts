
/**
 * Database row types for Zoom tables
 */

import { 
  ConnectionStatus, 
  WebinarStatus, 
  SyncType, 
  SyncStatus, 
  RegistrantStatus, 
  QnaStatus, 
  RecordingType, 
  RecordingStatus, 
  RefreshType, 
  RefreshStatus 
} from './enums';
import { PollQuestion, PollResponse, CustomQuestion, SyncErrorDetails } from './jsonTypes';

/** Zoom OAuth connection and account information */
export interface ZoomConnection {
  id: string;
  user_id: string;
  zoom_user_id: string;
  zoom_account_id: string;
  zoom_email: string;
  zoom_account_type: string | null;
  access_token: string;
  refresh_token: string;
  token_expires_at: string;
  scopes: string[] | null;
  connection_status: ConnectionStatus;
  is_primary: boolean | null;
  auto_sync_enabled: boolean | null;
  sync_frequency_hours: number | null;
  last_sync_at: string | null;
  next_sync_at: string | null;
  created_at: string | null;
  updated_at: string | null;
}

/** Webinar metadata and configuration */
export interface ZoomWebinar {
  id: string;
  connection_id: string;
  webinar_id: string;
  webinar_uuid: string;
  host_id: string;
  host_email: string | null;
  topic: string;
  agenda: string | null;
  type: number;
  status: WebinarStatus | null;
  start_time: string | null;
  duration: number | null;
  timezone: string | null;
  registration_required: boolean | null;
  registration_type: number | null;
  registration_url: string | null;
  join_url: string | null;
  approval_type: number | null;
  alternative_hosts: string[] | null;
  max_registrants: number | null;
  max_attendees: number | null;
  occurrence_id: string | null;
  total_registrants: number | null;
  total_attendees: number | null;
  total_minutes: number | null;
  avg_attendance_duration: number | null;
  synced_at: string | null;
  created_at: string | null;
  updated_at: string | null;
}

/** Webinar registrant information */
export interface ZoomRegistrant {
  id: string;
  webinar_id: string;
  registrant_id: string;
  registrant_email: string;
  first_name: string | null;
  last_name: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  country: string | null;
  phone: string | null;
  comments: string | null;
  custom_questions: CustomQuestion[] | null;
  registration_time: string;
  source_id: string | null;
  tracking_source: string | null;
  status: RegistrantStatus | null;
  join_time: string | null;
  leave_time: string | null;
  duration: number | null;
  attended: boolean | null;
  created_at: string | null;
  updated_at: string | null;
}

/** Participant attendance and engagement data */
export interface ZoomParticipant {
  id: string;
  webinar_id: string;
  participant_id: string;
  registrant_id: string | null;
  participant_name: string;
  participant_email: string | null;
  participant_user_id: string | null;
  join_time: string;
  leave_time: string | null;
  duration: number | null;
  attentiveness_score: number | null;
  camera_on_duration: number | null;
  share_application_duration: number | null;
  share_desktop_duration: number | null;
  posted_chat: boolean | null;
  raised_hand: boolean | null;
  answered_polling: boolean | null;
  asked_question: boolean | null;
  device: string | null;
  ip_address: unknown | null;
  location: string | null;
  network_type: string | null;
  version: string | null;
  customer_key: string | null;
  created_at: string | null;
  updated_at: string | null;
}

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

/** Recording files and metadata */
export interface ZoomRecording {
  id: string;
  webinar_id: string;
  recording_id: string;
  recording_uuid: string;
  recording_type: RecordingType | null;
  recording_start: string;
  recording_end: string;
  file_type: string | null;
  file_size: number | null;
  play_url: string | null;
  download_url: string | null;
  password: string | null;
  status: RecordingStatus | null;
  total_views: number | null;
  total_downloads: number | null;
  expires_at: string | null;
  created_at: string | null;
  updated_at: string | null;
}

/** Sync operation tracking and progress */
export interface ZoomSyncLog {
  id: string;
  connection_id: string;
  sync_type: SyncType;
  sync_status: SyncStatus;
  resource_type: string | null;
  resource_id: string | null;
  started_at: string;
  completed_at: string | null;
  duration_seconds: number | null;
  total_items: number | null;
  processed_items: number | null;
  failed_items: number | null;
  api_calls_made: number | null;
  rate_limit_hits: number | null;
  error_message: string | null;
  error_details: SyncErrorDetails | null;
  created_at: string | null;
  updated_at: string | null;
}

/** Token refresh audit log */
export interface ZoomTokenRefreshLog {
  id: string;
  connection_id: string;
  refresh_type: RefreshType | null;
  refresh_status: RefreshStatus | null;
  old_token_expires_at: string | null;
  new_token_expires_at: string | null;
  error_code: string | null;
  error_message: string | null;
  created_at: string | null;
}
