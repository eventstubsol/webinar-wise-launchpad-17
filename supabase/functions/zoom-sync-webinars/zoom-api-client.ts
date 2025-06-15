
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

export async function createZoomAPIClient(connection: any) {
  // Decrypt the access token
  let accessToken = connection.access_token;
  
  try {
    // Try to decrypt if it's encrypted
    accessToken = await SimpleTokenEncryption.decryptToken(accessToken, connection.user_id);
  } catch (error) {
    console.log('Token decryption failed, assuming plain text token:', error.message);
    // If decryption fails, assume it's a plain text token
  }

  return new ZoomAPIClient(accessToken);
}

class ZoomAPIClient {
  private accessToken: string;
  private baseURL = 'https://api.zoom.us/v2';

  constructor(accessToken: string) {
    this.accessToken = accessToken;
  }

  private async makeRequest(endpoint: string, options: RequestInit = {}): Promise<any> {
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
      const errorText = await response.text();
      console.error(`Zoom API error (${response.status}):`, errorText);
      throw new Error(`Zoom API request failed: ${response.status} ${response.statusText}`);
    }

    return await response.json();
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
