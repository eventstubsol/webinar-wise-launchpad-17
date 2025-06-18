
import { ZoomConnectionService } from '../ZoomConnectionService';
import { ZoomConnection, SyncType, SyncStatus } from '@/types/zoom';
import { SyncOperation, SyncPriority } from './types';
import { SyncQueueManager } from './SyncQueueManager';
import { SyncExecutor } from './SyncExecutor';

/**
 * FIXED: Comprehensive sync orchestration service with proper loop prevention
 */
export class ZoomSyncOrchestrator {
  private static instance: ZoomSyncOrchestrator;
  private queueManager: SyncQueueManager;
  private syncExecutor: SyncExecutor;
  private activeSyncs: Map<string, AbortController> = new Map();
  private readonly retryAttempts = 2; // Reduced from 3
  private isProcessing = false;
  private processingInterval: NodeJS.Timeout | null = null;
  private readonly maxConcurrentSyncs = 1; // Reduced from 2
  private circuitBreakerFailures = 0;
  private readonly circuitBreakerThreshold = 5;
  private circuitBreakerResetTime = 0;

  private constructor() {
    this.queueManager = new SyncQueueManager();
    this.syncExecutor = new SyncExecutor();
    this.startControlledQueueProcessor();
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
   * FIXED: Start controlled queue processor with proper cleanup
   */
  private startControlledQueueProcessor(): void {
    // Clear any existing interval
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
    }

    this.processingInterval = setInterval(() => {
      this.processQueueSafely();
    }, 10000); // Increased interval from 5s to 10s
  }

  /**
   * FIXED: Safe queue processing with circuit breaker
   */
  private async processQueueSafely(): Promise<void> {
    // Circuit breaker check
    if (this.circuitBreakerFailures >= this.circuitBreakerThreshold) {
      if (Date.now() < this.circuitBreakerResetTime) {
        console.log('Circuit breaker active, skipping queue processing');
        return;
      } else {
        // Reset circuit breaker
        this.circuitBreakerFailures = 0;
        console.log('Circuit breaker reset');
      }
    }

    if (this.isProcessing || !this.queueManager.canProcessMore(this.activeSyncs.size)) {
      return;
    }

    const operation = this.queueManager.getNextOperation();
    if (!operation) return;

    try {
      await this.executeSync(operation);
      this.circuitBreakerFailures = 0; // Reset on success
    } catch (error) {
      console.error(`Sync operation ${operation.id} failed:`, error);
      this.circuitBreakerFailures++;
      
      if (this.circuitBreakerFailures >= this.circuitBreakerThreshold) {
        this.circuitBreakerResetTime = Date.now() + (5 * 60 * 1000); // 5 minute reset
        console.warn('Circuit breaker activated due to repeated failures');
      }

      await this.handleSyncError(operation, error);
    }
  }

  /**
   * Start initial sync - fetch all historical webinars
   */
  async startInitialSync(connectionId: string, options?: { batchSize?: number }): Promise<string> {
    const operation: SyncOperation = {
      id: `initial-${Date.now()}`,
      connectionId,
      type: SyncType.INITIAL,
      priority: SyncPriority.NORMAL,
      options: {
        batchSize: options?.batchSize || 25, // Reduced from 50
        retryCount: 0
      },
      createdAt: new Date()
    };

    this.queueManager.addToQueue(operation);
    return operation.id;
  }

  /**
   * Start incremental sync - only fetch data since last sync
   */
  async startIncrementalSync(connectionId: string): Promise<string> {
    const operation: SyncOperation = {
      id: `incremental-${Date.now()}`,
      connectionId,
      type: SyncType.INCREMENTAL,
      priority: SyncPriority.HIGH,
      options: {
        batchSize: 15, // Reduced from 25
        retryCount: 0
      },
      createdAt: new Date()
    };

    this.queueManager.addToQueue(operation);
    return operation.id;
  }

  /**
   * Sync a single webinar with all its data
   */
  async syncSingleWebinar(webinarId: string, connectionId: string): Promise<string> {
    const operation: SyncOperation = {
      id: `single-${webinarId}-${Date.now()}`,
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
    return operation.id;
  }

  /**
   * Execute a sync operation
   */
  private async executeSync(operation: SyncOperation): Promise<void> {
    this.isProcessing = true;
    const abortController = new AbortController();
    this.activeSyncs.set(operation.id, abortController);

    try {
      // Validate connection
      const connection = await this.validateConnection(operation.connectionId);
      if (!connection) {
        throw new Error('Invalid or expired connection');
      }

      await this.syncExecutor.executeSync(operation, abortController.signal);
    } finally {
      this.activeSyncs.delete(operation.id);
      this.isProcessing = false;
    }
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
   * FIXED: Handle sync errors with improved categorization and limits
   */
  private async handleSyncError(operation: SyncOperation, error: any): Promise<void> {
    const retryCount = (operation.options?.retryCount || 0) + 1;
    
    // Categorize errors - don't retry certain types
    const nonRetryableErrors = [
      'Invalid or expired connection',
      'Future webinar',
      'No participants available',
      'Authentication failed'
    ];
    
    const isNonRetryable = nonRetryableErrors.some(errType => 
      error.message?.includes(errType)
    );
    
    if (isNonRetryable) {
      console.log(`Non-retryable error for operation ${operation.id}: ${error.message}`);
      return;
    }
    
    if (retryCount <= this.retryAttempts) {
      // Exponential backoff with jitter
      const baseDelay = Math.pow(2, retryCount) * 2000; // Start at 4s, then 8s, 16s
      const jitter = Math.random() * 1000; // Add up to 1s jitter
      const delay = baseDelay + jitter;
      
      setTimeout(() => {
        const retryOperation = {
          ...operation,
          id: `${operation.id}-retry-${retryCount}`,
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
    circuitBreakerActive: boolean;
    operations: Array<{ id: string; type: SyncType; priority: SyncPriority }>
  }> {
    const queueStatus = this.queueManager.getStatus();
    return {
      activeOperations: this.activeSyncs.size,
      circuitBreakerActive: this.circuitBreakerFailures >= this.circuitBreakerThreshold,
      ...queueStatus
    };
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
   * FIXED: Cleanup method to prevent memory leaks
   */
  cleanup(): void {
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = null;
    }

    // Cancel all active syncs
    this.activeSyncs.forEach((controller, id) => {
      controller.abort();
      console.log(`Cancelled sync operation: ${id}`);
    });
    this.activeSyncs.clear();

    this.isProcessing = false;
  }
}

// Export singleton instance
export const zoomSyncOrchestrator = ZoomSyncOrchestrator.getInstance();

// Cleanup on page unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    zoomSyncOrchestrator.cleanup();
  });
}
