
import { ZoomWebinarService } from '../api/ZoomWebinarService';
import { ZoomConnectionService } from '../ZoomConnectionService';
import { BatchOperations } from '../operations/crud/BatchOperations';
import { SyncOperation, SyncProgress } from './types';
import { SyncType } from '@/types/zoom';
import { EnhancedSyncProgressTracker } from './EnhancedSyncProgressTracker';

/**
 * Sequential webinar sync executor with proper rate limiting and error handling
 */
export class SequentialSyncExecutor {
  private progressTracker: EnhancedSyncProgressTracker;
  private readonly rateLimitDelay = 100; // 100ms between API calls (10 req/sec)
  private readonly maxRetries = 3;
  private readonly baseRetryDelay = 1000; // 1 second base delay

  constructor() {
    this.progressTracker = new EnhancedSyncProgressTracker();
  }

  /**
   * Execute a sync operation with sequential processing
   */
  async executeSync(operation: SyncOperation, signal: AbortSignal): Promise<void> {
    const syncLogId = await this.progressTracker.createSyncLog(
      operation.connectionId, 
      operation.type,
      operation.options?.webinarId
    );

    try {
      switch (operation.type) {
        case SyncType.INITIAL:
          await this.executeSequentialInitialSync(operation, syncLogId, signal);
          break;
        case SyncType.INCREMENTAL:
          await this.executeSequentialIncrementalSync(operation, syncLogId, signal);
          break;
        case SyncType.MANUAL:
          if (operation.options?.webinarId) {
            await this.executeSequentialSingleWebinarSync(operation, syncLogId, signal);
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
   * Execute initial sync with sequential processing
   */
  private async executeSequentialInitialSync(
    operation: SyncOperation,
    syncLogId: string,
    signal: AbortSignal
  ): Promise<void> {
    // Get list of webinars first
    await this.progressTracker.updateSyncStage(syncLogId, null, 'fetching_webinar_list', 5);
    
    const webinars = await ZoomWebinarService.listWebinars(
      operation.connectionId,
      { pageSize: 100 }
    );

    if (signal.aborted) throw new Error('Sync cancelled');

    await this.progressTracker.updateSyncLog(syncLogId, {
      total_items: webinars.length
    });

    // Process webinars sequentially
    let processedCount = 0;
    let failedCount = 0;
    const failedWebinars: Array<{ id: string; error: string }> = [];

    for (let i = 0; i < webinars.length; i++) {
      const webinar = webinars[i];
      
      if (signal.aborted) throw new Error('Sync cancelled');

      try {
        // Update current webinar being processed
        await this.progressTracker.updateSyncStage(syncLogId, webinar.id, 'starting_webinar', 0);
        
        // Process this webinar sequentially
        await this.processWebinarSequentially(webinar.id, syncLogId, operation.connectionId);
        
        processedCount++;
        
        // Update overall progress
        const overallProgress = Math.round(((i + 1) / webinars.length) * 100);
        await this.progressTracker.updateProgress(syncLogId, {
          total: webinars.length,
          processed: processedCount,
          failed: failedCount,
          current: `Completed: ${webinar.topic}`,
          overallProgress
        });

      } catch (error) {
        failedCount++;
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        failedWebinars.push({ id: webinar.id, error: errorMessage });
        
        console.error(`Failed to sync webinar ${webinar.id}:`, error);
        
        await this.progressTracker.updateProgress(syncLogId, {
          total: webinars.length,
          processed: processedCount,
          failed: failedCount,
          current: `Failed: ${webinar.topic} - ${errorMessage}`
        });
      }
    }

    // Update final sync status
    await this.progressTracker.updateSyncLog(syncLogId, {
      processed_items: processedCount,
      failed_items: failedCount,
      error_details: failedWebinars.length > 0 ? { failed_webinars: failedWebinars } : null
    });
  }

  /**
   * Execute incremental sync with sequential processing
   */
  private async executeSequentialIncrementalSync(
    operation: SyncOperation,
    syncLogId: string,
    signal: AbortSignal
  ): Promise<void> {
    const connection = await ZoomConnectionService.getConnection(operation.connectionId);
    const lastSyncDate = connection?.last_sync_at ? 
      new Date(connection.last_sync_at) : 
      new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    // Get recent webinars
    await this.progressTracker.updateSyncStage(syncLogId, null, 'fetching_recent_webinars', 5);
    
    const webinars = await ZoomWebinarService.listWebinars(
      operation.connectionId,
      { 
        from: lastSyncDate,
        pageSize: 50
      }
    );

    if (signal.aborted) throw new Error('Sync cancelled');

    await this.progressTracker.updateSyncLog(syncLogId, {
      total_items: webinars.length
    });

    let processedCount = 0;
    let failedCount = 0;

    for (let i = 0; i < webinars.length; i++) {
      const webinar = webinars[i];
      
      if (signal.aborted) throw new Error('Sync cancelled');

      try {
        await this.progressTracker.updateSyncStage(syncLogId, webinar.id, 'starting_webinar', 0);
        
        await this.processWebinarSequentially(webinar.id, syncLogId, operation.connectionId);
        
        processedCount++;
        
        const overallProgress = Math.round(((i + 1) / webinars.length) * 100);
        await this.progressTracker.updateProgress(syncLogId, {
          total: webinars.length,
          processed: processedCount,
          failed: failedCount,
          current: `Updated: ${webinar.topic}`,
          overallProgress
        });

      } catch (error) {
        failedCount++;
        console.error(`Failed to sync webinar ${webinar.id}:`, error);
      }
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
  private async executeSequentialSingleWebinarSync(
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
      await this.processWebinarSequentially(webinarId, syncLogId, operation.connectionId);

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
   * Process a single webinar with all its data sequentially
   */
  private async processWebinarSequentially(
    webinarId: string, 
    syncLogId: string, 
    connectionId: string
  ): Promise<void> {
    const stages = [
      { name: 'webinar_details', label: 'Fetching webinar details', progress: 15 },
      { name: 'registrants', label: 'Fetching registrants', progress: 35 },
      { name: 'participants', label: 'Fetching participants', progress: 55 },
      { name: 'polls', label: 'Fetching polls and responses', progress: 75 },
      { name: 'qa', label: 'Fetching Q&A data', progress: 90 },
      { name: 'recordings', label: 'Fetching recordings', progress: 100 }
    ];

    let webinarData: any = null;
    let registrants: any[] = [];
    let participants: any[] = [];
    let polls: any[] = [];
    let qa: any[] = [];

    for (const stage of stages) {
      await this.progressTracker.updateSyncStage(syncLogId, webinarId, stage.name, stage.progress);
      
      try {
        switch (stage.name) {
          case 'webinar_details':
            webinarData = await this.retryApiCall(() => ZoomWebinarService.getWebinar(webinarId));
            break;
          case 'registrants':
            registrants = await this.retryApiCall(() => ZoomWebinarService.getWebinarRegistrants(webinarId));
            break;
          case 'participants':
            // Only fetch participants for past webinars
            if (webinarData && new Date(webinarData.start_time) < new Date()) {
              participants = await this.retryApiCall(() => ZoomWebinarService.getWebinarParticipants(webinarId));
            }
            break;
          case 'polls':
            polls = await this.retryApiCall(() => ZoomWebinarService.getWebinarPolls(webinarId));
            break;
          case 'qa':
            qa = await this.retryApiCall(() => ZoomWebinarService.getWebinarQA(webinarId));
            break;
          case 'recordings':
            // Recordings are optional - don't fail if not available
            try {
              await this.retryApiCall(() => ZoomWebinarService.getWebinarRecordings?.(webinarId));
            } catch (error) {
              console.log(`No recordings available for webinar ${webinarId}`);
            }
            break;
        }

        // Rate limiting - wait between API calls
        await this.delay(this.rateLimitDelay);

      } catch (error) {
        console.error(`Failed to fetch ${stage.name} for webinar ${webinarId}:`, error);
        // Continue with next stage even if this one fails
      }
    }

    // Save all data to database
    if (webinarData) {
      await BatchOperations.syncCompleteWebinarData(
        webinarData,
        registrants,
        participants,
        polls,
        qa,
        connectionId
      );
    } else {
      throw new Error('Failed to fetch webinar details');
    }

    // Mark webinar as completed
    await this.progressTracker.updateSyncStage(syncLogId, webinarId, 'completed', 100);
  }

  /**
   * Retry API calls with exponential backoff
   */
  private async retryApiCall<T>(apiCall: () => Promise<T>): Promise<T> {
    let lastError: Error;

    for (let attempt = 0; attempt < this.maxRetries; attempt++) {
      try {
        return await apiCall();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');
        
        if (attempt === this.maxRetries - 1) {
          throw lastError;
        }

        // Exponential backoff: 1s, 2s, 4s
        const delay = this.baseRetryDelay * Math.pow(2, attempt);
        console.log(`API call failed, retrying in ${delay}ms. Attempt ${attempt + 1}/${this.maxRetries}`);
        await this.delay(delay);
      }
    }

    throw lastError!;
  }

  /**
   * Utility: Delay execution
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
