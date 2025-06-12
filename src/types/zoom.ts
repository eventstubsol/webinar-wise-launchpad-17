
export interface ZoomConnection {
  id: string;
  user_id: string;
  zoom_user_id: string;
  zoom_email: string;
  zoom_account_id: string;
  zoom_account_type?: string; // Changed from union type to string
  access_token: string;
  refresh_token: string;
  token_expires_at: string;
  scopes?: string[];
  connection_status: string; // Changed from union type to string
  is_primary: boolean;
  auto_sync_enabled: boolean;
  sync_frequency_hours: number;
  last_sync_at?: string;
  next_sync_at?: string;
  created_at: string;
  updated_at: string;
}

export interface ZoomWebinar {
  id: string;
  connection_id: string;
  webinar_id: string;
  webinar_uuid: string;
  occurrence_id?: string;
  topic: string;
  type: number;
  start_time?: string;
  duration?: number;
  timezone?: string;
  agenda?: string;
  host_id: string;
  host_email?: string;
  alternative_hosts?: string[];
  status?: string; // Changed from union type to string
  registration_required: boolean;
  registration_type?: number;
  approval_type?: number;
  max_registrants?: number;
  max_attendees?: number;
  join_url?: string;
  registration_url?: string;
  total_registrants: number;
  total_attendees: number;
  total_minutes: number;
  avg_attendance_duration: number;
  created_at: string;
  updated_at: string;
  synced_at: string;
}

export interface WebinarAnalyticsSummary {
  id: string;
  topic: string;
  start_time?: string;
  duration?: number;
  total_registrants: number;
  total_attendees: number;
  attendance_rate: number;
  avg_attendance_duration: number;
  unique_participants: number;
  total_polls: number;
  total_questions: number;
  total_recordings: number;
  user_id: string;
}

export interface ZoomSyncLog {
  id: string;
  connection_id: string;
  sync_type: string; // Changed from union type to string
  sync_status: string; // Changed from union type to string
  resource_type?: string; // Changed from union type to string
  resource_id?: string;
  total_items?: number;
  processed_items: number;
  failed_items: number;
  started_at: string;
  completed_at?: string;
  duration_seconds?: number;
  error_message?: string;
  error_details?: any;
  api_calls_made: number;
  rate_limit_hits: number;
  created_at: string;
  updated_at: string;
}

// Input types for creating/updating
export interface CreateZoomConnectionInput {
  user_id: string;
  zoom_user_id: string;
  zoom_email: string;
  zoom_account_id: string;
  zoom_account_type?: string;
  access_token: string;
  refresh_token: string;
  token_expires_at: string;
  scopes?: string[];
  connection_status?: string;
  is_primary?: boolean;
  auto_sync_enabled?: boolean;
  sync_frequency_hours?: number;
}

export interface CreateZoomSyncLogInput {
  connection_id: string;
  sync_type: string;
  sync_status: string;
  resource_type?: string;
  resource_id?: string;
  total_items?: number;
  processed_items?: number;
  failed_items?: number;
  started_at?: string;
  error_message?: string;
  error_details?: any;
  api_calls_made?: number;
  rate_limit_hits?: number;
}
