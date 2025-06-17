
export const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

export const SYNC_PRIORITIES: { [key: string]: number } = {
  single: 1,
  incremental: 2,
  initial: 3,
  participants_only: 2
};

export interface SyncRequest {
  connectionId: string;
  syncType: 'initial' | 'incremental' | 'single' | 'participants_only';
  webinarId?: string;
  options?: Record<string, any>;
}

export interface SyncOperation {
  id: string;
  connectionId: string;
  userId: string;
  syncType: 'initial' | 'incremental' | 'single' | 'participants_only';
  webinarId?: string;
  options: Record<string, any>;
  priority: number;
  createdAt: Date;
}
