
export interface WebinarMetrics {
  totalWebinars: number;
  totalRegistrants: number;
  totalAttendees: number;
  attendanceRate: number;
  totalEngagement: number;
  averageDuration: number;
  monthlyTrends: Array<{
    month: string;
    webinars: number;
    registrants: number;
    attendees: number;
  }>;
  recentWebinars: Array<{
    id: string;
    title: string;
    date: string;
    duration: number;
    attendees: number;
    registrants: number;
    attendanceRate: string;
  }>;
  upcomingWebinars: Array<{
    id: string;
    title: string;
    date: string;
    time: string;
    duration: number;
    registrants: number;
    status: string;
  }>;
  hasData: boolean;
  isEmpty: boolean;
  lastSyncAt?: string;
  syncHistoryCount: number;
}

export interface SyncHistoryData {
  completed_at?: string;
  sync_status: string;
}

export interface WebinarData {
  id: string;
  topic?: string;
  start_time?: string;
  duration?: number;
  zoom_registrants?: { count: number }[];
  zoom_participants?: { count: number }[];
}
