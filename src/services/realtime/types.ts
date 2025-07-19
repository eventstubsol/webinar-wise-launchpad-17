
export interface WebSocketMessage {
  type: string;
  data: any;
  timestamp: string;
  channel?: string;
}

export interface WebSocketSubscription {
  id: string;
  channel: string;
  callback: (message: WebSocketMessage) => void;
}

export interface ProcessingTask {
  id: string;
  task_type: string;
  task_data: any;
  priority: number;
  status: string;
  retry_count: number;
  max_retries: number;
  webinar_id?: string;
  user_id?: string;
  progress?: number;
  error_message?: string;
}

export interface AnalyticsEvent {
  id: string;
  event_type: string;
  event_data: any;
  timestamp: string;
}

export interface CacheEntry {
  cache_key: string;
  cache_data: any;
  cache_version: number;
  expires_at: string;
}

export interface ConnectionHealth {
  isConnected: boolean;
  lastHeartbeat: string | null;
  reconnectAttempts: number;
}

export interface LiveAlert {
  id: string;
  type: 'warning' | 'info' | 'success' | 'error';
  message: string;
  timestamp: string;
  webinarId?: string;
  dismissed?: boolean;
}

export interface RealtimeDashboardData {
  participants: any[];
  polls: any[];
  qna: any[];
  engagement: any;
  insights: any[];
  lastUpdated: string;
}
