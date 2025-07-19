// Mock CRM Connection Manager for now
// This provides the interface needed by CRM components

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

export class CRMConnectionManager {
  static async getConnections(userId?: string): Promise<CRMConnection[]> {
    // Mock implementation - return empty array for now
    return [];
  }

  static async createConnection(connectionData: any): Promise<{ success: boolean; data?: CRMConnection; error?: string }> {
    // Mock implementation
    return { success: false, error: 'CRM integrations not yet implemented' };
  }

  static async updateConnection(connectionId: string, updateData: any): Promise<{ success: boolean; error?: string }> {
    // Mock implementation
    return { success: false, error: 'CRM integrations not yet implemented' };
  }

  static async deleteConnection(connectionId: string): Promise<{ success: boolean; error?: string }> {
    // Mock implementation
    return { success: false, error: 'CRM integrations not yet implemented' };
  }

  static async validateConnection(connectionId: string): Promise<{ success: boolean; error?: string }> {
    // Mock implementation
    return { success: false, error: 'CRM integrations not yet implemented' };
  }

  static async getFieldMappings(connectionId: string): Promise<CRMFieldMapping[]> {
    // Mock implementation
    return [];
  }

  static async getAvailableFields(connectionId: string): Promise<any[]> {
    // Mock implementation
    return [];
  }

  static async saveFieldMapping(mapping: Partial<CRMFieldMapping>): Promise<{ success: boolean; error?: string }> {
    // Mock implementation
    return { success: false, error: 'CRM integrations not yet implemented' };
  }

  static async createFieldMapping(mapping: Partial<CRMFieldMapping>): Promise<{ success: boolean; error?: string }> {
    // Mock implementation
    return { success: false, error: 'CRM integrations not yet implemented' };
  }

  static async createAdapter(connectionId: string): Promise<any> {
    // Mock implementation
    return null;
  }

  static async updateFieldMapping(mappingId: string, mapping: Partial<CRMFieldMapping>): Promise<{ success: boolean; error?: string }> {
    // Mock implementation
    return { success: false, error: 'CRM integrations not yet implemented' };
  }

  static async deleteFieldMapping(mappingId: string): Promise<{ success: boolean; error?: string }> {
    // Mock implementation
    return { success: false, error: 'CRM integrations not yet implemented' };
  }

  static async getSyncLogs(connectionId: string): Promise<CRMSyncLog[]> {
    // Mock implementation
    return [];
  }
}