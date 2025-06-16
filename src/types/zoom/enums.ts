
/**
 * Zoom integration enums
 */

/** Zoom connection status values */
export enum ConnectionStatus {
  ACTIVE = 'active',
  EXPIRED = 'expired',
  REVOKED = 'revoked',
  ERROR = 'error'
}

/** Webinar status values - updated to match Zoom API responses */
export enum WebinarStatus {
  AVAILABLE = 'available',     // Scheduled/waiting to start
  UNAVAILABLE = 'unavailable', // Not accessible
  STARTED = 'started',         // Currently live
  ENDED = 'ended',            // Completed
  ABORTED = 'aborted',        // Cancelled/aborted
  DELETED = 'deleted'         // Deleted from Zoom
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
