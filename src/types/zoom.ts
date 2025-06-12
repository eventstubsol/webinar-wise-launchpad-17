
/**
 * Comprehensive TypeScript types for Webinar Wise Zoom integration
 * Matches Supabase database schema and includes API response types
 */

// ============================================================================
// ENUMS
// ============================================================================

/** Zoom connection status values */
export enum ConnectionStatus {
  ACTIVE = 'active',
  EXPIRED = 'expired',
  REVOKED = 'revoked',
  ERROR = 'error'
}

/** Webinar status values */
export enum WebinarStatus {
  SCHEDULED = 'scheduled',
  STARTED = 'started',
  FINISHED = 'finished',
  CANCELLED = 'cancelled'
}

/** Sync operation types */
export enum SyncType {
  INITIAL = 'initial',
  INCREMENTAL = 'incremental',
  MANUAL = 'manual',
  WEBHOOK = 'webhook'
}

/** Sync operation status values */
export enum SyncStatus {
  STARTED = 'started',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled'
}

/** Registrant approval status */
export enum RegistrantStatus {
  APPROVED = 'approved',
  PENDING = 'pending',
  DENIED = 'denied',
  CANCELLED = 'cancelled'
}

/** Q&A question status */
export enum QnaStatus {
  OPEN = 'open',
  ANSWERED = 'answered',
  DISMISSED = 'dismissed'
}

/** Recording file types from Zoom */
export enum RecordingType {
  SHARED_SCREEN_WITH_SPEAKER_VIEW = 'shared_screen_with_speaker_view',
  SHARED_SCREEN_WITH_GALLERY_VIEW = 'shared_screen_with_gallery_view',
  SPEAKER_VIEW = 'speaker_view',
  GALLERY_VIEW = 'gallery_view',
  AUDIO_ONLY = 'audio_only',
  CHAT_FILE = 'chat_file',
  TRANSCRIPT = 'transcript'
}

/** Recording processing status */
export enum RecordingStatus {
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed'
}

/** Token refresh types */
export enum RefreshType {
  AUTOMATIC = 'automatic',
  MANUAL = 'manual',
  EXPIRED = 'expired'
}

/** Token refresh status */
export enum RefreshStatus {
  SUCCESS = 'success',
  FAILED = 'failed',
  RATE_LIMITED = 'rate_limited'
}

// ============================================================================
// JSON FIELD TYPES
// ============================================================================

/** Structure for poll questions stored in JSON */
export interface PollQuestion {
  id: string;
  name: string;
  type: 'single' | 'multiple' | 'rating' | 'rank_order';
  prompts: Array<{
    prompt_question: string;
    prompt_right_answers?: string[];
  }>;
}

/** Structure for poll responses stored in JSON */
export interface PollResponse {
  question_id: string;
  question: string;
  answer: string;
  date_time: string;
}

/** Custom registration questions */
export interface CustomQuestion {
  title: string;
  value: string;
  required?: boolean;
}

/** Sync error details stored in JSON */
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
}

// ============================================================================
// DATABASE ROW TYPES
// ============================================================================

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

// ============================================================================
// INSERT TYPES (for creating new records)
// ============================================================================

export type ZoomConnectionInsert = Omit<ZoomConnection, 'id' | 'created_at' | 'updated_at'>;
export type ZoomWebinarInsert = Omit<ZoomWebinar, 'id' | 'created_at' | 'updated_at'>;
export type ZoomRegistrantInsert = Omit<ZoomRegistrant, 'id' | 'created_at' | 'updated_at'>;
export type ZoomParticipantInsert = Omit<ZoomParticipant, 'id' | 'created_at' | 'updated_at'>;
export type ZoomPollInsert = Omit<ZoomPoll, 'id' | 'created_at' | 'updated_at'>;
export type ZoomPollResponseInsert = Omit<ZoomPollResponse, 'id' | 'created_at'>;
export type ZoomQnaInsert = Omit<ZoomQna, 'id' | 'created_at' | 'updated_at'>;
export type ZoomRecordingInsert = Omit<ZoomRecording, 'id' | 'created_at' | 'updated_at'>;
export type ZoomSyncLogInsert = Omit<ZoomSyncLog, 'id' | 'created_at' | 'updated_at'>;
export type ZoomTokenRefreshLogInsert = Omit<ZoomTokenRefreshLog, 'id' | 'created_at'>;

// ============================================================================
// UPDATE TYPES (for updating existing records)
// ============================================================================

export type ZoomConnectionUpdate = Partial<Omit<ZoomConnection, 'id' | 'user_id' | 'created_at'>>;
export type ZoomWebinarUpdate = Partial<Omit<ZoomWebinar, 'id' | 'connection_id' | 'webinar_id' | 'created_at'>>;
export type ZoomRegistrantUpdate = Partial<Omit<ZoomRegistrant, 'id' | 'webinar_id' | 'registrant_id' | 'created_at'>>;
export type ZoomParticipantUpdate = Partial<Omit<ZoomParticipant, 'id' | 'webinar_id' | 'participant_id' | 'created_at'>>;
export type ZoomPollUpdate = Partial<Omit<ZoomPoll, 'id' | 'webinar_id' | 'poll_id' | 'created_at'>>;
export type ZoomQnaUpdate = Partial<Omit<ZoomQna, 'id' | 'webinar_id' | 'question_id' | 'created_at'>>;
export type ZoomRecordingUpdate = Partial<Omit<ZoomRecording, 'id' | 'webinar_id' | 'recording_id' | 'created_at'>>;
export type ZoomSyncLogUpdate = Partial<Omit<ZoomSyncLog, 'id' | 'connection_id' | 'created_at'>>;

// ============================================================================
// ZOOM API RESPONSE TYPES
// ============================================================================

/** OAuth token exchange response from Zoom */
export interface ZoomTokenResponse {
  access_token: string;
  token_type: string;
  refresh_token: string;
  expires_in: number;
  scope: string;
}

/** User information from Zoom API */
export interface ZoomUserResponse {
  id: string;
  account_id: string;
  first_name: string;
  last_name: string;
  email: string;
  type: number;
  role_name: string;
  account_type: string;
  status: string;
  timezone: string;
}

/** Webinar data from Zoom API */
export interface ZoomWebinarResponse {
  id: string;
  uuid: string;
  host_id: string;
  host_email: string;
  topic: string;
  agenda: string;
  type: number;
  status: string;
  start_time: string;
  duration: number;
  timezone: string;
  join_url: string;
  registration_url?: string;
  settings: {
    approval_type: number;
    registration_type: number;
    alternative_hosts: string;
    [key: string]: any;
  };
  occurrences?: Array<{
    occurrence_id: string;
    start_time: string;
    duration: number;
    status: string;
  }>;
}

/** Participant data from Zoom API */
export interface ZoomParticipantResponse {
  id: string;
  user_id?: string;
  name: string;
  user_email?: string;
  join_time: string;
  leave_time?: string;
  duration?: number;
  attentiveness_score?: number;
  details: Array<{
    device: string;
    ip_address: string;
    location: string;
    network_type: string;
    version: string;
    [key: string]: any;
  }>;
}

/** Generic paginated response from Zoom API */
export interface ZoomPaginatedResponse<T> {
  page_count: number;
  page_number: number;
  page_size: number;
  total_records: number;
  next_page_token?: string;
  [key: string]: T[] | number | string | undefined;
}

// ============================================================================
// HELPER TYPES
// ============================================================================

/** Webinar with calculated engagement metrics */
export interface WebinarWithStats extends ZoomWebinar {
  registration_conversion_rate: number;
  attendance_rate: number;
  average_engagement_score: number;
  poll_participation_rate: number;
  qa_participation_rate: number;
  total_questions_asked: number;
  total_polls_answered: number;
}

/** Participant engagement summary */
export interface ParticipantEngagement {
  participant_id: string;
  participant_name: string;
  participant_email: string | null;
  total_duration: number;
  engagement_score: number;
  polls_answered: number;
  questions_asked: number;
  chat_messages: number;
  hand_raises: number;
  camera_usage_percent: number;
  webinars_attended: number;
}

/** Real-time sync progress information */
export interface SyncProgress {
  sync_id: string;
  connection_id: string;
  sync_type: SyncType;
  status: SyncStatus;
  progress_percent: number;
  current_operation: string;
  total_items: number;
  processed_items: number;
  failed_items: number;
  estimated_time_remaining?: number;
  started_at: string;
  last_updated: string;
}

/** Connection health and status summary */
export interface ConnectionHealth {
  connection_id: string;
  is_healthy: boolean;
  token_expires_in_hours: number;
  last_successful_sync: string | null;
  consecutive_failures: number;
  rate_limit_remaining: number;
  next_sync_scheduled: string | null;
  issues: string[];
}

/** Webinar analytics dashboard summary */
export interface WebinarAnalyticsSummary {
  total_webinars: number;
  total_registrants: number;
  total_attendees: number;
  average_attendance_rate: number;
  average_engagement_score: number;
  most_popular_webinar: {
    id: string;
    topic: string;
    attendees: number;
  } | null;
  recent_webinars: Array<{
    id: string;
    topic: string;
    start_time: string;
    attendees: number;
    engagement_score: number;
  }>;
  engagement_trends: Array<{
    date: string;
    average_duration: number;
    attendance_rate: number;
    poll_participation: number;
  }>;
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

/** Keys that represent timestamp fields */
export type TimestampKeys = 'created_at' | 'updated_at' | 'started_at' | 'completed_at' | 'synced_at' | 'last_sync_at' | 'next_sync_at' | 'token_expires_at' | 'expires_at';

/** All Zoom table names */
export type ZoomTableName = 
  | 'zoom_connections'
  | 'zoom_webinars'
  | 'zoom_registrants'
  | 'zoom_participants'
  | 'zoom_polls'
  | 'zoom_poll_responses'
  | 'zoom_qna'
  | 'zoom_recordings'
  | 'zoom_sync_logs'
  | 'zoom_token_refresh_log';

/** Union of all Zoom database row types */
export type ZoomTableRow = 
  | ZoomConnection
  | ZoomWebinar
  | ZoomRegistrant
  | ZoomParticipant
  | ZoomPoll
  | ZoomPollResponse
  | ZoomQna
  | ZoomRecording
  | ZoomSyncLog
  | ZoomTokenRefreshLog;
