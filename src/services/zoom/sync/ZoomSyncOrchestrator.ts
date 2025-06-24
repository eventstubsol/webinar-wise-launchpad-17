
import { ZoomConnectionService } from '../ZoomConnectionService';
import { ZoomConnection, SyncType, SyncStatus } from '@/types/zoom';
import { SyncOperation, SyncPriority } from './types';
import { SyncQueueManager } from './SyncQueueManager';
import { SyncExecutor } from './SyncExecutor';
import { supabase } from '@/integrations/supabase/client';

/**
 * Comprehensive sync orchestration service for managing Zoom data synchronization
 */
export class ZoomSyncOrchestrator {
  private static instance: ZoomSyncOrchestrator;
  private queueManager: SyncQueueManager;
  private syncExecutor: SyncExecutor;
  private activeSyncs: Map<string, AbortController> = new Map();
  private readonly retryAttempts = 3;
  private isProcessing = false;

  private constructor() {
    this.queueManager = new SyncQueueManager();
    this.syncExecutor = new SyncExecutor();
    this.startQueueProcessor();
  }

  /**
   * Get singleton instance
   */
  static getInstance(): ZoomSyncOrchestrator {
    if (!ZoomSyncOrchestrator.instance) {
      ZoomSyncOrchestrator.instance = new ZoomSyncOrchestrator();
    }
    return ZoomSyncOrchestrator.instance;
  }

  /**
   * Generate a proper UUID for sync operations
   */
  private generateSyncId(): string {
    return crypto.randomUUID();
  }

  /**
   * Get the current authenticated user ID
   */
  private async getCurrentUserId(): Promise<string> {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) {
      throw new Error('User not authenticated');
    }
    return user.id;
  }

  /**
   * Start initial sync - fetch all historical webinars
   */
  async startInitialSync(connectionId: string, options?: { batchSize?: number }): Promise<string> {
    const syncId = this.generateSyncId();
    
    const operation: SyncOperation = {
      id: syncId,
      connectionId,
      type: SyncType.INITIAL,
      priority: SyncPriority.NORMAL,
      options: {
        batchSize: options?.batchSize || 50,
        retryCount: 0
      },
      createdAt: new Date()
    };

    this.queueManager.addToQueue(operation);
    this.processQueue();
    return syncId;
  }

  /**
   * Start incremental sync - only fetch data since last sync
   */
  async startIncrementalSync(connectionId: string): Promise<string> {
    const syncId = this.generateSyncId();
    
    const operation: SyncOperation = {
      id: syncId,
      connectionId,
      type: SyncType.INCREMENTAL,
      priority: SyncPriority.HIGH,
      options: {
        batchSize: 25,
        retryCount: 0
      },
      createdAt: new Date()
    };

    this.queueManager.addToQueue(operation);
    this.processQueue();
    return syncId;
  }

  /**
   * Sync a single webinar with all its data
   */
  async syncSingleWebinar(webinarId: string, connectionId: string): Promise<string> {
    const syncId = this.generateSyncId();
    
    const operation: SyncOperation = {
      id: syncId,
      connectionId,
      type: SyncType.MANUAL,
      priority: SyncPriority.CRITICAL,
      options: {
        webinarId,
        batchSize: 1,
        retryCount: 0
      },
      createdAt: new Date()
    };

    this.queueManager.addToQueue(operation);
    this.processQueue();
    return syncId;
  }

  /**
   * Schedule automatic sync based on connection settings
   */
  async scheduleAutomaticSync(connectionId: string): Promise<void> {
    const connection = await ZoomConnectionService.getConnection(connectionId);
    if (!connection?.auto_sync_enabled) return;

    const nextSyncTime = new Date();
    nextSyncTime.setHours(nextSyncTime.getHours() + (connection.sync_frequency_hours || 24));

    await ZoomConnectionService.updateConnection(connectionId, {
      next_sync_at: nextSyncTime.toISOString()
    });

    console.log(`Next automatic sync scheduled for ${nextSyncTime.toISOString()}`);
  }

  /**
   * Start the queue processor
   */
  private startQueueProcessor(): void {
    setInterval(() => {
      if (!this.isProcessing) {
        this.processQueue();
      }
    }, 5000);
  }

  /**
   * Process the sync queue
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessing || !this.queueManager.canProcessMore(this.activeSyncs.size)) {
      return;
    }

    const operation = this.queueManager.getNextOperation();
    if (!operation) return;

    this.isProcessing = true;

    try {
      await this.executeSync(operation);
    } catch (error) {
      console.error(`Sync operation ${operation.id} failed:`, error);
      await this.handleSyncError(operation, error);
    } finally {
      this.activeSyncs.delete(operation.id);
      this.isProcessing = false;
    }
  }

  /**
   * Execute a sync operation
   */
  private async executeSync(operation: SyncOperation): Promise<void> {
    const abortController = new AbortController();
    this.activeSyncs.set(operation.id, abortController);

    // Validate connection and get user ID
    const connection = await this.validateConnection(operation.connectionId);
    if (!connection) {
      throw new Error('Invalid or expired connection');
    }

    await this.syncExecutor.executeSync(operation, abortController.signal);
  }

  /**
   * Validate connection and refresh token if needed
   */
  private async validateConnection(connectionId: string): Promise<ZoomConnection | null> {
    const connection = await ZoomConnectionService.getConnection(connectionId);
    if (!connection) return null;

    if (ZoomConnectionService.isTokenExpired(connection.token_expires_at)) {
      return await ZoomConnectionService.refreshToken(connection);
    }

    return connection;
  }

  /**
   * Handle sync errors with retry logic
   */
  private async handleSyncError(operation: SyncOperation, error: any): Promise<void> {
    const retryCount = (operation.options?.retryCount || 0) + 1;
    
    if (retryCount <= this.retryAttempts) {
      const delay = Math.pow(2, retryCount) * 1000;
      setTimeout(() => {
        // Generate new UUID for retry operation
        const retryOperation = {
          ...operation,
          id: this.generateSyncId(),
          options: {
            ...operation.options,
            retryCount
          }
        };
        this.queueManager.addToQueue(retryOperation);
      }, delay);
    } else {
      console.error(`Sync operation ${operation.id} failed after ${this.retryAttempts} retries:`, error);
    }
  }

  /**
   * Cancel a sync operation
   */
  async cancelSync(operationId: string): Promise<void> {
    const controller = this.activeSyncs.get(operationId);
    if (controller) {
      controller.abort();
      this.activeSyncs.delete(operationId);
    }

    this.queueManager.removeFromQueue(operationId);
  }

  /**
   * Get current sync status
   */
  async getSyncStatus(): Promise<{
    activeOperations: number;
    queuedOperations: number;
    operations: Array<{ id: string; type: SyncType; priority: SyncPriority }>
  }> {
    const queueStatus = this.queueManager.getStatus();
    return {
      activeOperations: this.activeSyncs.size,
      ...queueStatus
    };
  }
}

// Export singleton instance
export const zoomSyncOrchestrator = ZoomSyncOrchestrator.getInstance();
