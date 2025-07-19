
/**
 * Utility types and constants
 */

import type {
  ZoomConnection,
  ZoomWebinar,
  ZoomRegistrant,
  ZoomParticipant,
  ZoomPoll,
  ZoomPollResponse,
  ZoomQna,
  ZoomRecording,
  ZoomSyncLog,
  ZoomTokenRefreshLog
} from './databaseTypes';

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
