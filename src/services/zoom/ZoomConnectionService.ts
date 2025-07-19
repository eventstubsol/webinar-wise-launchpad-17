
import { ConnectionCrud } from './operations/connectionCrud';
import { ZoomConnectionStatusService } from './operations/connectionStatus';
import { TokenUtils } from './utils/tokenUtils';
import { ZoomConnection, ZoomConnectionInsert, ZoomConnectionUpdate, ConnectionStatus } from '@/types/zoom';
import { UnifiedZoomService } from './UnifiedZoomService';
import { supabase } from '@/integrations/supabase/client';

/**
 * Main service for managing Zoom connections - now with automatic token refresh
 */
export class ZoomConnectionService {
  // CRUD Operations
  static createConnection = ConnectionCrud.createConnection;
  static getConnection = ConnectionCrud.getConnection;
  static getUserConnections = ConnectionCrud.getUserConnections;
  static updateConnection = ConnectionCrud.updateConnection;
  static deleteConnection = ConnectionCrud.deleteConnection;

  // Connection Status Operations
  static setPrimaryConnection = ZoomConnectionStatusService.setPrimaryConnection;
  static updateConnectionStatus = ZoomConnectionStatusService.updateConnectionStatus;
  static checkConnectionStatus = ZoomConnectionStatusService.checkConnectionStatus;
  static getPrimaryConnection = ZoomConnectionStatusService.getPrimaryConnection;

  // Token Utilities
  static isTokenExpired = TokenUtils.isTokenExpired;
  static getTokenStatus = TokenUtils.getTokenStatus;
  static isValidToken = TokenUtils.isValidToken;

  /**
   * Enhanced token refresh with proper Edge Function call
   */
  static async refreshToken(connectionId: string) {
    try {
      console.log(`🔄 Refreshing token for connection: ${connectionId}`);
      
      const { data, error } = await supabase.functions.invoke('zoom-refresh-token', {
        body: { connectionId }
      });

      if (error) {
        console.error('❌ Token refresh failed:', error);
        return { success: false, error: error.message };
      }

      console.log('✅ Token refresh completed successfully');
      return { success: true, connection: data.connection };
    } catch (error) {
      console.error('❌ Token refresh error:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Enhanced sync operations with automatic token refresh
   */
  static async startInitialSync(connectionId: string, options?: { batchSize?: number }) {
    try {
      // Check and refresh token before sync
      const refreshResult = await this.ensureValidToken(connectionId);
      if (!refreshResult.success) {
        return refreshResult;
      }

      const result = await UnifiedZoomService.startSync(connectionId, 'initial');
      if (!result.success) {
        throw new Error(result.error || 'Failed to start initial sync');
      }
      return { success: true, syncId: result.syncId };
    } catch (error) {
      console.error('Error starting initial sync:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  static async startIncrementalSync(connectionId: string) {
    try {
      // Check and refresh token before sync
      const refreshResult = await this.ensureValidToken(connectionId);
      if (!refreshResult.success) {
        return refreshResult;
      }

      const result = await UnifiedZoomService.startSync(connectionId, 'incremental');
      if (!result.success) {
        throw new Error(result.error || 'Failed to start incremental sync');
      }
      return { success: true, syncId: result.syncId };
    } catch (error) {
      console.error('Error starting incremental sync:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  static async syncSingleWebinar(webinarId: string, connectionId: string) {
    try {
      // Check and refresh token before sync
      const refreshResult = await this.ensureValidToken(connectionId);
      if (!refreshResult.success) {
        return refreshResult;
      }

      const result = await UnifiedZoomService.startSync(connectionId, 'manual', webinarId);
      if (!result.success) {
        throw new Error(result.error || 'Failed to sync webinar');
      }
      return { success: true, syncId: result.syncId };
    } catch (error) {
      console.error('Error syncing single webinar:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Ensure token is valid before operations, refresh if needed
   */
  private static async ensureValidToken(connectionId: string) {
    try {
      const connection = await this.getConnection(connectionId);
      if (!connection) {
        return { success: false, error: 'Connection not found' };
      }

      const tokenStatus = TokenUtils.getTokenStatus(connection);
      console.log(`🔍 Token status for connection ${connectionId}: ${tokenStatus}`);

      if (TokenUtils.needsTokenRefresh(connection)) {
        console.log('🔄 Token needs refresh, attempting refresh...');
        const refreshResult = await this.refreshToken(connectionId);
        if (!refreshResult.success) {
          console.error('❌ Token refresh failed:', refreshResult.error);
          return { 
            success: false, 
            error: `Token refresh failed: ${refreshResult.error}. Please reconnect your Zoom account.`,
            requiresReconnection: true
          };
        }
        console.log('✅ Token refreshed successfully');
      }

      return { success: true };
    } catch (error) {
      console.error('❌ Error ensuring valid token:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  static async cancelSync(syncId: string) {
    try {
      const result = await UnifiedZoomService.cancelSync(syncId);
      return result;
    } catch (error) {
      console.error('Error canceling sync:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  static async getSyncProgress(syncId: string) {
    try {
      const result = await UnifiedZoomService.getSyncProgress(syncId);
      return result;
    } catch (error) {
      console.error('Error getting sync progress:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  // Test connection with token refresh
  static async testConnection(connectionId: string) {
    try {
      // Ensure valid token first
      const refreshResult = await this.ensureValidToken(connectionId);
      if (!refreshResult.success) {
        return refreshResult;
      }

      const result = await UnifiedZoomService.testConnection(connectionId);
      return result;
    } catch (error) {
      console.error('Error testing connection:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }
}
