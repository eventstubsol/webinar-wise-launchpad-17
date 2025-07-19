
/**
 * Zoom credentials and authentication types
 */

/** Zoom OAuth app credentials for Server-to-Server authentication */
export interface ZoomCredentials {
  account_id: string;
  client_id: string;
  client_secret: string;
  app_type?: 'server_to_server' | 'oauth';
  description?: string;
}

/** Zoom OAuth scopes */
export interface ZoomScopes {
  webinar: boolean;
  meeting: boolean;
  user: boolean;
  recording: boolean;
  report: boolean;
}
