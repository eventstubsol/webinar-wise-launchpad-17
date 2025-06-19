
// Enhanced Zoom API Client for Edge Functions
// This file provides the createZoomAPIClient function used by the sync processor

console.log('📦 Zoom API client module loaded successfully');

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

class ZoomAPIClient {
  private accessToken: string;
  private connectionId: string;
  private supabase: any;

  constructor(accessToken: string, connectionId: string, supabase: any) {
    this.accessToken = accessToken;
    this.connectionId = connectionId;
    this.supabase = supabase;
    console.log(`🔧 ZoomAPIClient initialized for connection ${connectionId}`);
  }

  private async makeRequest(endpoint: string, options: RequestInit = {}): Promise<any> {
    const url = `${ZOOM_API_BASE_URL}${endpoint}`;
    console.log(`📡 Making request to: ${url}`);

    let lastError: Error | undefined;

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
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
            throw new Error(`Authentication failed: ${response.statusText}`);
          }
          
          if (response.status === 429) {
            console.log('⏳ Rate limited, waiting before retry...');
            await delay(BASE_RETRY_DELAY * Math.pow(2, attempt));
            continue;
          }
          
          throw new Error(`Zoom API error: ${response.status} ${response.statusText} - ${errorBody}`);
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

  async listWebinarsWithRange(options: { type?: string } = {}): Promise<any[]> {
    console.log('📋 Fetching webinars list...');
    
    try {
      let allWebinars: any[] = [];
      let nextPageToken: string | null = null;
      let pageCount = 0;
      const maxPages = 10; // Safety limit to prevent infinite loops
      
      do {
        pageCount++;
        console.log(`📄 Fetching webinars page ${pageCount}...`);
        
        // Build URL with pagination
        let url = '/users/me/webinars?page_size=300&type=all';
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
          console.warn(`⚠️ Reached maximum page limit (${maxPages}) for webinar list`);
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
      throw error;
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
      throw error;
    }
  }

  async getWebinarRegistrants(webinarId: string): Promise<any[]> {
    console.log(`👥 Fetching registrants for webinar: ${webinarId}`);
    
    try {
      let allRegistrants: any[] = [];
      let nextPageToken: string | null = null;
      let pageCount = 0;
      const maxPages = 20; // Safety limit to prevent infinite loops
      
      do {
        pageCount++;
        console.log(`📄 Fetching registrants page ${pageCount} for webinar ${webinarId}...`);
        
        // Build URL with pagination
        let url = `/webinars/${webinarId}/registrants?page_size=300`;
        if (nextPageToken) {
          url += `&next_page_token=${encodeURIComponent(nextPageToken)}`;
        }
        
        const response = await this.makeRequest(url);
        const registrants = response.registrants || [];
        allRegistrants = allRegistrants.concat(registrants);
        
        console.log(`📊 Page ${pageCount}: Retrieved ${registrants.length} registrants (total so far: ${allRegistrants.length})`);
        
        // Check if there are more pages
        nextPageToken = response.next_page_token || null;
        
        // Safety check to prevent infinite loops
        if (pageCount >= maxPages) {
          console.warn(`⚠️ Reached maximum page limit (${maxPages}) for webinar ${webinarId}`);
          break;
        }
        
        // Add delay between pages to avoid rate limiting
        if (nextPageToken) {
          await delay(200);
        }
        
      } while (nextPageToken);
      
      console.log(`👥 Total registrants retrieved for webinar ${webinarId}: ${allRegistrants.length}`);
      return allRegistrants;
    } catch (error) {
      console.error(`❌ Error fetching registrants for webinar ${webinarId}:`, error);
      return []; // Return empty array instead of throwing to continue sync
    }
  }

  async getWebinarParticipants(webinarId: string): Promise<any[]> {
    console.log(`👤 Fetching participants for webinar: ${webinarId}`);
    
    try {
      let allParticipants: any[] = [];
      let nextPageToken: string | null = null;
      let pageCount = 0;
      const maxPages = 20; // Safety limit to prevent infinite loops
      
      do {
        pageCount++;
        console.log(`📄 Fetching participants page ${pageCount} for webinar ${webinarId}...`);
        
        // Build URL with pagination
        let url = `/report/webinars/${webinarId}/participants?page_size=300`;
        if (nextPageToken) {
          url += `&next_page_token=${encodeURIComponent(nextPageToken)}`;
        }
        
        const response = await this.makeRequest(url);
        const participants = response.participants || [];
        allParticipants = allParticipants.concat(participants);
        
        console.log(`📊 Page ${pageCount}: Retrieved ${participants.length} participants (total so far: ${allParticipants.length})`);
        
        // Check if there are more pages
        nextPageToken = response.next_page_token || null;
        
        // Safety check to prevent infinite loops
        if (pageCount >= maxPages) {
          console.warn(`⚠️ Reached maximum page limit (${maxPages}) for webinar ${webinarId}`);
          break;
        }
        
        // Add delay between pages to avoid rate limiting
        if (nextPageToken) {
          await delay(200);
        }
        
      } while (nextPageToken);
      
      console.log(`👤 Total participants retrieved for webinar ${webinarId}: ${allParticipants.length}`);
      return allParticipants;
    } catch (error) {
      console.error(`❌ Error fetching participants for webinar ${webinarId}:`, error);
      return []; // Return empty array instead of throwing to continue sync
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
      return []; // Return empty array instead of throwing to continue sync
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
      return []; // Return empty array instead of throwing to continue sync
    }
  }
}

export async function createZoomAPIClient(connection: any, supabase: any): Promise<ZoomAPIClient> {
  console.log(`🔧 Creating Zoom API client for connection: ${connection.id}`);
  
  if (!connection.access_token) {
    throw new Error('No access token available for Zoom connection');
  }
  
  const client = new ZoomAPIClient(connection.access_token, connection.id, supabase);
  console.log(`✅ Zoom API client created successfully for connection: ${connection.id}`);
  
  return client;
}
