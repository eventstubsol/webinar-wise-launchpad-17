import { ConnectionCrud } from './operations/connectionCrud';
import { ConnectionStatusOperations } from './operations/connectionStatus';
import { TokenUtils } from './utils/tokenUtils';
import { TokenMigrationService } from './security/TokenMigrationService';
import { zoomSyncOrchestrator } from './sync/ZoomSyncOrchestrator';
import { ZoomConnection, ZoomConnectionInsert, ZoomConnectionUpdate, ConnectionStatus } from '@/types/zoom';

/**
 * Main service for managing Zoom connections
 * This service acts as a facade for all Zoom connection operations
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

  // Enhanced getPrimaryConnection with migration check
  static async getPrimaryConnection(userId: string): Promise<ZoomConnection | null> {
    // Check and perform migration if needed
    await TokenMigrationService.autoMigrateIfNeeded(userId);
    
    return await ConnectionStatusOperations.getPrimaryConnection(userId);
  }

  // Token Utilities
  static isTokenExpired = TokenUtils.isTokenExpired;
  static encryptToken = TokenUtils.encryptToken;
  static decryptToken = TokenUtils.decryptToken;
  static validateTokenDecryption = TokenUtils.validateTokenDecryption;

  // Migration utilities
  static checkMigrationNeeded = TokenMigrationService.checkMigrationNeeded;
  static migrateUserTokens = TokenMigrationService.migrateUserTokens;

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
}
