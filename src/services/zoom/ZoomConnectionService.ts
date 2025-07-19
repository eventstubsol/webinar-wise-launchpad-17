
import { ConnectionCrud } from './operations/connectionCrud';
import { ZoomConnectionStatusService } from './operations/connectionStatus';
import { TokenUtils } from './utils/tokenUtils';
import { ZoomConnection, ZoomConnectionInsert, ZoomConnectionUpdate, ConnectionStatus } from '@/types/zoom';
import { UnifiedZoomService } from './UnifiedZoomService';

/**
 * Main service for managing Zoom connections - now using unified Supabase Edge Functions
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
  static refreshToken = ZoomConnectionStatusService.refreshToken;
  static getPrimaryConnection = ZoomConnectionStatusService.getPrimaryConnection;

  // Token Utilities
  static isTokenExpired = TokenUtils.isTokenExpired;
  static getTokenStatus = TokenUtils.getTokenStatus;
  static isValidToken = TokenUtils.isValidToken;

  // Unified Sync Operations
  static async startInitialSync(connectionId: string, options?: { batchSize?: number }) {
    try {
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

  // Test connection
  static async testConnection(connectionId: string) {
    try {
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
