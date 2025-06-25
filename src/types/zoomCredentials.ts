
// Updated types to match the actual database schema

export interface ZoomCredentials {
  id: string;
  user_id: string;
  account_id: string;
  client_id: string;
  client_secret: string;
  app_name?: string;
  app_type: 'server_to_server' | 'oauth';
  description?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ZoomCredentialsInsert {
  user_id: string;
  account_id: string;
  client_id: string;
  client_secret: string;
  app_name?: string;
  app_type?: 'server_to_server' | 'oauth';
  description?: string;
  is_active?: boolean;
}

export interface ZoomCredentialsUpdate {
  account_id?: string;
  client_id?: string;
  client_secret?: string;
  app_name?: string;
  app_type?: 'server_to_server' | 'oauth';
  description?: string;
  is_active?: boolean;
}

export interface ZoomScopes {
  webinar: boolean;
  meeting: boolean;
  user: boolean;
  recording: boolean;
  report: boolean;
}
