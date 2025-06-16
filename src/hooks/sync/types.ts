
export interface SyncError {
  id: string;
  message: string;
  code?: string;
  timestamp: string;
  dismissible: boolean;
}

export interface SyncHistoryEntry {
  id: string;
  type: import('@/types/zoom').SyncType;
  status: import('@/types/zoom').SyncStatus;
  startedAt: string;
  completedAt?: string;
  totalItems: number;
  itemsProcessed: number; // Changed from processedItems to itemsProcessed
  duration?: number;
}

export interface UseSyncProgressReturn {
  isActive: boolean;
  progress: number; // 0-100
  status: import('@/types/zoom').SyncStatus | null;
  currentOperation: string;
  processedItems: number;
  totalItems: number;
  estimatedTimeRemaining: number | null;
  errors: SyncError[];
  startSync: (type: import('@/types/zoom').SyncType, options?: { webinarId?: string }) => Promise<void>;
  cancelSync: () => Promise<void>;
  dismissError: (errorId: string) => void;
  syncHistory: SyncHistoryEntry[];
  isConnected: boolean;
}
