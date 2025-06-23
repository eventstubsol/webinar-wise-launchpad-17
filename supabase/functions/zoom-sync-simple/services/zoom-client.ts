/**
 * Zoom API client for making authenticated requests
 */

import { SimpleTokenEncryption } from './encryption.ts';

interface ZoomConnection {
  id: string;
  access_token: string;
  refresh_token: string;
  token_expires_at: string;
  zoom_email: string;
}

class ZoomAPIClient {
  private accessToken: string;
  private baseUrl = 'https://api.zoom.us/v2';

  constructor(accessToken: string) {
    this.accessToken = accessToken;
  }

  private async makeRequest(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<any> {
    const url = `${this.baseUrl}${endpoint}`;
    
    const response = await fetch(url, {
      ...options,
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
        ...options.headers
      }
    });

    if (!response.ok) {
      const error = await response.text();
      console.error(`Zoom API error: ${response.status} - ${error}`);
      throw new Error(`Zoom API error: ${response.status}`);
    }

    return response.json();
  }

  async listWebinars(params: {
    type?: 'scheduled' | 'upcoming' | 'past' | 'past_one_year';
    page_size?: number;
    page_number?: number;
  } = {}): Promise<any> {
    const queryParams = new URLSearchParams({
      type: params.type || 'past',
      page_size: (params.page_size || 100).toString(),
      page_number: (params.page_number || 1).toString()
    });

    return this.makeRequest(`/users/me/webinars?${queryParams}`);
  }

  async getWebinar(webinarId: string): Promise<any> {
    return this.makeRequest(`/webinars/${webinarId}`);
  }

  async listAllWebinars(type: string = 'past'): Promise<any[]> {
    const allWebinars: any[] = [];
    let pageNumber = 1;
    let hasMore = true;

    while (hasMore) {
      const response = await this.listWebinars({
        type: type as any,
        page_size: 100,
        page_number: pageNumber
      });

      if (response.webinars && response.webinars.length > 0) {
        allWebinars.push(...response.webinars);
        pageNumber++;
        hasMore = response.page_count > pageNumber - 1;
      } else {
        hasMore = false;
      }
    }

    return allWebinars;
  }
}

export async function createZoomClient(connection: ZoomConnection): Promise<ZoomAPIClient> {
  // Decrypt the access token using the proper AES-GCM method
  const decryptedToken = await SimpleTokenEncryption.decryptToken(
    connection.access_token,
    connection.zoom_email
  );
  
  // Check if token needs refresh
  const tokenExpiresAt = new Date(connection.token_expires_at);
  const now = new Date();
  
  if (tokenExpiresAt <= now) {
    console.log('Token expired, needs refresh');
    // In a real implementation, you would refresh the token here
    // For now, we'll just use the existing token
  }

  return new ZoomAPIClient(decryptedToken);
}
