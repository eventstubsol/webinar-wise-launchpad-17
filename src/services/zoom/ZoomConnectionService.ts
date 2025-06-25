
import { ConnectionCrud } from './operations/connectionCrud';
import { ConnectionStatusOperations } from './operations/connectionStatus';
import { TokenUtils } from './utils/tokenUtils';
import { zoomSyncOrchestrator } from './sync/ZoomSyncOrchestrator';
import { ZoomConnection, ZoomConnectionInsert, ZoomConnectionUpdate, ConnectionStatus } from '@/types/zoom';
import { RenderZoomService } from './RenderZoomService';

/**
 * Main service for managing Zoom connections - now using Render API
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

  // Sync Operations - now using Render API
  static async startInitialSync(connectionId: string, options?: { batchSize?: number }) {
    try {
      const result = await RenderZoomService.startSync(connectionId, 'initial');
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
      const result = await RenderZoomService.startSync(connectionId, 'incremental');
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
      const result = await RenderZoomService.syncWebinars(connectionId, {
        webinarId,
        type: 'manual'
      });
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

  static async scheduleAutomaticSync(connectionId: string) {
    return await zoomSyncOrchestrator.scheduleAutomaticSync(connectionId);
  }

  static async cancelSync(syncId: string) {
    try {
      const result = await RenderZoomService.cancelSync(syncId);
      return result;
    } catch (error) {
      console.error('Error canceling sync:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  static async getSyncStatus() {
    return await zoomSyncOrchestrator.getSyncStatus();
  }

  // Clear all connections - now using Render API
  static async clearAllConnections(userId: string): Promise<boolean> {
    try {
      // Get user connections first
      const connections = await this.getUserConnections(userId);
      
      // Disconnect each connection via Render API
      for (const connection of connections) {
        await RenderZoomService.disconnectAccount(connection.id);
      }

      return true;
    } catch (error) {
      console.error('Error clearing connections:', error);
      return false;
    }
  }
}
