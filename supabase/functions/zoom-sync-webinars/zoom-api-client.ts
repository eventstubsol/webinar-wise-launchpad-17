
console.log('📦 Enhanced Zoom API client with token refresh loaded successfully');

const ZOOM_API_BASE_URL = 'https://api.zoom.us/v2';
const RATE_LIMIT_DELAY = 100;
const MAX_RETRIES = 3;
const BASE_RETRY_DELAY = 1000;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      clearTimeout(timer);
      resolve();
    }, ms);
  });
}

interface ZoomAPIError {
  code: string;
  message: string;
  webinarId?: string;
  operation?: string;
  isRetryable?: boolean;
}

class ZoomAPIClient {
  private accessToken: string;
  private refreshToken: string;
  private connectionId: string;
  private tokenExpiresAt: Date;
  private supabase: any;

  constructor(connection: any, supabase: any) {
    this.accessToken = connection.access_token;
    this.refreshToken = connection.refresh_token;
    this.connectionId = connection.id;
    this.tokenExpiresAt = new Date(connection.token_expires_at);
    this.supabase = supabase;
    console.log(`🔧 ZoomAPIClient initialized for connection ${this.connectionId}`);
  }

  private async refreshAccessToken(): Promise<void> {
    console.log('🔄 Refreshing Zoom access token...');
    
    try {
      // Get Zoom OAuth credentials from environment
      const clientId = Deno.env.get('ZOOM_CLIENT_ID');
      const clientSecret = Deno.env.get('ZOOM_CLIENT_SECRET');
      
      if (!clientId || !clientSecret) {
        throw new Error('Missing Zoom OAuth credentials in environment');
      }

      // Refresh token with Zoom
      const response = await fetch('https://zoom.us/oauth/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Basic ${btoa(`${clientId}:${clientSecret}`)}`,
        },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: this.refreshToken,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Token refresh failed: ${error}`);
      }

      const tokenData = await response.json();
      
      // Update tokens in memory
      this.accessToken = tokenData.access_token;
      this.refreshToken = tokenData.refresh_token;
      this.tokenExpiresAt = new Date(Date.now() + (tokenData.expires_in * 1000));

      // Update tokens in database
      await this.supabase
        .from('zoom_connections')
        .update({
          access_token: tokenData.access_token,
          refresh_token: tokenData.refresh_token,
          token_expires_at: this.tokenExpiresAt.toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', this.connectionId);

      console.log('✅ Access token refreshed successfully');
    } catch (error) {
      console.error('❌ Failed to refresh access token:', error);
      throw new ZoomAPIError({
        code: 'TOKEN_REFRESH_FAILED',
        message: `Token refresh failed: ${error.message}`,
        isRetryable: false
      });
    }
  }

  private async ensureValidToken(): Promise<void> {
    // Check if token is expired or about to expire (5 minutes buffer)
    const now = new Date();
    const expiryBuffer = new Date(now.getTime() + 5 * 60 * 1000);
    
    if (this.tokenExpiresAt <= expiryBuffer) {
      await this.refreshAccessToken();
    }
  }

  private async makeRequest(endpoint: string, options: RequestInit = {}): Promise<any> {
    const url = `${ZOOM_API_BASE_URL}${endpoint}`;
    console.log(`📡 Making request to: ${url}`);

    let lastError: Error | undefined;

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        // Ensure token is valid before making request
        await this.ensureValidToken();

        const response = await fetch(url, {
          ...options,
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json',
            ...options.headers,
          },
        });

        if (!response.ok) {
          const errorBody = await response.text();
          console.error(`❌ Zoom API Error: ${response.status} ${response.statusText}`, errorBody);
          
          if (response.status === 401) {
            // Try refreshing token once on 401
            if (attempt === 0) {
              console.log('🔄 Got 401, attempting token refresh...');
              await this.refreshAccessToken();
              continue; // Retry with new token
            }
            throw new ZoomAPIError({
              code: 'AUTHENTICATION_FAILED',
              message: `Authentication failed after refresh: ${response.statusText}`,
              isRetryable: false
            });
          }
          
          if (response.status === 429) {
            console.log('⏳ Rate limited, waiting before retry...');
            await delay(BASE_RETRY_DELAY * Math.pow(2, attempt));
            continue;
          }
          
          throw new ZoomAPIError({
            code: 'API_ERROR',
            message: `Zoom API error: ${response.status} ${response.statusText} - ${errorBody}`,
            isRetryable: response.status >= 500
          });
        }

        const data = await response.json();
        console.log(`✅ Request successful: ${url}`);
        
        // Add rate limit delay between requests
        await delay(RATE_LIMIT_DELAY);
        
        return data;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        if (attempt === MAX_RETRIES - 1) {
          console.error(`💥 Final attempt failed for ${url}:`, lastError);
          throw lastError;
        }

        const delayMs = BASE_RETRY_DELAY * Math.pow(2, attempt);
        console.log(`⚠️ Request failed, retrying in ${delayMs}ms. Attempt ${attempt + 1}/${MAX_RETRIES}`);
        await delay(delayMs);
      }
    }

    throw lastError!;
  }

  async listWebinarsWithRange(options: { type?: string; page_size?: number } = {}): Promise<any[]> {
    console.log('📋 Fetching webinars list with options:', options);
    
    try {
      let allWebinars: any[] = [];
      let nextPageToken: string | null = null;
      let pageCount = 0;
      const maxPages = 100; // Remove arbitrary limit, use safety limit
      
      // Build query parameters from options - honor the type parameter
      const queryParams = new URLSearchParams({
        page_size: (options.page_size || 300).toString(),
        type: options.type || 'all', // Honor the options parameter
      });
      
      do {
        pageCount++;
        console.log(`📄 Fetching webinars page ${pageCount}...`);
        
        // Build URL with pagination
        let url = `/users/me/webinars?${queryParams.toString()}`;
        if (nextPageToken) {
          url += `&next_page_token=${encodeURIComponent(nextPageToken)}`;
        }
        
        const response = await this.makeRequest(url);
        const webinars = response.webinars || [];
        allWebinars = allWebinars.concat(webinars);
        
        console.log(`📊 Page ${pageCount}: Retrieved ${webinars.length} webinars (total so far: ${allWebinars.length})`);
        
        // Check if there are more pages
        nextPageToken = response.next_page_token || null;
        
        // Safety check to prevent infinite loops
        if (pageCount >= maxPages) {
          console.warn(`⚠️ Reached maximum page limit (${maxPages})`);
          break;
        }
        
        // Add delay between pages to avoid rate limiting
        if (nextPageToken) {
          await delay(200);
        }
        
      } while (nextPageToken);
      
      console.log(`📊 Total webinars retrieved from Zoom API: ${allWebinars.length}`);
      return allWebinars;
    } catch (error) {
      console.error('❌ Error fetching webinars:', error);
      throw error; // Don't hide errors - surface them properly
    }
  }

  async getWebinar(webinarId: string): Promise<any> {
    console.log(`📋 Fetching webinar details for: ${webinarId}`);
    
    try {
      const webinar = await this.makeRequest(`/webinars/${webinarId}`);
      console.log(`✅ Retrieved webinar details for: ${webinarId}`);
      return webinar;
    } catch (error) {
      console.error(`❌ Error fetching webinar ${webinarId}:`, error);
      throw error; // Don't hide errors
    }
  }

  async getWebinarRegistrants(webinarId: string): Promise<any[]> {
    console.log(`👥 Fetching registrants for webinar: ${webinarId}`);
    
    try {
      let allRegistrants: any[] = [];
      let nextPageToken: string | null = null;
      let pageCount = 0;
      const maxPages = 50;
      
      do {
        pageCount++;
        console.log(`📄 Fetching registrants page ${pageCount} for webinar ${webinarId}...`);
        
        let url = `/webinars/${webinarId}/registrants?page_size=300`;
        if (nextPageToken) {
          url += `&next_page_token=${encodeURIComponent(nextPageToken)}`;
        }
        
        const response = await this.makeRequest(url);
        const registrants = response.registrants || [];
        allRegistrants = allRegistrants.concat(registrants);
        
        console.log(`📊 Page ${pageCount}: Retrieved ${registrants.length} registrants (total so far: ${allRegistrants.length})`);
        
        nextPageToken = response.next_page_token || null;
        
        if (pageCount >= maxPages) {
          console.warn(`⚠️ Reached maximum page limit (${maxPages}) for webinar ${webinarId}`);
          break;
        }
        
        if (nextPageToken) {
          await delay(200);
        }
        
      } while (nextPageToken);
      
      console.log(`👥 Total registrants retrieved for webinar ${webinarId}: ${allRegistrants.length}`);
      return allRegistrants;
    } catch (error) {
      console.error(`❌ Error fetching registrants for webinar ${webinarId}:`, error);
      throw error; // Surface errors instead of returning empty array
    }
  }

  async getWebinarParticipants(webinarId: string): Promise<any[]> {
    console.log(`👤 Fetching participants for webinar: ${webinarId}`);
    
    try {
      let allParticipants: any[] = [];
      let nextPageToken: string | null = null;
      let pageCount = 0;
      const maxPages = 50;
      
      do {
        pageCount++;
        console.log(`📄 Fetching participants page ${pageCount} for webinar ${webinarId}...`);
        
        let url = `/report/webinars/${webinarId}/participants?page_size=300`;
        if (nextPageToken) {
          url += `&next_page_token=${encodeURIComponent(nextPageToken)}`;
        }
        
        const response = await this.makeRequest(url);
        const participants = response.participants || [];
        allParticipants = allParticipants.concat(participants);
        
        console.log(`📊 Page ${pageCount}: Retrieved ${participants.length} participants (total so far: ${allParticipants.length})`);
        
        nextPageToken = response.next_page_token || null;
        
        if (pageCount >= maxPages) {
          console.warn(`⚠️ Reached maximum page limit (${maxPages}) for webinar ${webinarId}`);
          break;
        }
        
        if (nextPageToken) {
          await delay(200);
        }
        
      } while (nextPageToken);
      
      console.log(`👤 Total participants retrieved for webinar ${webinarId}: ${allParticipants.length}`);
      return allParticipants;
    } catch (error) {
      console.error(`❌ Error fetching participants for webinar ${webinarId}:`, error);
      throw error; // Surface errors instead of returning empty array
    }
  }

  async getWebinarPolls(webinarId: string): Promise<any[]> {
    console.log(`📊 Fetching polls for webinar: ${webinarId}`);
    
    try {
      const response = await this.makeRequest(`/report/webinars/${webinarId}/polls`);
      const polls = response.questions || [];
      
      console.log(`📊 Retrieved ${polls.length} polls for webinar: ${webinarId}`);
      return polls;
    } catch (error) {
      console.error(`❌ Error fetching polls for webinar ${webinarId}:`, error);
      throw error; // Surface errors instead of returning empty array
    }
  }

  async getWebinarQA(webinarId: string): Promise<any[]> {
    console.log(`❓ Fetching Q&A for webinar: ${webinarId}`);
    
    try {
      const response = await this.makeRequest(`/report/webinars/${webinarId}/qa`);
      const qa = response.questions || [];
      
      console.log(`❓ Retrieved ${qa.length} Q&A entries for webinar: ${webinarId}`);
      return qa;
    } catch (error) {
      console.error(`❌ Error fetching Q&A for webinar ${webinarId}:`, error);
      throw error; // Surface errors instead of returning empty array
    }
  }
}

export async function createZoomAPIClient(connection: any, supabase: any): Promise<ZoomAPIClient> {
  console.log(`🔧 Creating enhanced Zoom API client for connection: ${connection.id}`);
  
  if (!connection.access_token) {
    throw new Error('No access token available for Zoom connection');
  }
  
  const client = new ZoomAPIClient(connection, supabase);
  console.log(`✅ Enhanced Zoom API client created successfully for connection: ${connection.id}`);
  
  return client;
}
