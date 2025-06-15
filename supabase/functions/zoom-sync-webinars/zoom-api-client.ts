
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

    console.log(`Token expires at: ${expiresAt.toISOString()}, Current time: ${now.toISOString()}`);

    if (now.getTime() >= (expiresAt.getTime() - bufferTime)) {
      console.log('Access token has expired or will expire soon, will need refresh');
      return true; // Still valid for refresh
    }

    console.log('Connection validation successful - token is valid');
    return true;
  } catch (error) {
    console.error('Error validating Zoom connection:', error);
    return false;
  }
}

export async function createZoomAPIClient(connection: any, supabase: any) {
  console.log(`Creating Zoom API client for connection: ${connection.id}`);
  console.log('Received connection object in createZoomAPIClient:', {
      id: connection.id,
      user_id: connection.user_id,
      has_access_token: !!connection.access_token,
      has_refresh_token: !!connection.refresh_token
  });
  
  let accessToken;
  let refreshToken;
  const isOAuth = !!connection.refresh_token;
  console.log(`Connection type determined as: ${isOAuth ? 'OAuth' : 'Server-to-Server / Legacy'}`);
  
  try {
    console.log('Attempting to decrypt access token...');
    accessToken = await SimpleTokenEncryption.decryptToken(connection.access_token, connection.user_id);
    console.log('Access token decryption result:', {
        success: true,
        length: accessToken.length,
        prefix: accessToken.substring(0, 10) + '...'
    });
    if (isOAuth) {
      console.log('Attempting to decrypt refresh token...');
      refreshToken = await SimpleTokenEncryption.decryptToken(connection.refresh_token, connection.user_id);
      console.log('Refresh token decryption result:', {
        success: true,
        length: refreshToken.length,
        prefix: refreshToken.substring(0, 10) + '...'
      });
    }
    console.log('Tokens processed for API client.');
  } catch (error) {
    console.log('Token decryption failed, assuming plain text tokens:', error.message);
    accessToken = connection.access_token;
    if (isOAuth) {
      refreshToken = connection.refresh_token;
    }
  }

  return new ZoomAPIClient(connection, supabase, accessToken, refreshToken, isOAuth);
}

class ZoomAPIClient {
  private connection: any;
  private supabase: any;
  private accessToken: string;
  private refreshTokenValue: string | undefined;
  private isOAuth: boolean;
  private baseURL = 'https://api.zoom.us/v2';

  constructor(connection: any, supabase: any, accessToken: string, refreshToken: string | undefined, isOAuth: boolean) {
    this.connection = connection;
    this.supabase = supabase;
    this.accessToken = accessToken;
    this.refreshTokenValue = refreshToken;
    this.isOAuth = isOAuth;
  }

  private async refreshTokens() {
    if (!this.isOAuth) {
      console.log(`Skipping token refresh for non-OAuth connection: ${this.connection.id}`);
      const authError = new Error('Cannot refresh token. Connection is not OAuth or refresh token is missing.');
      (authError as any).status = 401;
      (authError as any).isAuthError = true;
      throw authError;
    }
    
    console.log(`Attempting to refresh OAuth tokens for connection: ${this.connection.id}`);
    
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
        console.log('Attempting to decrypt new access token...');
        this.accessToken = await SimpleTokenEncryption.decryptToken(data.connection.access_token, this.connection.user_id);
        console.log(`Tokens refreshed successfully for connection: ${this.connection.id}`);
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
    
    let requestHeaders = {
      'Authorization': `Bearer ${this.accessToken}`,
      'Content-Type': 'application/json',
      ...options.headers,
    };
    
    console.log(`Making Zoom API request: ${endpoint} (attempt ${retryCount + 1})`, {
      url: url,
      hasAuthHeader: !!requestHeaders.Authorization,
      authHeaderLength: requestHeaders.Authorization?.length,
      tokenPrefixUsed: this.accessToken.substring(0, 10) + '...'
    });
    
    // Check if token is expired or old before making request
    const expiresAt = new Date(this.connection.token_expires_at);
    const updatedAt = this.connection.updated_at ? new Date(this.connection.updated_at) : new Date(0);
    const now = new Date();
    const bufferTime = 5 * 60 * 1000; // 5 minutes buffer
    const tokenAgeMinutes = (now.getTime() - updatedAt.getTime()) / (60 * 1000);

    const needsRefreshByExpiry = now.getTime() >= (expiresAt.getTime() - bufferTime);
    const needsRefreshByAge = tokenAgeMinutes > 50;

    console.log('Token validity check:', {
        expiresAt: expiresAt.toISOString(),
        updatedAt: updatedAt.toISOString(),
        now: now.toISOString(),
        tokenAgeMinutes: tokenAgeMinutes.toFixed(2),
        needsRefreshByExpiry,
        needsRefreshByAge
    });

    if (this.isOAuth && (needsRefreshByExpiry || needsRefreshByAge) && retryCount === 0) {
      const reason = needsRefreshByExpiry ? 'token expired/expiring' : 'token is old (>50 minutes)';
      console.log(`Forcing token refresh: ${reason}`);
      try {
        await this.refreshTokens();
        // Re-create headers with the new token
        requestHeaders = {
            ...requestHeaders,
            'Authorization': `Bearer ${this.accessToken}`,
        };
        console.log('Headers updated with new token.');
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
      headers: requestHeaders,
    });

    console.log(`Zoom API response: ${response.status} for ${endpoint}`);
    console.log('Zoom API response details:', {
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers.entries())
    });

    if (!response.ok) {
      if (this.isOAuth && response.status === 401 && retryCount < 1) {
        console.log(`Received 401 for ${endpoint}. Attempting OAuth token refresh.`);
        try {
          await this.refreshTokens();
          // Retry the request with the new token
          return await this.makeRequest(endpoint, options, retryCount + 1);
        } catch (refreshError) {
          console.error(`Token refresh flow failed for ${endpoint}:`, refreshError.message);
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
