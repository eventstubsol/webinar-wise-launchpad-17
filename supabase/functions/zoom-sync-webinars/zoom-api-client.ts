import { SimpleTokenEncryption } from './encryption.ts';

export class ZoomAPIClient {
  private baseUrl = 'https://api.zoom.us/v2';
  private accessToken: string;
  private rateLimitRemaining: number = 100;
  private rateLimitResetTime: number = Date.now() + (24 * 60 * 60 * 1000);

  constructor(accessToken: string) {
    this.accessToken = accessToken;
  }

  async makeRequest(endpoint: string, method: string = 'GET', data: any = null): Promise<any> {
    const url = `${this.baseUrl}${endpoint}`;
    console.log(`Making ${method} request to ${url}`);

    const headers: HeadersInit = {
      'Authorization': `Bearer ${this.accessToken}`,
      'Content-Type': 'application/json'
    };

    const config: RequestInit = {
      method,
      headers
    };

    if (data) {
      config.body = JSON.stringify(data);
    }

    const response = await fetch(url, config);

    if (!response.ok) {
      console.error(`Request failed: ${response.status} ${response.statusText}`);
      try {
        const errorBody = await response.json();
        console.error('Error details:', errorBody);
        throw new Error(errorBody.message || `Request failed with status ${response.status}`);
      } catch (jsonError) {
        console.error('Failed to parse error JSON:', jsonError);
        throw new Error(`Request failed with status ${response.status}`);
      }
    }

    const rateLimitRemaining = response.headers.get('X-RateLimit-Remaining');
    const rateLimitReset = response.headers.get('X-RateLimit-Reset');

    if (rateLimitRemaining) {
      this.rateLimitRemaining = parseInt(rateLimitRemaining, 10);
    }

    if (rateLimitReset) {
      this.rateLimitResetTime = parseInt(rateLimitReset, 10) * 1000;
    }

    return await response.json();
  }

  async listWebinars(userId: string, options: { type?: string, from?: string, to?: string } = {}): Promise<any> {
    const { type = 'past', from, to } = options;
    let endpoint = `/users/${userId}/webinars?type=${type}&page_size=300`;

    if (from) {
      endpoint += `&from=${from}`;
    }
    if (to) {
      endpoint += `&to=${to}`;
    }

    return await this.makeRequest(endpoint);
  }

  async getWebinar(webinarId: string): Promise<any> {
    return await this.makeRequest(`/webinars/${webinarId}`);
  }

  async listWebinarParticipants(webinarId: string): Promise<any> {
    return await this.makeRequest(`/webinars/${webinarId}/participants`);
  }

  async getWebinarRegistrants(webinarId: string): Promise<any> {
    let allRegistrants: any[] = [];
    let nextPageToken: string | null = null;

    do {
      let endpoint = `/webinars/${webinarId}/registrants?status=approved`;
      if (nextPageToken) {
        endpoint += `&next_page_token=${nextPageToken}`;
      }

      const response = await this.makeRequest(endpoint);
      if (response.registrants) {
        allRegistrants = allRegistrants.concat(response.registrants);
      }
      nextPageToken = response.next_page_token || null;
    } while (nextPageToken);

    return allRegistrants;
  }

  async updateWebinarRegistrantStatus(webinarId: string, registrantId: string, action: string): Promise<any> {
    const data = { action };
    return await this.makeRequest(`/webinars/${webinarId}/registrants/${registrantId}/status`, 'PUT', data);
  }

  async listRecordings(webinarId: string): Promise<any> {
    return await this.makeRequest(`/webinars/${webinarId}/recordings`);
  }

  async deleteRecording(webinarId: string, recordingId: string): Promise<any> {
    return await this.makeRequest(`/webinars/${webinarId}/recordings/${recordingId}`, 'DELETE');
  }

  async listWebinarsWithRange(options: { type?: string } = {}): Promise<any[]> {
    const { type = 'all' } = options;
    const now = new Date();
    const pastDate = new Date(now.getTime() - (90 * 24 * 60 * 60 * 1000));
    const futureDate = new Date(now.getTime() + (90 * 24 * 60 * 60 * 1000));
    const pastWebinars = await this.listAllWebinars('me', { type: 'past', from: pastDate.toISOString().split('T')[0], to: now.toISOString().split('T')[0] });
    const upcomingWebinars = await this.listAllWebinars('me', { type: 'upcoming', from: now.toISOString().split('T')[0], to: futureDate.toISOString().split('T')[0] });
    const allWebinars = [...pastWebinars, ...upcomingWebinars];
    const uniqueWebinars = this.deduplicateWebinars(allWebinars);
    return uniqueWebinars;
  }

  private deduplicateWebinars(webinars: any[]): any[] {
    const seen = new Set();
    return webinars.filter(webinar => {
      if (seen.has(webinar.id)) {
        return false;
      }
      seen.add(webinar.id);
      return true;
    });
  }

  private async listAllWebinars(userId: string, options: { type?: string, from?: string, to?: string } = {}): Promise<any[]> {
    const { type = 'past', from, to } = options;
    let allWebinars: any[] = [];
    let pageNumber = 1;
    let hasMore = true;

    while (hasMore) {
      let endpoint = `/users/${userId}/webinars?type=${type}&page_size=300&page_number=${pageNumber}`;
      if (from) {
        endpoint += `&from=${from}`;
      }
      if (to) {
        endpoint += `&to=${to}`;
      }

      const response = await this.makeRequest(endpoint);
      if (response.webinars && response.webinars.length > 0) {
        allWebinars = allWebinars.concat(response.webinars);
      }
      hasMore = (response.page_number * response.page_size) < response.total_records;
      pageNumber++;
    }

    return allWebinars;
  }

  /**
   * Get webinar participants from reports
   */
  async getWebinarParticipants(webinarId: string): Promise<any[]> {
    console.log(`Fetching participants for webinar ${webinarId}`);
    
    const allParticipants = [];
    let nextPageToken = '';
    let hasMore = true;

    while (hasMore) {
      const params = new URLSearchParams({
        page_size: '300',
      });

      if (nextPageToken) {
        params.append('next_page_token', nextPageToken);
      }

      const endpoint = `/report/webinars/${webinarId}/participants?${params}`;
      const response = await this.makeRequest(endpoint);

      if (response.participants && response.participants.length > 0) {
        allParticipants.push(...response.participants);
        console.log(`Fetched ${response.participants.length} participants (total: ${allParticipants.length})`);
      }

      hasMore = !!response.next_page_token;
      nextPageToken = response.next_page_token || '';
    }

    console.log(`Total participants fetched for webinar ${webinarId}: ${allParticipants.length}`);
    return allParticipants;
  }
}

export async function createZoomAPIClient(connection: any, supabase: any): Promise<ZoomAPIClient> {
  if (!connection) {
    throw new Error('No Zoom connection found');
  }

  let accessToken = connection.access_token;
  if (!accessToken) {
    throw new Error('No access token found in Zoom connection');
  }

  // Decrypt the token
  accessToken = await SimpleTokenEncryption.decryptToken(accessToken, connection.user_id);

  return new ZoomAPIClient(accessToken);
}
