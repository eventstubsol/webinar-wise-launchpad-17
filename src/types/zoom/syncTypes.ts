
/**
 * Database types for sync operations and logging
 */

import { SyncType, SyncStatus } from './enums';
import { SyncErrorDetails } from './jsonTypes';

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
  // New fields for sequential sync tracking
  current_webinar_id: string | null;
  sync_stage: string | null;
  stage_progress_percentage: number | null;
  // New fields for retry mechanism
  retry_attempts: number;
  retry_schedule: RetryScheduleEntry[];
  max_participant_retries: number;
}

/** Retry schedule entry for participant fetching - compatible with Supabase Json type */
export interface RetryScheduleEntry {
  webinarId: string;
  dbId: string;
  topic: string;
  retryAttempt: number;
  scheduledFor: string;
  errorType: string;
  originalError: string;
  [key: string]: any; // Index signature for Json compatibility
}

/** Retryable webinar for participant fetching */
export interface RetryableWebinar {
  webinarId: string;
  dbId: string;
  topic: string;
  errorMessage: string;
  errorType: 'rate_limit' | 'network' | 'api_error' | 'timeout';
  retryAttempt: number;
  nextRetryAt: string;
}
