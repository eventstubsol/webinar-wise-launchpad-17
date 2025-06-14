
export interface CRMConnection {
  id: string;
  user_id: string;
  crm_type: 'salesforce' | 'hubspot' | 'pipedrive' | 'custom';
  connection_name: string;
  access_token?: string;
  refresh_token?: string;
  token_expires_at?: string;
  api_key?: string;
  instance_url?: string;
  config: Record<string, any>;
  is_active: boolean;
  is_primary: boolean;
  sync_enabled: boolean;
  sync_direction: 'incoming' | 'outgoing' | 'bidirectional';
  sync_frequency_hours: number;
  last_sync_at?: string;
  next_sync_at?: string;
  status: 'active' | 'error' | 'expired' | 'disconnected';
  error_message?: string;
  error_count: number;
  created_at: string;
  updated_at: string;
}

export interface CRMFieldMapping {
  id: string;
  connection_id: string;
  webinar_field: string;
  crm_field: string;
  crm_object_type: string;
  sync_direction: 'incoming' | 'outgoing' | 'bidirectional';
  is_required: boolean;
  default_value?: string;
  transformation_rules: Record<string, any>;
  conflict_resolution: 'last_write_wins' | 'manual_review' | 'crm_wins' | 'webinar_wins';
  created_at: string;
  updated_at: string;
}

export interface CRMSyncLog {
  id: string;
  connection_id: string;
  sync_type: 'full_sync' | 'incremental_sync' | 'real_time_update';
  operation_type: 'create' | 'update' | 'delete';
  direction: 'incoming' | 'outgoing';
  webinar_id?: string;
  participant_id?: string;
  crm_object_type?: string;
  crm_object_id?: string;
  status: 'pending' | 'success' | 'failed' | 'conflict';
  records_processed: number;
  records_success: number;
  records_failed: number;
  records_conflicts: number;
  error_message?: string;
  conflict_details?: Record<string, any>;
  resolution_action?: string;
  data_before?: Record<string, any>;
  data_after?: Record<string, any>;
  field_changes?: Record<string, any>;
  started_at: string;
  completed_at?: string;
  duration_ms?: number;
  created_at: string;
}

export interface CRMWebhook {
  id: string;
  connection_id: string;
  webhook_url: string;
  webhook_secret?: string;
  event_types: string[];
  is_active: boolean;
  last_ping_at?: string;
  status: 'active' | 'failed' | 'disabled';
  signature_header?: string;
  verification_method: string;
  created_at: string;
  updated_at: string;
}

export interface CRMSyncConflict {
  id: string;
  sync_log_id: string;
  connection_id: string;
  conflict_type: 'field_mismatch' | 'duplicate_record' | 'missing_reference';
  field_name?: string;
  webinar_value?: Record<string, any>;
  crm_value?: Record<string, any>;
  status: 'pending' | 'resolved' | 'ignored';
  resolution_method?: 'manual' | 'auto';
  resolved_value?: Record<string, any>;
  resolved_by?: string;
  resolved_at?: string;
  created_at: string;
}

export interface CRMContact {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  company?: string;
  jobTitle?: string;
  phone?: string;
  customFields?: Record<string, any>;
}

export interface CRMSyncResult {
  success: boolean;
  recordsProcessed: number;
  recordsSuccess: number;
  recordsFailed: number;
  recordsConflicts: number;
  errors: string[];
  conflicts: CRMSyncConflict[];
}
