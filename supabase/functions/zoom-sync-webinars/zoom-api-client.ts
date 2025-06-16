
export async function createZoomAPIClient(connection: any, supabase: any) {
  console.log('🔌 Creating Zoom API client for connection:', connection.id);
  
  // Get access token using Server-to-Server OAuth
  const credentials = connection.zoom_credentials;
  if (!credentials) {
    throw new Error('No Zoom credentials found for connection');
  }

  const tokenResponse = await fetch('https://zoom.us/oauth/token', {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${btoa(`${credentials.client_id}:${credentials.client_secret}`)}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: `grant_type=account_credentials&account_id=${credentials.account_id}`
  });

  if (!tokenResponse.ok) {
    const errorText = await tokenResponse.text();
    console.error('❌ Failed to get access token:', errorText);
    throw new Error(`Failed to authenticate with Zoom: ${errorText}`);
  }

  const tokenData = await tokenResponse.json();
  console.log('✅ Access token obtained, scopes:', tokenData.scope);

  return {
    accessToken: tokenData.access_token,
    scopes: tokenData.scope,

    async fetchWebinars(pageSize = 100, pageNumber = 1, type = 'past') {
      console.log(`🌐 Fetching ${type} webinars - Page ${pageNumber}, Size ${pageSize}`);
      
      const url = `https://api.zoom.us/v2/users/me/webinars?page_size=${pageSize}&page_number=${pageNumber}&type=${type}`;
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ Failed to fetch webinars (${type}):`, errorText);
        throw new Error(`Zoom API error fetching webinars: ${response.status} ${errorText}`);
      }

      const data = await response.json();
      console.log(`✅ Fetched ${data.webinars?.length || 0} ${type} webinars from page ${pageNumber}`);
      return data;
    },

    async fetchRegistrants(webinarId: string, pageSize = 100, status = 'approved') {
      console.log(`🌐 Fetching registrants for webinar ${webinarId}`);
      
      const url = `https://api.zoom.us/v2/webinars/${webinarId}/registrants?page_size=${pageSize}&status=${status}`;
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ Failed to fetch registrants for webinar ${webinarId}:`, response.status, errorText);
        
        // Don't throw for 404 - webinar might not require registration
        if (response.status === 404) {
          console.log(`ℹ️ Webinar ${webinarId} does not require registration or not found`);
          return { registrants: [], total_records: 0 };
        }
        
        throw new Error(`Zoom API error fetching registrants: ${response.status} ${errorText}`);
      }

      const data = await response.json();
      console.log(`✅ Fetched ${data.registrants?.length || 0} registrants for webinar ${webinarId}`);
      return data;
    },

    async fetchParticipants(webinarId: string, pageSize = 100) {
      console.log(`🌐 Fetching participants for webinar ${webinarId}`);
      
      const url = `https://api.zoom.us/v2/report/webinars/${webinarId}/participants?page_size=${pageSize}`;
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ Failed to fetch participants for webinar ${webinarId}:`, response.status, errorText);
        
        // Don't throw for 404 - webinar might not have occurred or no participants
        if (response.status === 404) {
          console.log(`ℹ️ No participant data available for webinar ${webinarId} (webinar not occurred or no attendees)`);
          return { participants: [], total_records: 0 };
        }
        
        throw new Error(`Zoom API error fetching participants: ${response.status} ${errorText}`);
      }

      const data = await response.json();
      console.log(`✅ Fetched ${data.participants?.length || 0} participants for webinar ${webinarId}`);
      return data;
    }
  };
}
