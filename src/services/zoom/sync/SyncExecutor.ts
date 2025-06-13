
import { ZoomWebinarService } from '../api/ZoomWebinarService';
import { ZoomConnectionService } from '../ZoomConnectionService';
import { ParticipantAnalyticsService } from '../analytics/ParticipantAnalyticsService';
import { DatabaseOperations } from '../analytics/DatabaseOperations';
import { SyncOperation, SyncProgress } from './types';
import { SyncType } from '@/types/zoom';
import { SyncProgressTracker } from './SyncProgressTracker';

/**
 * Handles execution of different sync types
 */
export class SyncExecutor {
  private progressTracker: SyncProgressTracker;
  private readonly defaultBatchSize = 50;

  constructor() {
    this.progressTracker = new SyncProgressTracker();
  }

  /**
   * Execute a sync operation
   */
  async executeSync(operation: SyncOperation, signal: AbortSignal): Promise<void> {
    // Create sync log
    const syncLogId = await this.progressTracker.createSyncLog(
      operation.connectionId, 
      operation.type,
      operation.options?.webinarId
    );

    try {
      switch (operation.type) {
        case SyncType.INITIAL:
          await this.executeInitialSync(operation, syncLogId, signal);
          break;
        case SyncType.INCREMENTAL:
          await this.executeIncrementalSync(operation, syncLogId, signal);
          break;
        case SyncType.MANUAL:
          if (operation.options?.webinarId) {
            await this.executeSingleWebinarSync(operation, syncLogId, signal);
          }
          break;
      }

      await this.progressTracker.completeSyncLog(syncLogId);
    } catch (error) {
      await this.progressTracker.failSyncLog(syncLogId, error);
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
      (progress) => this.progressTracker.updateProgress(syncLogId, progress)
    );

    if (signal.aborted) throw new Error('Sync cancelled');

    await this.progressTracker.updateSyncLog(syncLogId, {
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
            
            await this.progressTracker.updateProgress(syncLogId, {
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

      await this.delay(1000);
    }

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
    const lastSyncDate = connection?.last_sync_at ? 
      new Date(connection.last_sync_at) : 
      new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const webinars = await ZoomWebinarService.listWebinars(
      operation.connectionId,
      { 
        from: lastSyncDate,
        pageSize: operation.options?.batchSize || 25
      },
      (progress) => this.progressTracker.updateProgress(syncLogId, progress)
    );

    if (signal.aborted) throw new Error('Sync cancelled');

    await this.progressTracker.updateSyncLog(syncLogId, {
      total_items: webinars.length
    });

    let processedCount = 0;
    for (const webinar of webinars) {
      if (signal.aborted) throw new Error('Sync cancelled');

      try {
        await this.syncWebinarData(webinar.id, operation.connectionId);
        processedCount++;
        
        await this.progressTracker.updateProgress(syncLogId, {
          total: webinars.length,
          processed: processedCount,
          failed: 0,
          current: `Updated: ${webinar.topic}`
        });
      } catch (error) {
        console.error(`Failed to sync webinar ${webinar.id}:`, error);
      }
    }

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

    await this.progressTracker.updateSyncLog(syncLogId, {
      total_items: 1,
      resource_id: webinarId
    });

    if (signal.aborted) throw new Error('Sync cancelled');

    await this.syncWebinarData(webinarId, operation.connectionId);

    await this.progressTracker.updateProgress(syncLogId, {
      total: 1,
      processed: 1,
      failed: 0,
      current: 'Webinar sync completed'
    });

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
  }

  /**
   * Calculate analytics for all webinars
   */
  private async calculateAnalytics(connectionId: string): Promise<void> {
    try {
      // Implementation would go here
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
