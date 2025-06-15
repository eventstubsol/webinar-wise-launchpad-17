
export interface RefreshTokenRequest {
  connectionId: string;
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  scope: string;
}

export interface ConnectionUpdate {
  access_token: string;
  refresh_token: string;
  token_expires_at: string;
  updated_at: string;
}
