
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
        .single();

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
}
