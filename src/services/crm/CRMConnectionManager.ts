
import { supabase } from '@/integrations/supabase/client';
import { CRMConnection, CRMFieldMapping, CRMSyncLog } from '@/types/crm';
import { CRMAdapter, CRMConfig } from './CRMAdapter';
import { SalesforceAdapter } from './adapters/SalesforceAdapter';
import { HubSpotAdapter } from './adapters/HubSpotAdapter';
import { PipedriveAdapter } from './adapters/PipedriveAdapter';
import { CustomAPIAdapter } from './adapters/CustomAPIAdapter';

export class CRMConnectionManager {
  static async getConnections(userId: string): Promise<CRMConnection[]> {
    const { data, error } = await supabase
      .from('crm_connections')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch CRM connections: ${error.message}`);
    }

    return data || [];
  }

  static async getConnection(connectionId: string): Promise<CRMConnection | null> {
    const { data, error } = await supabase
      .from('crm_connections')
      .select('*')
      .eq('id', connectionId)
      .single();

    if (error) {
      return null;
    }

    return data;
  }

  static async createConnection(connection: Omit<CRMConnection, 'id' | 'created_at' | 'updated_at'>): Promise<CRMConnection> {
    const { data, error } = await supabase
      .from('crm_connections')
      .insert(connection)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create CRM connection: ${error.message}`);
    }

    return data;
  }

  static async updateConnection(connectionId: string, updates: Partial<CRMConnection>): Promise<CRMConnection> {
    const { data, error } = await supabase
      .from('crm_connections')
      .update(updates)
      .eq('id', connectionId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update CRM connection: ${error.message}`);
    }

    return data;
  }

  static async deleteConnection(connectionId: string): Promise<void> {
    const { error } = await supabase
      .from('crm_connections')
      .delete()
      .eq('id', connectionId);

    if (error) {
      throw new Error(`Failed to delete CRM connection: ${error.message}`);
    }
  }

  static async getFieldMappings(connectionId: string): Promise<CRMFieldMapping[]> {
    const { data, error } = await supabase
      .from('crm_field_mappings')
      .select('*')
      .eq('connection_id', connectionId);

    if (error) {
      throw new Error(`Failed to fetch field mappings: ${error.message}`);
    }

    return data || [];
  }

  static async createFieldMapping(mapping: Omit<CRMFieldMapping, 'id' | 'created_at' | 'updated_at'>): Promise<CRMFieldMapping> {
    const { data, error } = await supabase
      .from('crm_field_mappings')
      .insert(mapping)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create field mapping: ${error.message}`);
    }

    return data;
  }

  static async updateFieldMapping(mappingId: string, updates: Partial<CRMFieldMapping>): Promise<CRMFieldMapping> {
    const { data, error } = await supabase
      .from('crm_field_mappings')
      .update(updates)
      .eq('id', mappingId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update field mapping: ${error.message}`);
    }

    return data;
  }

  static async deleteFieldMapping(mappingId: string): Promise<void> {
    const { error } = await supabase
      .from('crm_field_mappings')
      .delete()
      .eq('id', mappingId);

    if (error) {
      throw new Error(`Failed to delete field mapping: ${error.message}`);
    }
  }

  static async getSyncLogs(connectionId: string, limit = 50): Promise<CRMSyncLog[]> {
    const { data, error } = await supabase
      .from('crm_sync_logs')
      .select('*')
      .eq('connection_id', connectionId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      throw new Error(`Failed to fetch sync logs: ${error.message}`);
    }

    return data || [];
  }

  static createAdapter(connection: CRMConnection): CRMAdapter {
    const config: CRMConfig = {
      apiUrl: connection.config.apiUrl,
      apiKey: connection.api_key,
      accessToken: connection.access_token,
      refreshToken: connection.refresh_token,
      instanceUrl: connection.instance_url,
      clientId: connection.config.clientId,
      clientSecret: connection.config.clientSecret
    };

    switch (connection.crm_type) {
      case 'salesforce':
        return new SalesforceAdapter(config, connection.id);
      case 'hubspot':
        return new HubSpotAdapter(config, connection.id);
      case 'pipedrive':
        return new PipedriveAdapter(config, connection.id);
      case 'custom':
        return new CustomAPIAdapter(config, connection.id);
      default:
        throw new Error(`Unsupported CRM type: ${connection.crm_type}`);
    }
  }

  static async validateConnection(connectionId: string): Promise<boolean> {
    try {
      const connection = await this.getConnection(connectionId);
      if (!connection) {
        return false;
      }

      const adapter = this.createAdapter(connection);
      const isValid = await adapter.validateConnection();

      // Update connection status
      await this.updateConnection(connectionId, {
        status: isValid ? 'active' : 'error',
        error_count: isValid ? 0 : connection.error_count + 1,
        error_message: isValid ? undefined : 'Connection validation failed'
      });

      return isValid;
    } catch (error) {
      console.error('Error validating CRM connection:', error);
      return false;
    }
  }

  static async refreshTokens(connectionId: string): Promise<void> {
    try {
      const connection = await this.getConnection(connectionId);
      if (!connection) {
        throw new Error('Connection not found');
      }

      const adapter = this.createAdapter(connection);
      const result = await adapter.refreshAccessToken();

      await this.updateConnection(connectionId, {
        access_token: result.accessToken,
        refresh_token: result.refreshToken,
        token_expires_at: result.expiresAt.toISOString(),
        status: 'active',
        error_count: 0,
        error_message: undefined
      });
    } catch (error) {
      console.error('Error refreshing CRM tokens:', error);
      throw error;
    }
  }
}
