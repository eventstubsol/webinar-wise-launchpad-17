
export interface OAuthRequest {
  code: string;
  state?: string;
  redirectUri?: string;
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  scope?: string;
}

export interface ZoomUser {
  id: string;
  email: string;
  account_id?: string;
  type: number;
}

export interface ConnectionData {
  user_id: string;
  zoom_user_id: string;
  zoom_account_id: string;
  zoom_email: string;
  access_token: string;
  refresh_token: string;
  token_expires_at: string;
  connection_status: string;
  scopes: string[];
  is_primary: boolean;
  auto_sync_enabled: boolean;
  sync_frequency_hours: number;
  zoom_account_type: string;
}
