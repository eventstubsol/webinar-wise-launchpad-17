
import { ZoomConnection } from '@/types/zoom';
import { TokenManager } from './tokenManager';

/**
 * Zoom API client for making authenticated requests - plain text tokens
 */
export class ZoomAPIClient {
  private connection: ZoomConnection;

  constructor(connection: ZoomConnection) {
    this.connection = connection;
  }

  /**
   * Make authenticated request to Zoom API
   */
  async makeRequest(endpoint: string, options: RequestInit = {}): Promise<any> {
    // Check if token needs refresh
    if (TokenManager.isTokenExpired(this.connection.token_expires_at)) {
      const refreshedConnection = await TokenManager.refreshAccessToken(this.connection.id);
      if (refreshedConnection) {
        this.connection = refreshedConnection;
      } else {
        throw new Error('Failed to refresh access token');
      }
    }

    const url = `https://api.zoom.us/v2${endpoint}`;
    const response = await fetch(url, {
      ...options,
      headers: {
        'Authorization': `Bearer ${this.connection.access_token}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Zoom API request failed: ${response.status} ${errorText}`);
    }

    return response.json();
  }

  /**
   * Get user information
   */
  async getUser(): Promise<any> {
    return this.makeRequest('/users/me');
  }

  /**
   * Get webinars
   */
  async getWebinars(pageSize = 30, pageNumber = 1): Promise<any> {
    return this.makeRequest(`/users/me/webinars?page_size=${pageSize}&page_number=${pageNumber}`);
  }

  /**
   * Get webinar details
   */
  async getWebinar(webinarId: string): Promise<any> {
    return this.makeRequest(`/webinars/${webinarId}`);
  }

  /**
   * Get webinar registrants
   */
  async getWebinarRegistrants(webinarId: string, pageSize = 30, pageNumber = 1): Promise<any> {
    return this.makeRequest(`/webinars/${webinarId}/registrants?page_size=${pageSize}&page_number=${pageNumber}`);
  }

  /**
   * Get webinar participants report
   */
  async getWebinarParticipants(webinarId: string, pageSize = 30, nextPageToken?: string): Promise<any> {
    let url = `/report/webinars/${webinarId}/participants?page_size=${pageSize}`;
    if (nextPageToken) {
      url += `&next_page_token=${nextPageToken}`;
    }
    return this.makeRequest(url);
  }

  /**
   * Get webinar polls
   */
  async getWebinarPolls(webinarId: string): Promise<any> {
    return this.makeRequest(`/report/webinars/${webinarId}/polls`);
  }

  /**
   * Get webinar Q&A
   */
  async getWebinarQA(webinarId: string): Promise<any> {
    return this.makeRequest(`/report/webinars/${webinarId}/qa`);
  }
}
