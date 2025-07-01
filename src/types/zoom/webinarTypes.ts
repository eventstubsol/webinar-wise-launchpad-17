/**
 * Database types for Zoom webinar data and related entities
 * Updated to match simplified database structure
 */

import { WebinarStatus, WebinarType, ApprovalType } from './enums';
import { WebinarSettings, RegistrantInfo, RecordingInfo, PanelistInfo, ChatMessageInfo, TrackingInfo } from './jsonTypes';

/** 
 * Core webinar entity from database - matches simplified zoom_webinars table 
 * This matches the Zoom API structure exactly
 */
export interface ZoomWebinar {
  // Primary key
  id: string;
  
  // Relationship
  connection_id: string;
  
  // Core Zoom fields (from API)
  zoom_webinar_id: string;
  uuid: string | null;
  host_id: string;
  host_email: string;
  topic: string;
  type: number; // 5=webinar, 6=recurring no fixed time, 9=recurring fixed time
  start_time: string;
  duration: number; // in minutes
  timezone: string;
  agenda: string | null;
  created_at: string;
  
  // URLs
  start_url: string | null;
  join_url: string;
  registration_url: string | null;
  
  // Authentication
  password: string | null;
  h323_password: string | null;
  pstn_password: string | null;
  encrypted_password: string | null;
  
  // Status
  status: WebinarStatus;
  
  // JSON fields for complex data
  settings: WebinarSettings | null;
  recurrence: any | null;
  occurrences: any | null;
  tracking_fields: TrackingInfo[] | null;
  
  // Metrics (from API)
  registrants_count: number;
  
  // Sync metadata
  synced_at: string;
  updated_at: string;
  
  // Metrics from join (optional - only present when joined with webinar_metrics)
  metrics?: WebinarMetrics;
  
  // Backward compatibility fields (populated from metrics join)
  total_attendees?: number;
  unique_attendees?: number;
  total_absentees?: number;
  actual_participant_count?: number;
  total_minutes?: number;
  avg_attendance_duration?: number;
  participant_sync_status?: string;
  participant_sync_attempted_at?: string | null;
  participant_sync_completed_at?: string | null;
  participant_sync_error?: string | null;
}

/**
 * Webinar metrics - calculated data stored separately
 */
export interface WebinarMetrics {
  id: string;
  webinar_id: string;
  
  // Participant counts
  total_attendees: number;
  unique_attendees: number;
  total_absentees: number;
  actual_participant_count: number;
  
  // Time metrics
  total_minutes: number;
  avg_attendance_duration: number;
  
  // Sync status
  participant_sync_status: string;
  participant_sync_attempted_at: string | null;
  participant_sync_completed_at: string | null;
  participant_sync_error: string | null;
  
  // Timestamps
  created_at: string;
  updated_at: string;
}

/** Webinar registrant information */
export interface ZoomRegistrant {
  id: string;
  webinar_id: string;
  registrant_id: string;
  registrant_uuid: string | null;
  registrant_email: string;
  first_name: string | null;
  last_name: string | null;
  address: string | null;
  city: string | null;
  country: string | null;
  zip: string | null;
  state: string | null;
  phone: string | null;
  industry: string | null;
  org: string | null;
  job_title: string | null;
  purchasing_time_frame: string | null;
  role_in_purchase_process: string | null;
  no_of_employees: string | null;
  comments: string | null;
  status: string | null;
  create_time: string | null;
  join_url: string | null;
  custom_questions: RegistrantInfo | null;
  created_at: string | null;
  updated_at: string | null;
}

/** Webinar recording information */
export interface ZoomRecording {
  id: string;
  webinar_id: string;
  recording_id: string;
  recording_uuid: string | null;
  account_id: string | null;
  host_id: string | null;
  topic: string | null;
  type: string | null;
  start_time: string | null;
  duration: number | null;
  share_url: string | null;
  total_size: number | null;
  recording_count: number | null;
  recording_files: RecordingInfo[] | null;
  password: string | null;
  created_at: string | null;
  updated_at: string | null;
}

/** Webinar panelist information */
export interface ZoomPanelist {
  id: string;
  webinar_id: string;
  panelist_id: string;
  name: string | null;
  email: string | null;
  join_url: string | null;
  created_at: string | null;
  updated_at: string | null;
}

/** Webinar chat message */
export interface ZoomChatMessage {
  id: string;
  webinar_id: string;
  message_id: string;
  sender: string | null;
  message: string | null;
  timestamp: string | null;
  message_type: string | null;
  created_at: string | null;
}

/** Webinar tracking information */
export interface ZoomWebinarTracking {
  id: string;
  webinar_id: string;
  tracking_field: string;
  tracking_value: string | null;
  created_at: string | null;
}

// Backward compatibility types
export type ZoomWebinarWithMetrics = ZoomWebinar & {
  total_attendees: number;
  unique_attendees: number;
  total_absentees: number;
  actual_participant_count: number;
  total_minutes: number;
  avg_attendance_duration: number;
  participant_sync_status: string;
  participant_sync_attempted_at: string | null;
  participant_sync_completed_at: string | null;
  participant_sync_error: string | null;
};
