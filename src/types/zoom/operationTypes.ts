
/**
 * INSERT and UPDATE types for database operations
 */

import {
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

// INSERT TYPES (for creating new records)
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

// UPDATE TYPES (for updating existing records)
export type ZoomConnectionUpdate = Partial<Omit<ZoomConnection, 'id' | 'user_id' | 'created_at'>>;
export type ZoomWebinarUpdate = Partial<Omit<ZoomWebinar, 'id' | 'connection_id' | 'webinar_id' | 'created_at'>>;
export type ZoomRegistrantUpdate = Partial<Omit<ZoomRegistrant, 'id' | 'webinar_id' | 'registrant_id' | 'created_at'>>;
export type ZoomParticipantUpdate = Partial<Omit<ZoomParticipant, 'id' | 'webinar_id' | 'participant_id' | 'created_at'>>;
export type ZoomPollUpdate = Partial<Omit<ZoomPoll, 'id' | 'webinar_id' | 'poll_id' | 'created_at'>>;
export type ZoomQnaUpdate = Partial<Omit<ZoomQna, 'id' | 'webinar_id' | 'question_id' | 'created_at'>>;
export type ZoomRecordingUpdate = Partial<Omit<ZoomRecording, 'id' | 'webinar_id' | 'recording_id' | 'created_at'>>;
export type ZoomSyncLogUpdate = Partial<Omit<ZoomSyncLog, 'id' | 'connection_id' | 'created_at'>>;
