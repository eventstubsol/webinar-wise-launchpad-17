
import { SyncOperation, SyncPriority } from './types';

/**
 * FIXED: Manages the sync operation queue with better controls and limits
 */
export class SyncQueueManager {
  private syncQueue: SyncOperation[] = [];
  private readonly maxConcurrentSyncs = 1; // Reduced from 2
  private readonly maxQueueSize = 10; // NEW: Prevent queue from growing indefinitely

  /**
   * FIXED: Add operation to priority queue with size limits
   */
  addToQueue(operation: SyncOperation): boolean {
    // Check if queue is full
    if (this.syncQueue.length >= this.maxQueueSize) {
      console.warn('Sync queue is full, rejecting operation:', operation.id);
      return false;
    }

    // Check for duplicate operations
    const existingOp = this.syncQueue.find(op => 
      op.connectionId === operation.connectionId && 
      op.type === operation.type &&
      !op.id.includes('retry') // Allow retries
    );

    if (existingOp) {
      console.log('Duplicate operation found, skipping:', operation.id);
      return false;
    }

    this.syncQueue.push(operation);
    this.syncQueue.sort((a, b) => a.priority - b.priority);
    console.log(`Added operation ${operation.id} to queue. Queue size: ${this.syncQueue.length}`);
    return true;
  }

  /**
   * Get next operation from queue
   */
  getNextOperation(): SyncOperation | undefined {
    const operation = this.syncQueue.shift();
    if (operation) {
      console.log(`Dequeued operation ${operation.id}. Remaining queue size: ${this.syncQueue.length}`);
    }
    return operation;
  }

  /**
   * Remove operation from queue
   */
  removeFromQueue(operationId: string): void {
    const initialLength = this.syncQueue.length;
    this.syncQueue = this.syncQueue.filter(op => op.id !== operationId);
    if (this.syncQueue.length < initialLength) {
      console.log(`Removed operation ${operationId} from queue. Queue size: ${this.syncQueue.length}`);
    }
  }

  /**
   * FIXED: Check if queue can accept more operations
   */
  canProcessMore(activeSyncCount: number): boolean {
    const canProcess = activeSyncCount < this.maxConcurrentSyncs && this.syncQueue.length > 0;
    if (!canProcess && this.syncQueue.length > 0) {
      console.log(`Cannot process more: active=${activeSyncCount}, max=${this.maxConcurrentSyncs}, queued=${this.syncQueue.length}`);
    }
    return canProcess;
  }

  /**
   * Get queue status
   */
  getStatus() {
    return {
      queuedOperations: this.syncQueue.length,
      maxQueueSize: this.maxQueueSize,
      operations: this.syncQueue.map(op => ({
        id: op.id,
        type: op.type,
        priority: op.priority,
        retryCount: op.options?.retryCount || 0
      }))
    };
  }

  /**
   * Check if queue has operations
   */
  hasOperations(): boolean {
    return this.syncQueue.length > 0;
  }

  /**
   * FIXED: Clear old operations to prevent queue buildup
   */
  clearOldOperations(): void {
    const cutoffTime = new Date();
    cutoffTime.setMinutes(cutoffTime.getMinutes() - 10); // Remove operations older than 10 minutes

    const initialLength = this.syncQueue.length;
    this.syncQueue = this.syncQueue.filter(op => op.createdAt > cutoffTime);
    
    if (this.syncQueue.length < initialLength) {
      console.log(`Cleared ${initialLength - this.syncQueue.length} old operations from queue`);
    }
  }
}
