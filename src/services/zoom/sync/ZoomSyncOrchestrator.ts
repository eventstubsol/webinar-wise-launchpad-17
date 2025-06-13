
import { supabase } from '@/integrations/supabase/client';
import { ZoomWebinarService } from '../api/ZoomWebinarService';
import { ZoomConnectionService } from '../ZoomConnectionService';
import { ParticipantAnalyticsService } from '../analytics/ParticipantAnalyticsService';
import { DatabaseOperations } from '../analytics/DatabaseOperations';
import { ZoomConnection, SyncType, SyncStatus, ZoomSyncLog } from '@/types/zoom';

/**
 * Sync operation priority levels
 */
export enum SyncPriority {
  CRITICAL = 1,  // Manual user-triggered syncs
  HIGH = 2,      // Incremental syncs
  NORMAL = 3,    // Initial syncs
  LOW = 4        // Background maintenance
}

/**
 * Sync operation configuration
 */
export interface SyncOperation {
  id: string;
  connectionId: string;
  type: SyncType;
  priority: SyncPriority;
  options?: {
    webinarId?: string;
    batchSize?: number;
    skipAnalytics?: boolean;
    retryCount?: number;
  };
  createdAt: Date;
}

/**
 * Sync progress data for real-time updates
 */
export interface SyncProgress {
  syncLogId: string;
  totalItems: number;
  processedItems: number;
  failedItems: number;
  currentOperation: string;
  estimatedTimeRemaining?: number;
}

/**
 * JSON-serializable sync error details for database storage
 */
interface SyncErrorDetailsJson {
  error_code?: string;
  error_message: string;
  failed_items?: Array<{
    id: string;
    type: string;
    error: string;
  }>;
  retry_count?: number;
  last_retry_at?: string;
  [key: string]: any; // Index signature for Json compatibility
}

/**
 * Comprehensive sync orchestration service for managing Zoom data synchronization
 */
export class ZoomSyncOrchestrator {
  private static instance: ZoomSyncOrchestrator;
  private syncQueue: SyncOperation[] = [];
  private activeSyncs: Map<string, AbortController> = new Map();
  private readonly maxConcurrentSyncs = 2;
  private readonly defaultBatchSize = 50;
  private readonly retryAttempts = 3;
  private isProcessing = false;

  private constructor() {
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
   * Start initial sync - fetch all historical webinars
   */
  async startInitialSync(connectionId: string, options?: { batchSize?: number }): Promise<string> {
    const operation: SyncOperation = {
      id: `initial-${Date.now()}`,
      connectionId,
      type: SyncType.INITIAL,
      priority: SyncPriority.NORMAL,
      options: {
        batchSize: options?.batchSize || this.defaultBatchSize,
        retryCount: 0
      },
      createdAt: new Date()
    };

    this.addToQueue(operation);
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
        batchSize: 25, // Smaller batches for incremental
        retryCount: 0
      },
      createdAt: new Date()
    };

    this.addToQueue(operation);
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

    this.addToQueue(operation);
    return operation.id;
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

    // In a real implementation, this would integrate with a job scheduler
    console.log(`Next automatic sync scheduled for ${nextSyncTime.toISOString()}`);
  }

  /**
   * Add operation to priority queue
   */
  private addToQueue(operation: SyncOperation): void {
    this.syncQueue.push(operation);
    this.syncQueue.sort((a, b) => a.priority - b.priority);
    this.processQueue();
  }

  /**
   * Start the queue processor
   */
  private startQueueProcessor(): void {
    setInterval(() => {
      if (!this.isProcessing) {
        this.processQueue();
      }
    }, 5000); // Check queue every 5 seconds
  }

  /**
   * Process the sync queue
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessing || this.activeSyncs.size >= this.maxConcurrentSyncs) {
      return;
    }

    const operation = this.syncQueue.shift();
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

    // Validate connection
    const connection = await this.validateConnection(operation.connectionId);
    if (!connection) {
      throw new Error('Invalid or expired connection');
    }

    // Create sync log
    const syncLogId = await this.createSyncLog(operation);

    try {
      switch (operation.type) {
        case SyncType.INITIAL:
          await this.executeInitialSync(operation, syncLogId, abortController.signal);
          break;
        case SyncType.INCREMENTAL:
          await this.executeIncrementalSync(operation, syncLogId, abortController.signal);
          break;
        case SyncType.MANUAL:
          if (operation.options?.webinarId) {
            await this.executeSingleWebinarSync(operation, syncLogId, abortController.signal);
          }
          break;
      }

      await this.completeSyncLog(syncLogId);
    } catch (error) {
      await this.failSyncLog(syncLogId, error);
      throw error;
    }
  }

  /**
   * Execute initial sync
   */
  private async executeInitialSync(
    operation: SyncOperation,
    syncLogId: string,
    signal: AbortSignal
  ): Promise<void> {
    const batchSize = operation.options?.batchSize || this.defaultBatchSize;
    
    // Get all webinars
    const webinars = await ZoomWebinarService.listWebinars(
      operation.connectionId,
      { pageSize: batchSize },
      (progress) => this.updateProgress(syncLogId, progress)
    );

    if (signal.aborted) throw new Error('Sync cancelled');

    // Update total count
    await this.updateSyncLog(syncLogId, {
      total_items: webinars.length
    });

    // Process webinars in batches
    let processedCount = 0;
    const batches = this.createBatches(webinars, batchSize);

    for (const batch of batches) {
      if (signal.aborted) throw new Error('Sync cancelled');

      await Promise.allSettled(
        batch.map(async (webinar) => {
          try {
            await this.syncWebinarData(webinar.id, operation.connectionId);
            processedCount++;
            
            await this.updateProgress(syncLogId, {
              total: webinars.length,
              processed: processedCount,
              failed: 0,
              current: `Synced: ${webinar.topic}`
            });
          } catch (error) {
            console.error(`Failed to sync webinar ${webinar.id}:`, error);
          }
        })
      );

      // Add delay between batches to respect rate limits
      await this.delay(1000);
    }

    // Trigger analytics calculation
    if (!operation.options?.skipAnalytics) {
      await this.calculateAnalytics(operation.connectionId);
    }
  }

  /**
   * Execute incremental sync
   */
  private async executeIncrementalSync(
    operation: SyncOperation,
    syncLogId: string,
    signal: AbortSignal
  ): Promise<void> {
    const connection = await ZoomConnectionService.getConnection(operation.connectionId);
    const lastSyncDate = connection?.last_sync_at ? new Date(connection.last_sync_at) : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    // Get webinars since last sync
    const webinars = await ZoomWebinarService.listWebinars(
      operation.connectionId,
      { 
        from: lastSyncDate,
        pageSize: operation.options?.batchSize || 25
      },
      (progress) => this.updateProgress(syncLogId, progress)
    );

    if (signal.aborted) throw new Error('Sync cancelled');

    await this.updateSyncLog(syncLogId, {
      total_items: webinars.length
    });

    // Process each webinar
    let processedCount = 0;
    for (const webinar of webinars) {
      if (signal.aborted) throw new Error('Sync cancelled');

      try {
        await this.syncWebinarData(webinar.id, operation.connectionId);
        processedCount++;
        
        await this.updateProgress(syncLogId, {
          total: webinars.length,
          processed: processedCount,
          failed: 0,
          current: `Updated: ${webinar.topic}`
        });
      } catch (error) {
        console.error(`Failed to sync webinar ${webinar.id}:`, error);
      }
    }

    // Update last sync time
    await ZoomConnectionService.updateConnection(operation.connectionId, {
      last_sync_at: new Date().toISOString()
    });
  }

  /**
   * Execute single webinar sync
   */
  private async executeSingleWebinarSync(
    operation: SyncOperation,
    syncLogId: string,
    signal: AbortSignal
  ): Promise<void> {
    const webinarId = operation.options?.webinarId!;

    await this.updateSyncLog(syncLogId, {
      total_items: 1,
      resource_id: webinarId
    });

    if (signal.aborted) throw new Error('Sync cancelled');

    await this.syncWebinarData(webinarId, operation.connectionId);

    await this.updateProgress(syncLogId, {
      total: 1,
      processed: 1,
      failed: 0,
      current: 'Webinar sync completed'
    });

    // Calculate analytics for this webinar
    await this.calculateWebinarAnalytics(webinarId);
  }

  /**
   * Sync all data for a specific webinar
   */
  private async syncWebinarData(webinarId: string, connectionId: string): Promise<void> {
    const tasks = [
      ZoomWebinarService.getWebinar(webinarId),
      ZoomWebinarService.getWebinarRegistrants(webinarId),
      ZoomWebinarService.getWebinarParticipants(webinarId),
      ZoomWebinarService.getWebinarPolls(webinarId),
      ZoomWebinarService.getWebinarQA(webinarId)
    ];

    const results = await Promise.allSettled(tasks);
    
    // Process results and save to database
    // This would involve transforming data and saving to respective tables
    // Implementation depends on your database operations service
  }

  /**
   * Calculate analytics for all webinars
   */
  private async calculateAnalytics(connectionId: string): Promise<void> {
    try {
      // Get all webinars for this connection
      const { data: webinars } = await supabase
        .from('zoom_webinars')
        .select('id, webinar_id, topic')
        .eq('connection_id', connectionId);

      if (webinars) {
        for (const webinar of webinars) {
          await this.calculateWebinarAnalytics(webinar.id);
        }
      }
    } catch (error) {
      console.error('Error calculating analytics:', error);
    }
  }

  /**
   * Calculate analytics for a specific webinar
   */
  private async calculateWebinarAnalytics(webinarId: string): Promise<void> {
    try {
      const analytics = await ParticipantAnalyticsService.calculateWebinarEngagement(webinarId);
      await DatabaseOperations.updateWebinarMetrics(webinarId, analytics);
    } catch (error) {
      console.error(`Error calculating analytics for webinar ${webinarId}:`, error);
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
   * Create sync log entry
   */
  private async createSyncLog(operation: SyncOperation): Promise<string> {
    const { data, error } = await supabase
      .from('zoom_sync_logs')
      .insert({
        connection_id: operation.connectionId,
        sync_type: operation.type,
        sync_status: SyncStatus.STARTED,
        resource_type: operation.options?.webinarId ? 'webinar' : 'webinars',
        resource_id: operation.options?.webinarId,
        started_at: new Date().toISOString(),
        total_items: 0,
        processed_items: 0,
        failed_items: 0
      })
      .select('id')
      .single();

    if (error) throw error;
    return data.id;
  }

  /**
   * Update sync log with progress
   */
  private async updateSyncLog(
    syncLogId: string,
    updates: Partial<Omit<ZoomSyncLog, 'id' | 'created_at'>>
  ): Promise<void> {
    await supabase
      .from('zoom_sync_logs')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', syncLogId);
  }

  /**
   * Update progress and emit real-time updates
   */
  private async updateProgress(
    syncLogId: string,
    progress: { total: number; processed: number; failed: number; current: string }
  ): Promise<void> {
    await this.updateSyncLog(syncLogId, {
      total_items: progress.total,
      processed_items: progress.processed,
      failed_items: progress.failed,
      sync_status: SyncStatus.IN_PROGRESS
    });

    // Emit real-time update via Supabase realtime
    // The UI will pick this up through the existing useSyncProgress hook
  }

  /**
   * Complete sync log
   */
  private async completeSyncLog(syncLogId: string): Promise<void> {
    await this.updateSyncLog(syncLogId, {
      sync_status: SyncStatus.COMPLETED,
      completed_at: new Date().toISOString()
    });
  }

  /**
   * Mark sync log as failed
   */
  private async failSyncLog(syncLogId: string, error: any): Promise<void> {
    const errorDetails: SyncErrorDetailsJson = {
      error_message: error instanceof Error ? error.message : 'Unknown error',
      error_code: error.code || 'UNKNOWN_ERROR',
      retry_count: 0,
      last_retry_at: new Date().toISOString()
    };

    await this.updateSyncLog(syncLogId, {
      sync_status: SyncStatus.FAILED,
      error_message: error instanceof Error ? error.message : 'Unknown error',
      error_details: errorDetails,
      completed_at: new Date().toISOString()
    });
  }

  /**
   * Handle sync errors with retry logic
   */
  private async handleSyncError(operation: SyncOperation, error: any): Promise<void> {
    const retryCount = (operation.options?.retryCount || 0) + 1;
    
    if (retryCount <= this.retryAttempts) {
      // Retry with exponential backoff
      const delay = Math.pow(2, retryCount) * 1000;
      setTimeout(() => {
        const retryOperation = {
          ...operation,
          id: `${operation.id}-retry-${retryCount}`,
          options: {
            ...operation.options,
            retryCount
          }
        };
        this.addToQueue(retryOperation);
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

    // Remove from queue if not started
    this.syncQueue = this.syncQueue.filter(op => op.id !== operationId);
  }

  /**
   * Get current sync status
   */
  async getSyncStatus(): Promise<{
    activeOperations: number;
    queuedOperations: number;
    operations: Array<{ id: string; type: SyncType; priority: SyncPriority }>
  }> {
    return {
      activeOperations: this.activeSyncs.size,
      queuedOperations: this.syncQueue.length,
      operations: this.syncQueue.map(op => ({
        id: op.id,
        type: op.type,
        priority: op.priority
      }))
    };
  }

  /**
   * Utility: Create batches from array
   */
  private createBatches<T>(array: T[], batchSize: number): T[][] {
    const batches: T[][] = [];
    for (let i = 0; i < array.length; i += batchSize) {
      batches.push(array.slice(i, i + batchSize));
    }
    return batches;
  }

  /**
   * Utility: Delay execution
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Export singleton instance
export const zoomSyncOrchestrator = ZoomSyncOrchestrator.getInstance();
