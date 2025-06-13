
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
}
