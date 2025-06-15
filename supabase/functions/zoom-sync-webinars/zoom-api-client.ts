import { SimpleTokenEncryption } from './encryption.ts';

export async function validateZoomConnection(connection: any): Promise<boolean> {
  try {
    if (!connection.access_token) {
      console.error('No access token found in connection');
      return false;
    }

    // Check if token is expired
    const expiresAt = new Date(connection.token_expires_at);
    const now = new Date();
    const bufferTime = 5 * 60 * 1000; // 5 minutes buffer

    if (now.getTime() >= (expiresAt.getTime() - bufferTime)) {
      console.error('Access token has expired');
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error validating Zoom connection:', error);
    return false;
  }
}

export async function createZoomAPIClient(connection: any, supabase: any) {
  let accessToken;
  try {
    accessToken = await SimpleTokenEncryption.decryptToken(connection.access_token, connection.user_id);
  } catch (error) {
    console.log('Token decryption failed, assuming plain text token:', error.message);
    accessToken = connection.access_token;
  }

  return new ZoomAPIClient(connection, supabase, accessToken);
}

class ZoomAPIClient {
  private connection: any;
  private supabase: any;
  private accessToken: string;
  private baseURL = 'https://api.zoom.us/v2';

  constructor(connection: any, supabase: any, accessToken: string) {
    this.connection = connection;
    this.supabase = supabase;
    this.accessToken = accessToken;
  }

  private async refreshToken() {
    console.log(`Attempting to refresh token for connection: ${this.connection.id}`);
    const { data, error } = await this.supabase.functions.invoke('zoom-token-refresh', {
        body: { connectionId: this.connection.id }
    });

    if (error) {
      console.error(`Token refresh invocation failed for connection ${this.connection.id}:`, error);
      throw new Error('Token refresh failed. Please re-authenticate.');
    }

    this.connection = data.connection;
    this.accessToken = await SimpleTokenEncryption.decryptToken(data.connection.access_token, this.connection.user_id);
    console.log(`Token refreshed successfully for connection: ${this.connection.id}`);
  }

  private async makeRequest(endpoint: string, options: RequestInit = {}, retryCount = 0): Promise<any> {
    const url = `${this.baseURL}${endpoint}`;
    
    const response = await fetch(url, {
      ...options,
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      if (response.status === 401 && retryCount < 1) {
        console.log(`Received 401 for ${endpoint}. Attempting token refresh.`);
        try {
          await this.refreshToken();
          // Retry the request with the new token
          return await this.makeRequest(endpoint, options, retryCount + 1);
        } catch (refreshError) {
          console.error(`Refresh token flow failed for ${endpoint}:`, refreshError.message);
          // If refresh fails, throw the original error
        }
      }

      const errorText = await response.text();
      console.error(`Zoom API error (${response.status}):`, errorText);
      const error = new Error(`Zoom API request failed: ${response.status} ${response.statusText}`);
      // Attach status for better error handling upstream
      (error as any).status = response.status;
      try {
        (error as any).body = JSON.parse(errorText);
      } catch {
        (error as any).body = { message: errorText };
      }
      throw error;
    }

    // Handle cases where response might be empty
    const responseText = await response.text();
    return responseText ? JSON.parse(responseText) : {};
  }

  async getWebinar(webinarId: string): Promise<any> {
    return await this.makeRequest(`/webinars/${webinarId}`);
  }

  async listWebinars(options: { from?: Date } = {}): Promise<any[]> {
    let endpoint = '/users/me/webinars?page_size=300';
    
    if (options.from) {
      endpoint += `&from=${options.from.toISOString()}`;
    }

    const response = await this.makeRequest(endpoint);
    return response.webinars || [];
  }

  async getWebinarRegistrants(webinarId: string): Promise<any[]> {
    try {
      const response = await this.makeRequest(`/webinars/${webinarId}/registrants?page_size=300`);
      return response.registrants || [];
    } catch (error) {
      console.log(`No registrants for webinar ${webinarId}`);
      return [];
    }
  }

  async getWebinarParticipants(webinarId: string): Promise<any[]> {
    try {
      const response = await this.makeRequest(`/report/webinars/${webinarId}/participants?page_size=300`);
      return response.participants || [];
    } catch (error) {
      console.log(`No participants for webinar ${webinarId}`);
      return [];
    }
  }

  async getWebinarPolls(webinarId: string): Promise<any[]> {
    try {
      const response = await this.makeRequest(`/report/webinars/${webinarId}/polls`);
      return response.questions || [];
    } catch (error) {
      console.log(`No polls for webinar ${webinarId}`);
      return [];
    }
  }

  async getWebinarQA(webinarId: string): Promise<any[]> {
    try {
      const response = await this.makeRequest(`/report/webinars/${webinarId}/qa`);
      return response.questions || [];
    } catch (error) {
      console.log(`No Q&A for webinar ${webinarId}`);
      return [];
    }
  }
}
