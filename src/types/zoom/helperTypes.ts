
/**
 * Helper types for analytics and business logic
 */

import { ZoomWebinar } from './databaseTypes';
import { SyncType, SyncStatus } from './enums';

/** Webinar with calculated engagement metrics */
export interface WebinarWithStats extends ZoomWebinar {
  registration_conversion_rate: number;
  attendance_rate: number;
  average_engagement_score: number;
  poll_participation_rate: number;
  qa_participation_rate: number;
  total_questions_asked: number;
  total_polls_answered: number;
}

/** Participant engagement summary */
export interface ParticipantEngagement {
  participant_id: string;
  participant_name: string;
  participant_email: string | null;
  total_duration: number;
  engagement_score: number;
  polls_answered: number;
  questions_asked: number;
  chat_messages: number;
  hand_raises: number;
  camera_usage_percent: number;
  webinars_attended: number;
}

/** Real-time sync progress information */
export interface SyncProgress {
  sync_id: string;
  connection_id: string;
  sync_type: SyncType;
  status: SyncStatus;
  progress_percent: number;
  current_operation: string;
  total_items: number;
  processed_items: number;
  failed_items: number;
  estimated_time_remaining?: number;
  started_at: string;
  last_updated: string;
}

/** Connection health and status summary */
export interface ConnectionHealth {
  connection_id: string;
  is_healthy: boolean;
  token_expires_in_hours: number;
  last_successful_sync: string | null;
  consecutive_failures: number;
  rate_limit_remaining: number;
  next_sync_scheduled: string | null;
  issues: string[];
}

/** Webinar analytics dashboard summary */
export interface WebinarAnalyticsSummary {
  total_webinars: number;
  total_registrants: number;
  total_attendees: number;
  average_attendance_rate: number;
  average_engagement_score: number;
  most_popular_webinar: {
    id: string;
    topic: string;
    attendees: number;
  } | null;
  recent_webinars: Array<{
    id: string;
    topic: string;
    start_time: string;
    attendees: number;
    engagement_score: number;
  }>;
  engagement_trends: Array<{
    date: string;
    average_duration: number;
    attendance_rate: number;
    poll_participation: number;
  }>;
}
