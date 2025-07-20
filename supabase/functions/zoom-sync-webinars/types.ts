
export const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

export const SYNC_PRIORITIES: { [key: string]: number } = {
  participants_only: 1, // Highest priority for testing
  single: 2,
  incremental: 3,
  initial: 4
};

export interface SyncRequest {
  connectionId: string;
  syncType: 'initial' | 'incremental' | 'single' | 'participants_only';
  webinarId?: string;
  webinarIds?: string[]; // For participants_only sync
  options?: Record<string, any>;
}

export interface SyncOperation {
  id: string;
  connectionId: string;
  userId: string;
  syncType: 'initial' | 'incremental' | 'single' | 'participants_only';
  webinarId?: string;
  webinarIds?: string[]; // For participants_only sync
  options: Record<string, any>;
  priority: number;
  createdAt: Date;
}
