
import { SyncOperation } from './types';
import { SyncType } from '@/types/zoom';
import { EnhancedSyncProgressTracker } from './EnhancedSyncProgressTracker';
import { 
  executeInitialSync, 
  executeIncrementalSync, 
  executeSingleWebinarSync 
} from './processors/SyncStrategyExecutor';

/**
 * Sequential webinar sync executor that orchestrates different sync strategies.
 */
export class SequentialSyncExecutor {
  private progressTracker: EnhancedSyncProgressTracker;

  constructor() {
    this.progressTracker = new EnhancedSyncProgressTracker();
  }

  /**
   * Execute a sync operation by delegating to the appropriate strategy executor.
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
          await executeInitialSync(operation, syncLogId, this.progressTracker, signal);
          break;
        case SyncType.INCREMENTAL:
          await executeIncrementalSync(operation, syncLogId, this.progressTracker, signal);
          break;
        case SyncType.MANUAL:
          if (operation.options?.webinarId) {
            await executeSingleWebinarSync(operation, syncLogId, this.progressTracker, signal);
          }
          break;
      }

      await this.progressTracker.completeSyncLog(syncLogId);
    } catch (error) {
      if (error instanceof Error && error.message === 'Sync cancelled') {
        // Handle cancellation gracefully
        await this.progressTracker.updateSyncLog(syncLogId, { sync_status: 'cancelled', completed_at: new Date().toISOString() });
        console.log(`Sync ${syncLogId} cancelled.`);
      } else {
        await this.progressTracker.failSyncLog(syncLogId, error);
      }
      // Re-throw to be handled by the caller (e.g., job queue)
      throw error;
    }
  }
}
