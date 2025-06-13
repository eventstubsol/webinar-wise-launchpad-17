
/**
 * Database types for Zoom participants and engagement data
 */

/** Participant attendance and engagement data */
export interface ZoomParticipant {
  id: string;
  webinar_id: string;
  participant_id: string;
  registrant_id: string | null;
  participant_name: string;
  participant_email: string | null;
  participant_user_id: string | null;
  join_time: string;
  leave_time: string | null;
  duration: number | null;
  attentiveness_score: number | null;
  camera_on_duration: number | null;
  share_application_duration: number | null;
  share_desktop_duration: number | null;
  posted_chat: boolean | null;
  raised_hand: boolean | null;
  answered_polling: boolean | null;
  asked_question: boolean | null;
  device: string | null;
  ip_address: unknown | null;
  location: string | null;
  network_type: string | null;
  version: string | null;
  customer_key: string | null;
  created_at: string | null;
  updated_at: string | null;
}
