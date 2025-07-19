import { ZoomWebinarService } from '../api/ZoomWebinarService';
import { ZoomConnectionService } from '../ZoomConnectionService';
import { BatchOperations } from '../operations/crud/BatchOperations';
import { SyncOperation, SyncProgress } from './types';
import { SyncType } from '@/types/zoom';
import { SequentialSyncExecutor } from './SequentialSyncExecutor';

/**
 * Main sync executor that delegates to sequential processor
 * Maintains backward compatibility while using enhanced sequential processing
 */
export class SyncExecutor {
  private sequentialExecutor: SequentialSyncExecutor;

  constructor() {
    this.sequentialExecutor = new SequentialSyncExecutor();
  }

  /**
   * Execute a sync operation using sequential processing
   */
  async executeSync(operation: SyncOperation, signal: AbortSignal): Promise<void> {
    // Delegate to the new sequential executor
    return this.sequentialExecutor.executeSync(operation, signal);
  }

  /**
   * @deprecated Use executeSync with SyncType.INITIAL instead
   */
  async executeInitialSync(
    operation: SyncOperation,
    syncLogId: string,
    signal: AbortSignal
  ): Promise<void> {
    console.warn('executeInitialSync is deprecated. Use executeSync instead.');
    return this.executeSync(operation, signal);
  }

  /**
   * @deprecated Use executeSync with SyncType.INCREMENTAL instead
   */
  async executeIncrementalSync(
    operation: SyncOperation,
    syncLogId: string,
    signal: AbortSignal
  ): Promise<void> {
    console.warn('executeIncrementalSync is deprecated. Use executeSync instead.');
    return this.executeSync(operation, signal);
  }

  /**
   * @deprecated Use executeSync with SyncType.MANUAL instead
   */
  async executeSingleWebinarSync(
    operation: SyncOperation,
    syncLogId: string,
    signal: AbortSignal
  ): Promise<void> {
    console.warn('executeSingleWebinarSync is deprecated. Use executeSync instead.');
    return this.executeSync(operation, signal);
  }

  /**
   * Utility: Create batches from array (kept for compatibility)
   */
  private createBatches<T>(array: T[], batchSize: number): T[][] {
    const batches: T[][] = [];
    for (let i = 0; i < array.length; i += batchSize) {
      batches.push(array.slice(i, i + batchSize));
    }
    return batches;
  }

  /**
   * Utility: Delay execution (kept for compatibility)
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
