
import { ZoomWebinarService } from '../api/ZoomWebinarService';
import { ZoomConnectionService } from '../ZoomConnectionService';
import { BatchOperations } from '../operations/crud/BatchOperations';
import { SyncOperation, SyncProgress } from './types';
import { SyncType } from '@/types/zoom';
import { SyncProgressTracker } from './SyncProgressTracker';

/**
 * Handles execution of different sync types with real database operations
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
   * Execute initial sync - sync all webinars
   */
  private async executeInitialSync(
    operation: SyncOperation,
    syncLogId: string,
    signal: AbortSignal
  ): Promise<void> {
    const batchSize = operation.options?.batchSize || this.defaultBatchSize;
    
    // Get all webinars from Zoom API
    const webinars = await ZoomWebinarService.listWebinars(
      operation.connectionId,
      { pageSize: batchSize },
      (progress) => this.progressTracker.updateProgress(syncLogId, progress)
    );

    if (signal.aborted) throw new Error('Sync cancelled');

    await this.progressTracker.updateSyncLog(syncLogId, {
      total_items: webinars.length
    });

    // Process webinars in batches to manage memory and API rate limits
    let processedCount = 0;
    let failedCount = 0;
    const batches = this.createBatches(webinars, Math.min(batchSize, 10)); // Smaller batches for detailed sync

    for (const batch of batches) {
      if (signal.aborted) throw new Error('Sync cancelled');

      // Process batch with limited concurrency
      const batchPromises = batch.map(async (webinar) => {
        try {
          await this.syncWebinarData(webinar.id, operation.connectionId);
          processedCount++;
          
          await this.progressTracker.updateProgress(syncLogId, {
            total: webinars.length,
            processed: processedCount,
            failed: failedCount,
            current: `Synced: ${webinar.topic}`
          });
        } catch (error) {
          failedCount++;
          console.error(`Failed to sync webinar ${webinar.id}:`, error);
          
          await this.progressTracker.updateProgress(syncLogId, {
            total: webinars.length,
            processed: processedCount,
            failed: failedCount,
            current: `Failed: ${webinar.topic}`
          });
        }
      });

      await Promise.allSettled(batchPromises);
      
      // Add delay between batches to respect rate limits
      if (batches.indexOf(batch) < batches.length - 1) {
        await this.delay(2000); // 2 second delay between batches
      }
    }

    await this.progressTracker.updateSyncLog(syncLogId, {
      processed_items: processedCount,
      failed_items: failedCount
    });
  }

  /**
   * Execute incremental sync - sync recent webinars
   */
  private async executeIncrementalSync(
    operation: SyncOperation,
    syncLogId: string,
    signal: AbortSignal
  ): Promise<void> {
    const connection = await ZoomConnectionService.getConnection(operation.connectionId);
    const lastSyncDate = connection?.last_sync_at ? 
      new Date(connection.last_sync_at) : 
      new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // Default to 7 days ago

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
    let failedCount = 0;

    for (const webinar of webinars) {
      if (signal.aborted) throw new Error('Sync cancelled');

      try {
        await this.syncWebinarData(webinar.id, operation.connectionId);
        processedCount++;
        
        await this.progressTracker.updateProgress(syncLogId, {
          total: webinars.length,
          processed: processedCount,
          failed: failedCount,
          current: `Updated: ${webinar.topic}`
        });
      } catch (error) {
        failedCount++;
        console.error(`Failed to sync webinar ${webinar.id}:`, error);
      }

      // Small delay between individual webinars
      await this.delay(500);
    }

    // Update connection last sync time
    await ZoomConnectionService.updateConnection(operation.connectionId, {
      last_sync_at: new Date().toISOString()
    });

    await this.progressTracker.updateSyncLog(syncLogId, {
      processed_items: processedCount,
      failed_items: failedCount
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

    try {
      await this.syncWebinarData(webinarId, operation.connectionId);

      await this.progressTracker.updateProgress(syncLogId, {
        total: 1,
        processed: 1,
        failed: 0,
        current: 'Webinar sync completed'
      });
    } catch (error) {
      await this.progressTracker.updateProgress(syncLogId, {
        total: 1,
        processed: 0,
        failed: 1,
        current: `Failed to sync webinar: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
      throw error;
    }
  }

  /**
   * Sync all data for a specific webinar - NOW WITH REAL DATABASE OPERATIONS
   */
  private async syncWebinarData(webinarId: string, connectionId: string): Promise<void> {
    try {
      // Fetch all data concurrently from Zoom API
      const [
        webinarResult,
        registrantsResult,
        participantsResult,
        pollsResult,
        qaResult
      ] = await Promise.allSettled([
        ZoomWebinarService.getWebinar(webinarId),
        ZoomWebinarService.getWebinarRegistrants(webinarId),
        ZoomWebinarService.getWebinarParticipants(webinarId),
        ZoomWebinarService.getWebinarPolls(webinarId),
        ZoomWebinarService.getWebinarQA(webinarId)
      ]);

      // Extract successful results
      const webinarData = webinarResult.status === 'fulfilled' ? webinarResult.value : null;
      const registrants = registrantsResult.status === 'fulfilled' ? registrantsResult.value : [];
      const participants = participantsResult.status === 'fulfilled' ? participantsResult.value : [];
      const polls = pollsResult.status === 'fulfilled' ? pollsResult.value : [];
      const qa = qaResult.status === 'fulfilled' ? qaResult.value : [];

      if (!webinarData) {
        throw new Error('Failed to fetch webinar details');
      }

      // Save all data to database using the new BatchOperations
      await BatchOperations.syncCompleteWebinarData(
        webinarData,
        registrants,
        participants,
        polls,
        qa,
        connectionId
      );

      console.log(`Successfully synced webinar ${webinarId} to database`);
    } catch (error) {
      console.error(`Error syncing webinar ${webinarId}:`, error);
      throw error;
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
