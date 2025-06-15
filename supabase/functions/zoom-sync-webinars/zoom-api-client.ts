
import { SimpleTokenEncryption } from './encryption.ts';

export async function validateZoomConnection(connection: any): Promise<boolean> {
  console.log(`Validating Zoom connection: ${connection.id}`);
  
  try {
    if (!connection.access_token) {
      console.error('No access token found in connection');
      return false;
    }

    if (!connection.refresh_token) {
      console.error('No refresh token found in connection');
      return false;
    }

    // Check if token is expired
    const expiresAt = new Date(connection.token_expires_at);
    const now = new Date();
    const bufferTime = 5 * 60 * 1000; // 5 minutes buffer

    if (now.getTime() >= (expiresAt.getTime() - bufferTime)) {
      console.log('Access token has expired, will need refresh');
      return true; // Still valid for refresh
    }

    console.log('Connection validation successful');
    return true;
  } catch (error) {
    console.error('Error validating Zoom connection:', error);
    return false;
  }
}

export async function createZoomAPIClient(connection: any, supabase: any) {
  console.log(`Creating Zoom API client for connection: ${connection.id}`);
  
  let accessToken;
  let refreshToken;
  
  try {
    accessToken = await SimpleTokenEncryption.decryptToken(connection.access_token, connection.user_id);
    refreshToken = await SimpleTokenEncryption.decryptToken(connection.refresh_token, connection.user_id);
    console.log('Tokens decrypted successfully');
  } catch (error) {
    console.log('Token decryption failed, assuming plain text tokens:', error.message);
    accessToken = connection.access_token;
    refreshToken = connection.refresh_token;
  }

  return new ZoomAPIClient(connection, supabase, accessToken, refreshToken);
}

class ZoomAPIClient {
  private connection: any;
  private supabase: any;
  private accessToken: string;
  private refreshToken: string;
  private baseURL = 'https://api.zoom.us/v2';

  constructor(connection: any, supabase: any, accessToken: string, refreshToken: string) {
    this.connection = connection;
    this.supabase = supabase;
    this.accessToken = accessToken;
    this.refreshToken = refreshToken;
  }

  private async refreshToken() {
    console.log(`Attempting to refresh token for connection: ${this.connection.id}`);
    
    try {
      const { data, error } = await this.supabase.functions.invoke('zoom-token-refresh', {
        body: { connectionId: this.connection.id }
      });

      if (error) {
        console.error(`Token refresh invocation failed for connection ${this.connection.id}:`, error);
        throw new Error('Token refresh failed. Please re-authenticate.');
      }

      if (!data?.connection) {
        console.error('Token refresh response missing connection data');
        throw new Error('Token refresh failed - invalid response.');
      }

      // Update our local connection data
      this.connection = data.connection;
      
      // Decrypt the new tokens
      try {
        this.accessToken = await SimpleTokenEncryption.decryptToken(data.connection.access_token, this.connection.user_id);
        console.log(`Token refreshed successfully for connection: ${this.connection.id}`);
      } catch (decryptError) {
        console.log('Using plain text token from refresh response');
        this.accessToken = data.connection.access_token;
      }
      
    } catch (error) {
      console.error(`Token refresh failed for connection ${this.connection.id}:`, error);
      throw error;
    }
  }

  private async makeRequest(endpoint: string, options: RequestInit = {}, retryCount = 0): Promise<any> {
    const url = `${this.baseURL}${endpoint}`;
    console.log(`Making Zoom API request: ${endpoint} (attempt ${retryCount + 1})`);
    
    // Check if token is expired before making request
    const expiresAt = new Date(this.connection.token_expires_at);
    const now = new Date();
    const bufferTime = 5 * 60 * 1000; // 5 minutes buffer

    if (now.getTime() >= (expiresAt.getTime() - bufferTime) && retryCount === 0) {
      console.log('Token is expired, refreshing before request');
      try {
        await this.refreshToken();
      } catch (refreshError) {
        console.error('Pre-emptive token refresh failed:', refreshError);
        const authError = new Error('Authentication expired. Please reconnect your Zoom account.');
        (authError as any).status = 401;
        (authError as any).isAuthError = true;
        throw authError;
      }
    }
    
    const response = await fetch(url, {
      ...options,
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    console.log(`Zoom API response: ${response.status} for ${endpoint}`);

    if (!response.ok) {
      if (response.status === 401 && retryCount < 1) {
        console.log(`Received 401 for ${endpoint}. Attempting token refresh.`);
        try {
          await this.refreshToken();
          // Retry the request with the new token
          return await this.makeRequest(endpoint, options, retryCount + 1);
        } catch (refreshError) {
          console.error(`Refresh token flow failed for ${endpoint}:`, refreshError.message);
          // If refresh fails, throw a specific auth error
          const authError = new Error('Authentication expired. Please reconnect your Zoom account.');
          (authError as any).status = 401;
          (authError as any).isAuthError = true;
          throw authError;
        }
      }

      const errorText = await response.text();
      console.error(`Zoom API error (${response.status}) for ${endpoint}:`, errorText);
      
      const error = new Error(`Zoom API request failed: ${response.status} ${response.statusText}`);
      (error as any).status = response.status;
      
      if (response.status === 401) {
        (error as any).isAuthError = true;
      }
      
      try {
        (error as any).body = JSON.parse(errorText);
      } catch {
        (error as any).body = { message: errorText };
      }
      
      throw error;
    }

    // Handle cases where response might be empty
    const responseText = await response.text();
    const result = responseText ? JSON.parse(responseText) : {};
    console.log(`Zoom API success for ${endpoint}:`, Object.keys(result));
    return result;
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
      console.log(`No registrants for webinar ${webinarId}:`, error.message);
      return [];
    }
  }

  async getWebinarParticipants(webinarId: string): Promise<any[]> {
    try {
      const response = await this.makeRequest(`/report/webinars/${webinarId}/participants?page_size=300`);
      return response.participants || [];
    } catch (error) {
      console.log(`No participants for webinar ${webinarId}:`, error.message);
      return [];
    }
  }

  async getWebinarPolls(webinarId: string): Promise<any[]> {
    try {
      const response = await this.makeRequest(`/report/webinars/${webinarId}/polls`);
      return response.questions || [];
    } catch (error) {
      console.log(`No polls for webinar ${webinarId}:`, error.message);
      return [];
    }
  }

  async getWebinarQA(webinarId: string): Promise<any[]> {
    try {
      const response = await this.makeRequest(`/report/webinars/${webinarId}/qa`);
      return response.questions || [];
    } catch (error) {
      console.log(`No Q&A for webinar ${webinarId}:`, error.message);
      return [];
    }
  }
}
