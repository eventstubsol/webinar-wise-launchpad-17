
import { supabase } from '@/integrations/supabase/client';
import { ZoomConnection, ConnectionStatus } from '@/types/zoom';
import { TokenUtils, TokenStatus } from '../utils/tokenUtils';
import { RenderConnectionService } from '../RenderConnectionService';

export class ConnectionStatusOperations {
  static async setPrimaryConnection(connectionId: string, userId: string): Promise<boolean> {
    try {
      // First, unset all primary connections for the user
      await supabase
        .from('zoom_connections')
        .update({ is_primary: false })
        .eq('user_id', userId);

      // Then set the specified connection as primary
      const { error } = await supabase
        .from('zoom_connections')
        .update({ is_primary: true })
        .eq('id', connectionId)
        .eq('user_id', userId);

      return !error;
    } catch (error) {
      console.error('Error setting primary connection:', error);
      return false;
    }
  }

  static async updateConnectionStatus(connectionId: string, status: ConnectionStatus): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('zoom_connections')
        .update({ 
          connection_status: status,
          updated_at: new Date().toISOString()
        })
        .eq('id', connectionId);

      return !error;
    } catch (error) {
      console.error('Error updating connection status:', error);
      return false;
    }
  }

  static async checkConnectionStatus(connectionId: string): Promise<{
    status: ConnectionStatus;
    tokenStatus: TokenStatus;
    isHealthy: boolean;
  }> {
    try {
      // Use Render API for comprehensive health check
      const healthCheck = await RenderConnectionService.checkConnectionHealth(connectionId);
      
      // Update local database with current status
      const dbStatus = healthCheck.isHealthy ? 'active' : 'inactive';
      await this.updateConnectionStatus(connectionId, dbStatus as ConnectionStatus);

      return {
        status: dbStatus as ConnectionStatus,
        tokenStatus: healthCheck.status,
        isHealthy: healthCheck.isHealthy,
      };
    } catch (error) {
      console.error('Error checking connection status:', error);
      return {
        status: 'inactive',
        tokenStatus: TokenStatus.INVALID,
        isHealthy: false,
      };
    }
  }

  static async refreshToken(connectionId: string): Promise<{ success: boolean; connection?: ZoomConnection; error?: string }> {
    try {
      // Use Render API for token refresh
      const result = await RenderConnectionService.refreshToken(connectionId);
      
      if (result.success && result.connection) {
        // Update local database with new token information
        const { error } = await supabase
          .from('zoom_connections')
          .update({
            access_token: result.connection.access_token,
            refresh_token: result.connection.refresh_token,
            token_expires_at: result.newTokenExpiresAt || result.connection.token_expires_at,
            connection_status: 'active',
            updated_at: new Date().toISOString()
          })
          .eq('id', connectionId);

        if (error) {
          console.error('Error updating connection with new tokens:', error);
          return { success: false, error: 'Failed to update connection in database' };
        }

        return { success: true, connection: result.connection };
      }

      return { success: false, error: result.error || 'Token refresh failed' };
    } catch (error) {
      console.error('Token refresh error:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  static async refreshTokenSilently(connectionId: string): Promise<boolean> {
    try {
      const result = await RenderConnectionService.refreshTokenSilently(connectionId);
      return result;
    } catch (error) {
      console.error('Silent token refresh error:', error);
      return false;
    }
  }

  static async getPrimaryConnection(userId: string): Promise<ZoomConnection | null> {
    try {
      const { data: connection, error } = await supabase
        .from('zoom_connections')
        .select('*')
        .eq('user_id', userId)
        .eq('is_primary', true)
        .maybeSingle();

      if (error) {
        console.error('Error fetching primary connection:', error);
        return null;
      }

      if (connection) {
        // Perform health check via Render API
        const healthCheck = await RenderConnectionService.checkConnectionHealth(connection.id);
        
        // Update connection status based on health check
        if (!healthCheck.isHealthy) {
          await this.updateConnectionStatus(connection.id, 'inactive');
          connection.connection_status = 'inactive';
        }
      }

      return connection;
    } catch (error) {
      console.error('Error getting primary connection:', error);
      return null;
    }
  }

  // Auto-recovery for connections
  static async attemptConnectionRecovery(connectionId: string): Promise<{
    success: boolean;
    recoverySteps: string[];
    finalStatus: string;
  }> {
    return await RenderConnectionService.attemptConnectionRecovery(connectionId);
  }
}
