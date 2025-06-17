export enum ConnectionStatus {
  CONNECTED = 'connected',
  DISCONNECTED = 'disconnected',
  EXPIRED = 'expired',
  ERROR = 'error',
  PENDING = 'pending',
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
  REGISTRANTS_ONLY = 'registrants_only'
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
