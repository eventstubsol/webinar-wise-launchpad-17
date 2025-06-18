
export interface WebinarSyncCandidate {
  id: string;
  webinar_id: string;
  topic: string;
  status: string;
  participant_sync_status: string;
  participant_sync_error?: string;
  start_time?: string;
}

export interface SyncStrategy {
  syncType: 'participants_only' | 'incremental' | 'full_sync';
  webinarIds?: string[];
  description: string;
  webinars: WebinarSyncCandidate[];
}
