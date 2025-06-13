
/**
 * Database types for Zoom connections and authentication
 */

import { ConnectionStatus, RefreshType, RefreshStatus } from './enums';
import { SyncErrorDetails } from './jsonTypes';

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
