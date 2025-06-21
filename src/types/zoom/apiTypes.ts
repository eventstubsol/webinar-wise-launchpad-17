
/**
 * Zoom API response types
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

/** Webinar data from Zoom API */
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
  settings: {
    approval_type: number;
    registration_type: number;
    alternative_hosts: string;
    [key: string]: any;
  };
  occurrences?: Array<{
    occurrence_id: string;
    start_time: string;
    duration: number;
    status: string;
  }>;
}

/** Participant data from Zoom API */
export interface ZoomParticipantResponse {
  id: string;
  user_id?: string;
  name: string;
  user_email?: string;
  join_time: string;
  leave_time?: string;
  duration?: number;
  attentiveness_score?: number;
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
