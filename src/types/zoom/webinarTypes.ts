
/**
 * Database types for Zoom webinar data and related entities
 */

import { WebinarStatus, WebinarType, ApprovalType } from './enums';
import { WebinarSettings, RegistrantInfo, RecordingInfo, PanelistInfo, ChatMessageInfo, TrackingInfo } from './jsonTypes';

/** Core webinar entity from Zoom API - Updated to match actual database schema */
export interface ZoomWebinar {
  id: string;
  connection_id: string;
  webinar_id: string | null;
  zoom_webinar_id: string;
  uuid: string | null; // Fixed: mapped to database 'uuid' field
  webinar_uuid: string | null; // Keep for backward compatibility
  zoom_uuid: string | null;
  occurrence_id: string | null; // Added missing field from database
  host_id: string | null;
  host_email: string | null;
  topic: string;
  agenda: string | null;
  webinar_type: number;
  status: string;
  start_time: string;
  duration: number;
  timezone: string;
  
  // Database creation tracking
  webinar_created_at: string | null;
  created_at: string;
  updated_at: string;
  
  // Access and registration
  registration_type: number | null;
  registration_url: string | null;
  join_url: string;
  start_url: string | null;
  password: string | null;
  approval_type: number | null;
  registrants_restrict_number: number | null;
  
  // Security fields
  h323_passcode: string | null;
  encrypted_passcode: string | null;
  
  // Computed metrics fields
  // NOTE: attendees_count and registrants_count have been removed as they don't exist in the database
  // Use total_attendees and total_registrants instead
  total_registrants: number | null; // Added missing field
  total_attendees: number | null; // Added missing field
  total_absentees: number | null; // Added missing field
  total_minutes: number | null; // Added missing field
  avg_attendance_duration: number | null; // Added missing field
  
  // JSONB fields
  settings: any | null;
  recurrence: any | null;
  occurrences: any | null;
  tracking_fields: any | null;
  
  // Simulive and recording fields
  is_simulive: boolean | null;
  record_file_id: string | null;
  transition_to_live: boolean | null;
  creation_source: string | null;
  
  // Sync tracking fields
  synced_at: string;
  last_synced_at: string | null;
  participant_sync_status: string | null;
  participant_sync_attempted_at: string | null;
  participant_sync_completed_at: string | null;
  participant_sync_error: string | null;
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
