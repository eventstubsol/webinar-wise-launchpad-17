
import { SyncOperation, SyncPriority } from './types';

/**
 * Manages the sync operation queue with priority handling
 */
export class SyncQueueManager {
  private syncQueue: SyncOperation[] = [];
  private readonly maxConcurrentSyncs = 2;

  /**
   * Add operation to priority queue
   */
  addToQueue(operation: SyncOperation): void {
    this.syncQueue.push(operation);
    this.syncQueue.sort((a, b) => a.priority - b.priority);
  }

  /**
   * Get next operation from queue
   */
  getNextOperation(): SyncOperation | undefined {
    return this.syncQueue.shift();
  }

  /**
   * Remove operation from queue
   */
  removeFromQueue(operationId: string): void {
    this.syncQueue = this.syncQueue.filter(op => op.id !== operationId);
  }

  /**
   * Check if queue can accept more operations
   */
  canProcessMore(activeSyncCount: number): boolean {
    return activeSyncCount < this.maxConcurrentSyncs;
  }

  /**
   * Get queue status
   */
  getStatus() {
    return {
      queuedOperations: this.syncQueue.length,
      operations: this.syncQueue.map(op => ({
        id: op.id,
        type: op.type,
        priority: op.priority
      }))
    };
  }

  /**
   * Check if queue has operations
   */
  hasOperations(): boolean {
    return this.syncQueue.length > 0;
  }
}
