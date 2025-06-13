
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
