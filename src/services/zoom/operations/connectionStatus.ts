
import { supabase } from '@/integrations/supabase/client';

export enum ConnectionStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  ERROR = 'error',
  EXPIRED = 'expired'
}

export interface ConnectionHealth {
  status: ConnectionStatus;
  lastSync: string | null;
  tokenExpiry: string;
  isTokenValid: boolean;
  errorMessage?: string;
  apiCallsRemaining?: number;
}

export class ZoomConnectionStatusService {
  static async checkConnectionHealth(connectionId: string): Promise<ConnectionHealth> {
    try {
      const { data: connection, error } = await supabase
        .from('zoom_connections')
        .select('*')
        .eq('id', connectionId)
        .maybeSingle();

      if (error || !connection) {
        return {
          status: ConnectionStatus.ERROR,
          lastSync: null,
          tokenExpiry: '',
          isTokenValid: false,
          errorMessage: 'Connection not found'
        };
      }

      const tokenExpiry = new Date(connection.token_expires_at);
      const now = new Date();
      const isTokenValid = tokenExpiry.getTime() > now.getTime();

      let status = ConnectionStatus.ACTIVE;
      if (!isTokenValid) {
        status = ConnectionStatus.EXPIRED;
      } else if (connection.connection_status === 'inactive') {
        status = ConnectionStatus.INACTIVE;
      }

      return {
        status,
        lastSync: connection.last_sync_at,
        tokenExpiry: connection.token_expires_at,
        isTokenValid,
        errorMessage: status === ConnectionStatus.EXPIRED ? 'Token has expired' : undefined
      };
    } catch (error) {
      console.error('Error checking connection health:', error);
      return {
        status: ConnectionStatus.ERROR,
        lastSync: null,
        tokenExpiry: '',
        isTokenValid: false,
        errorMessage: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  static async updateConnectionStatus(
    connectionId: string, 
    status: ConnectionStatus,
    errorMessage?: string
  ): Promise<void> {
    try {
      const updateData: any = {
        connection_status: status,
        updated_at: new Date().toISOString()
      };

      if (status === ConnectionStatus.ACTIVE) {
        updateData.last_sync_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('zoom_connections')
        .update(updateData)
        .eq('id', connectionId);

      if (error) {
        console.error('Error updating connection status:', error);
      }
    } catch (error) {
      console.error('Error updating connection status:', error);
    }
  }

  static async getAllConnectionsHealth(userId: string): Promise<ConnectionHealth[]> {
    try {
      const { data: connections, error } = await supabase
        .from('zoom_connections')
        .select('*')
        .eq('user_id', userId);

      if (error) throw error;

      const healthChecks = await Promise.all(
        (connections || []).map(conn => this.checkConnectionHealth(conn.id))
      );

      return healthChecks;
    } catch (error) {
      console.error('Error checking all connections:', error);
      return [];
    }
  }

  // Missing methods that ZoomConnectionService expects
  static async setPrimaryConnection(connectionId: string): Promise<boolean> {
    try {
      // First, get the connection to get the user_id
      const { data: connection, error: getError } = await supabase
        .from('zoom_connections')
        .select('user_id')
        .eq('id', connectionId)
        .single();

      if (getError || !connection) {
        console.error('Error getting connection:', getError);
        return false;
      }

      // Set all other connections for this user to non-primary
      await supabase
        .from('zoom_connections')
        .update({ is_primary: false })
        .eq('user_id', connection.user_id);

      // Set this connection as primary
      const { error } = await supabase
        .from('zoom_connections')
        .update({ is_primary: true })
        .eq('id', connectionId);

      return !error;
    } catch (error) {
      console.error('Error setting primary connection:', error);
      return false;
    }
  }

  static async checkConnectionStatus(connectionId: string): Promise<ConnectionStatus> {
    const health = await this.checkConnectionHealth(connectionId);
    return health.status;
  }

  static async refreshToken(connectionId: string): Promise<{ success: boolean; error?: string }> {
    try {
      // Call the refresh token edge function
      const { data, error } = await supabase.functions.invoke('zoom-token-refresh', {
        body: { connectionId }
      });

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      console.error('Token refresh failed:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  static async getPrimaryConnection(userId: string): Promise<any | null> {
    try {
      const { data: connection, error } = await supabase
        .from('zoom_connections')
        .select('*')
        .eq('user_id', userId)
        .eq('is_primary', true)
        .maybeSingle();

      if (error) {
        console.error('Error getting primary connection:', error);
        return null;
      }

      if (connection) {
        return connection;
      }

      // No primary connection found, try to get any connection
      const { data: anyConnection, error: anyError } = await supabase
        .from('zoom_connections')
        .select('*')
        .eq('user_id', userId)
        .limit(1)
        .maybeSingle();

      if (anyError) {
        console.error('Error getting any connection:', anyError);
        return null;
      }

      return anyConnection;
    } catch (error) {
      console.error('Error getting primary connection:', error);
      return null;
    }
  }
}

// Export for backward compatibility
export const ConnectionStatusOperations = ZoomConnectionStatusService;
