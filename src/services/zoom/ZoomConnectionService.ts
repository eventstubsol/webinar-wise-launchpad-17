
import { supabase } from '@/integrations/supabase/client';
import { ZoomConnection } from '@/types/zoom';

export class ZoomConnectionService {
  static async validateCredentials(): Promise<{ success: boolean; connection?: ZoomConnection; error?: string }> {
    try {
      const { data, error } = await supabase.functions.invoke('zoom-api-gateway', {
        body: { action: 'validate-credentials' },
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (error) {
        throw new Error(error.message);
      }

      return data;
    } catch (error) {
      console.error('Error validating credentials:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to validate credentials'
      };
    }
  }

  static async exchangeOAuthCode(code: string, state: string, redirectUri?: string): Promise<{ success: boolean; connection?: ZoomConnection; error?: string }> {
    try {
      const { data, error } = await supabase.functions.invoke('zoom-api-gateway', {
        body: { action: 'oauth-exchange', code, state, redirectUri },
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (error) {
        throw new Error(error.message);
      }

      return data;
    } catch (error) {
      console.error('Error exchanging OAuth code:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to exchange OAuth code'
      };
    }
  }

  static async testConnection(): Promise<{ success: boolean; userData?: any; connection?: any; error?: string }> {
    try {
      const { data, error } = await supabase.functions.invoke('zoom-api-gateway', {
        body: { action: 'test' },
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (error) {
        throw new Error(error.message);
      }

      return data;
    } catch (error) {
      console.error('Error testing connection:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to test connection'
      };
    }
  }

  static async startSync(connectionId: string, syncType: string, webinarId?: string): Promise<{ success: boolean; syncId?: string; error?: string }> {
    try {
      const { data, error } = await supabase.functions.invoke('zoom-api-gateway', {
        body: { action: 'sync', connectionId, syncType, webinarId },
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (error) {
        throw new Error(error.message);
      }

      return data;
    } catch (error) {
      console.error('Error starting sync:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to start sync'
      };
    }
  }

  static async getPrimaryConnection(userId: string): Promise<ZoomConnection | null> {
    try {
      const { data, error } = await supabase
        .from('zoom_connections')
        .select('*')
        .eq('user_id', userId)
        .eq('is_primary', true)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      return data ? {
        ...data,
        connection_status: data.connection_status as any
      } : null;
    } catch (error) {
      console.error('Error fetching primary connection:', error);
      return null;
    }
  }

  static async getUserConnections(userId: string): Promise<ZoomConnection[]> {
    try {
      const { data, error } = await supabase
        .from('zoom_connections')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      return data?.map(connection => ({
        ...connection,
        connection_status: connection.connection_status as any
      })) || [];
    } catch (error) {
      console.error('Error fetching user connections:', error);
      return [];
    }
  }

  static async updateConnection(connectionId: string, updates: Partial<ZoomConnection>): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('zoom_connections')
        .update(updates)
        .eq('id', connectionId);

      if (error) {
        throw new Error(`Failed to update connection: ${error.message}`);
      }

      return true;
    } catch (error) {
      console.error('Error updating connection:', error);
      return false;
    }
  }

  static async deleteConnection(connectionId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('zoom_connections')
        .delete()
        .eq('id', connectionId);

      if (error) {
        throw new Error(`Failed to delete connection: ${error.message}`);
      }

      return true;
    } catch (error) {
      console.error('Error deleting connection:', error);
      return false;
    }
  }

  // Legacy method aliases for backward compatibility
  static async startInitialSync(connectionId: string) {
    return this.startSync(connectionId, 'initial');
  }

  static async startIncrementalSync(connectionId: string) {
    return this.startSync(connectionId, 'incremental');
  }
}
