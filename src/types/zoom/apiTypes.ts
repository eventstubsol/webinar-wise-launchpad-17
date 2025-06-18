
/**
 * Enhanced Zoom API response types with all missing fields
 */

/** OAuth token exchange response from Zoom */
export interface ZoomTokenResponse {
  access_token: string;
  token_type: string;
  refresh_token: string;
  expires_in: number;
  scope: string;
}

/** User information from Zoom API */
export interface ZoomUserResponse {
  id: string;
  account_id: string;
  first_name: string;
  last_name: string;
  email: string;
  type: number;
  role_name: string;
  account_type: string;
  status: string;
  timezone: string;
}

/** Enhanced webinar data from Zoom API with all missing fields */
export interface ZoomWebinarResponse {
  id: string;
  uuid: string;
  host_id: string;
  host_email: string;
  topic: string;
  agenda: string;
  type: number;
  status: string;
  start_time: string;
  duration: number;
  timezone: string;
  join_url: string;
  registration_url?: string;
  
  // ADD MISSING: Start URL and access fields
  start_url?: string;
  
  // ADD MISSING: Password and security fields
  password?: string;
  encrypted_passcode?: string;
  encrypted_password?: string; // Alternative field name
  h323_password?: string;
  h323_passcode?: string;
  pstn_password?: string;
  
  // ADD MISSING: Creation metadata
  created_at?: string;
  creation_source?: 'other' | 'open_api' | 'web_portal';
  
  // ADD MISSING: Simulive fields
  is_simulive?: boolean;
  record_file_id?: string;
  transition_to_live?: boolean;
  
  // ADD MISSING: Occurrence for recurring webinars
  occurrence_id?: string;
  
  settings: {
    approval_type: number;
    registration_type: number;
    alternative_hosts: string;
    registrants_restrict_number?: number;
    host_video?: boolean;
    panelists_video?: boolean;
    practice_session?: boolean;
    hd_video?: boolean;
    audio?: string;
    auto_recording?: string;
    close_registration?: boolean;
    show_share_button?: boolean;
    allow_multiple_devices?: boolean;
    on_demand?: boolean;
    global_dial_in_countries?: string[];
    contact_name?: string;
    contact_email?: string;
    post_webinar_survey?: boolean;
    survey_url?: string;
    registrants_email_notification?: boolean;
    meeting_authentication?: boolean;
    authentication_option?: string;
    authentication_domains?: string;
    [key: string]: any;
  };
  occurrences?: Array<{
    occurrence_id: string;
    start_time: string;
    duration: number;
    status: string;
  }>;
  recurrence?: any;
  tracking_fields?: any;
  panelists?: any[];
}

/** Enhanced participant data from Zoom API */
export interface ZoomParticipantResponse {
  id: string;
  user_id?: string;
  name: string;
  user_email?: string;
  participant_email?: string; // Alternative field name
  join_time: string;
  leave_time?: string;
  duration?: number;
  attentiveness_score?: number;
  
  // Enhanced engagement fields
  answered_polling?: boolean;
  asked_question?: boolean;
  posted_chat?: boolean;
  raised_hand?: boolean;
  
  details: Array<{
    device: string;
    ip_address: string;
    location: string;
    network_type: string;
    version: string;
    [key: string]: any;
  }>;
}

/** Generic paginated response from Zoom API */
export interface ZoomPaginatedResponse<T> {
  page_count: number;
  page_number: number;
  page_size: number;
  total_records: number;
  next_page_token?: string;
  [key: string]: T[] | number | string | undefined;
}

/** Enhanced error response from Zoom API */
export interface ZoomErrorResponse {
  code: number;
  message: string;
  errors?: Array<{
    field: string;
    message: string;
  }>;
}
