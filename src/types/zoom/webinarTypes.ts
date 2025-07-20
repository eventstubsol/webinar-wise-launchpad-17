
/**
 * Database types for Zoom webinar data and related entities
 */

import { WebinarStatus, WebinarType, ApprovalType } from './enums';
import { WebinarSettings, RegistrantInfo, RecordingInfo, PanelistInfo, ChatMessageInfo, TrackingInfo } from './jsonTypes';

/** Core webinar entity from Zoom API - Updated to match actual database schema */
export interface ZoomWebinar {
  id: string;
  connection_id: string;
  webinar_id: string;
  uuid: string | null; // Fixed: mapped to database 'uuid' field
  webinar_uuid: string | null; // Keep for backward compatibility
  occurrence_id: string | null; // Added missing field from database
  host_id: string | null;
  host_email: string | null;
  topic: string;
  agenda: string | null;
  type: WebinarType | null;
  status: WebinarStatus | null;
  start_time: string | null;
  duration: number | null;
  timezone: string | null;
  
  // Database creation tracking
  webinar_created_at: string | null; // Added missing field
  created_at: string | null;
  updated_at: string | null;
  created_at_db: string | null; // Added missing database field
  updated_at_db: string | null; // Added missing database field
  
  // Access and registration
  registration_required: boolean | null;
  registration_url: string | null;
  join_url: string | null;
  start_url: string | null;
  password: string | null;
  approval_type: ApprovalType | null;
  max_registrants: number | null;
  max_attendees: number | null; // Added missing field
  
  // Updated field names to match Zoom API and database
  h323_passcode: string | null; // Updated field name
  pstn_password: string | null; // Updated field name  
  encrypted_passcode: string | null; // Updated field name
  
  // New Zoom API fields
  registration_type: number | null;
  pmi: number | null;
  webinar_passcode: string | null;
  
  // Computed metrics fields
  attendees_count: number | null;
  registrants_count: number | null;
  total_registrants: number | null; // Added missing field
  total_attendees: number | null; // Added missing field
  total_absentees: number | null; // Added missing field
  total_minutes: number | null; // Added missing field
  avg_attendance_duration: number | null; // Added missing field
  
  // JSONB fields
  settings: WebinarSettings | null;
  recurrence: any | null; // JSON type
  occurrences: any | null; // JSON type
  tracking_fields: TrackingInfo | null;
  panelists: PanelistInfo[] | null;
  
  // Simulive and recording fields
  is_simulive: boolean | null; // Added missing field
  simulive_webinar_id: string | null; // Added missing field
  
  // Sync tracking fields
  synced_at: string | null;
  last_synced_at: string | null; // Added missing field
  participant_sync_status: 'not_applicable' | 'pending' | 'synced' | 'failed' | 'no_participants' | null;
  participant_sync_attempted_at: string | null;
  participant_sync_completed_at: string | null; // Added missing field
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
