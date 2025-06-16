/**
 * Database types for Zoom webinars and related data
 */

import { WebinarStatus, RegistrantStatus, RecordingType, RecordingStatus } from './enums';
import { CustomQuestion } from './jsonTypes';

/** Webinar metadata and configuration */
export interface ZoomWebinar {
  id: string;
  connection_id: string;
  webinar_id: string;
  webinar_uuid: string;
  host_id: string;
  host_email: string | null;
  topic: string;
  agenda: string | null;
  type: number;
  status: WebinarStatus | null;
  start_time: string | null;
  duration: number | null;
  timezone: string | null;
  registration_required: boolean | null;
  registration_type: number | null;
  registration_url: string | null;
  join_url: string | null;
  approval_type: number | null;
  alternative_hosts: string[] | null;
  max_registrants: number | null;
  max_attendees: number | null;
  occurrence_id: string | null;
  total_registrants: number | null;
  total_attendees: number | null;
  total_minutes: number | null;
  avg_attendance_duration: number | null;
  synced_at: string | null;
  created_at: string | null;
  updated_at: string | null;
  password?: string | null;
  h323_password?: string | null;
  pstn_password?: string | null;
  encrypted_password?: string | null;
  settings?: Record<string, any> | null;
  tracking_fields?: Record<string, any>[] | null;
  recurrence?: Record<string, any> | null;
  occurrences?: Record<string, any>[] | null;
  // New fields based on Zoom API schema
  start_url?: string | null;
  encrypted_passcode?: string | null;
  creation_source?: string | null;
  is_simulive?: boolean | null;
  record_file_id?: string | null;
  transition_to_live?: boolean | null;
  webinar_created_at?: string | null;
}

/** Webinar registrant information */
export interface ZoomRegistrant {
  id: string;
  webinar_id: string;
  registrant_id: string;
  registrant_email: string;
  first_name: string | null;
  last_name: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  country: string | null;
  phone: string | null;
  comments: string | null;
  custom_questions: CustomQuestion[] | null;
  registration_time: string;
  source_id: string | null;
  tracking_source: string | null;
  status: RegistrantStatus | null;
  join_time: string | null;
  leave_time: string | null;
  duration: number | null;
  attended: boolean | null;
  created_at: string | null;
  updated_at: string | null;
  job_title?: string | null;
  purchasing_time_frame?: string | null;
  role_in_purchase_process?: string | null;
  no_of_employees?: string | null;
  industry?: string | null;
  org?: string | null;
  language?: string | null;
  // New fields added from Zoom API alignment
  join_url?: string | null;
  create_time?: string | null;
}

/** Recording files and metadata */
export interface ZoomRecording {
  id: string;
  webinar_id: string;
  recording_id: string;
  recording_uuid: string;
  recording_type: RecordingType | null;
  recording_start: string;
  recording_end: string;
  file_type: string | null;
  file_size: number | null;
  play_url: string | null;
  download_url: string | null;
  password: string | null;
  status: RecordingStatus | null;
  total_views: number | null;
  total_downloads: number | null;
  expires_at: string | null;
  created_at: string | null;
  updated_at: string | null;
}

/** Panelist information for a webinar */
export interface ZoomPanelist {
  id: string;
  webinar_id: string;
  panelist_id?: string;
  panelist_email?: string;
  name?: string;
  join_url?: string;
  created_at: string;
}

/** Chat message from a webinar */
export interface ZoomChatMessage {
  id: string;
  webinar_id: string;
  sender_name?: string;
  sender_email?: string;
  message?: string;
  sent_at?: string;
  created_at: string;
}

/** Tracking source information for a webinar */
export interface ZoomWebinarTracking {
  id: string;
  webinar_id: string;
  source_name?: string;
  tracking_url?: string;
  visitor_count?: number;
  registration_count?: number;
  created_at: string;
}
