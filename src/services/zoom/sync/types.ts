
import { SyncType, SyncStatus, ZoomSyncLog } from '@/types/zoom';

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
export interface SyncErrorDetailsJson {
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
