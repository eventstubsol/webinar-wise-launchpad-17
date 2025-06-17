
export enum ConnectionStatus {
  CONNECTED = 'connected',
  DISCONNECTED = 'disconnected',
  EXPIRED = 'expired',
  ERROR = 'error',
  PENDING = 'pending',
  ACTIVE = 'active',
  REVOKED = 'revoked',
}

export enum SyncStatus {
  IDLE = 'idle',
  STARTED = 'started',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
  PARTIAL = 'partial',
}

export enum SyncType {
  INITIAL = 'initial',
  INCREMENTAL = 'incremental', 
  MANUAL = 'manual',
  REGISTRANTS_ONLY = 'registrants_only',
  WEBHOOK = 'webhook'
}

export enum ResourceType {
  WEBINAR = 'webinar',
  MEETING = 'meeting',
  RECORDING = 'recording',
}

export enum ExportType {
  WEBINARS = 'webinars',
  REGISTRANTS = 'registrants',
  ATTENDEES = 'attendees',
  POLLS = 'polls',
  QANDA = 'qanda',
}

export enum RefreshType {
  AUTOMATIC = 'automatic',
  MANUAL = 'manual',
  FORCED = 'forced',
}

export enum RefreshStatus {
  SUCCESS = 'success',
  FAILED = 'failed',
  PENDING = 'pending',
}

export enum QnaStatus {
  PENDING = 'pending',
  ANSWERED = 'answered',
  DISMISSED = 'dismissed',
}

export enum WebinarStatus {
  SCHEDULED = 'scheduled',
  STARTED = 'started',
  ENDED = 'ended',
  CANCELLED = 'cancelled',
}

export enum RegistrantStatus {
  APPROVED = 'approved',
  PENDING = 'pending',
  DENIED = 'denied',
}

export enum RecordingType {
  VIDEO = 'video',
  AUDIO = 'audio',
  CHAT = 'chat',
  TRANSCRIPT = 'transcript',
}

export enum RecordingStatus {
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
}
