
import { ConnectionCrud } from './operations/connectionCrud';
import { ConnectionStatusOperations } from './operations/connectionStatus';
import { TokenUtils } from './utils/tokenUtils';
import { zoomSyncOrchestrator } from './sync/ZoomSyncOrchestrator';
import { ZoomConnection, ZoomConnectionInsert, ZoomConnectionUpdate, ConnectionStatus } from '@/types/zoom';
import { supabase } from '@/integrations/supabase/client';

/**
 * Main service for managing Zoom connections - simplified for plain text tokens
 */
export class ZoomConnectionService {
  // CRUD Operations
  static createConnection = ConnectionCrud.createConnection;
  static getConnection = ConnectionCrud.getConnection;
  static getUserConnections = ConnectionCrud.getUserConnections;
  static updateConnection = ConnectionCrud.updateConnection;
  static deleteConnection = ConnectionCrud.deleteConnection;

  // Connection Status Operations
  static setPrimaryConnection = ConnectionStatusOperations.setPrimaryConnection;
  static updateConnectionStatus = ConnectionStatusOperations.updateConnectionStatus;
  static checkConnectionStatus = ConnectionStatusOperations.checkConnectionStatus;
  static refreshToken = ConnectionStatusOperations.refreshToken;
  static getPrimaryConnection = ConnectionStatusOperations.getPrimaryConnection;

  // Token Utilities (simplified)
  static isTokenExpired = TokenUtils.isTokenExpired;
  static getTokenStatus = TokenUtils.getTokenStatus;
  static isValidToken = TokenUtils.isValidToken;

  // Sync Operations
  static async startInitialSync(connectionId: string, options?: { batchSize?: number }) {
    return await zoomSyncOrchestrator.startInitialSync(connectionId, options);
  }

  static async startIncrementalSync(connectionId: string) {
    return await zoomSyncOrchestrator.startIncrementalSync(connectionId);
  }

  static async syncSingleWebinar(webinarId: string, connectionId: string) {
    return await zoomSyncOrchestrator.syncSingleWebinar(webinarId, connectionId);
  }

  static async scheduleAutomaticSync(connectionId: string) {
    return await zoomSyncOrchestrator.scheduleAutomaticSync(connectionId);
  }

  static async cancelSync(operationId: string) {
    return await zoomSyncOrchestrator.cancelSync(operationId);
  }

  static async getSyncStatus() {
    return await zoomSyncOrchestrator.getSyncStatus();
  }

  // Clear all connections (for migration)
  static async clearAllConnections(userId: string): Promise<boolean> {
    try {
      const { data, error } = await supabase.functions.invoke('clear-zoom-connections');

      if (error) {
        console.error('Failed to clear connections:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error clearing connections:', error);
      return false;
    }
  }
}
