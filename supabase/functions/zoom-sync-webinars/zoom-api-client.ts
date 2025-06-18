
// Enhanced Zoom API Client for Edge Functions
// This file provides the createZoomAPIClient function used by the sync processor

console.log('📦 Zoom API client module loaded successfully');

const ZOOM_API_BASE_URL = 'https://api.zoom.us/v2';
const RATE_LIMIT_DELAY = 100;
const MAX_RETRIES = 3;
const BASE_RETRY_DELAY = 1000;

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
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
      const response = await this.makeRequest('/users/me/webinars?page_size=300&type=all');
      const webinars = response.webinars || [];
      
      console.log(`📊 Retrieved ${webinars.length} webinars from Zoom API`);
      return webinars;
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
      const response = await this.makeRequest(`/webinars/${webinarId}/registrants?page_size=300`);
      const registrants = response.registrants || [];
      
      console.log(`👥 Retrieved ${registrants.length} registrants for webinar: ${webinarId}`);
      return registrants;
    } catch (error) {
      console.error(`❌ Error fetching registrants for webinar ${webinarId}:`, error);
      return []; // Return empty array instead of throwing to continue sync
    }
  }

  async getWebinarParticipants(webinarId: string): Promise<any[]> {
    console.log(`👤 Fetching participants for webinar: ${webinarId}`);
    
    try {
      const response = await this.makeRequest(`/report/webinars/${webinarId}/participants?page_size=300`);
      const participants = response.participants || [];
      
      console.log(`👤 Retrieved ${participants.length} participants for webinar: ${webinarId}`);
      return participants;
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
