import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

export async function createZoomAPIClient(connection: any, supabase: any) {
  const accessToken = connection.access_token;
  const refreshToken = connection.refresh_token;
  const clientId = Deno.env.get('ZOOM_CLIENT_ID');
  const clientSecret = Deno.env.get('ZOOM_CLIENT_SECRET');

  if (!clientId || !clientSecret) {
    console.error('Missing Zoom client ID or secret');
    throw new Error('Zoom client ID and secret must be set in environment variables');
  }

  if (!accessToken) {
    console.error('Missing Zoom access token');
    throw new Error('Zoom access token is required');
  }

  async function validateToken(token: string): Promise<boolean> {
    try {
      const response = await fetch('https://api.zoom.us/v2/users/me', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.status === 200) {
        return true;
      } else if (response.status === 401) {
        console.warn('Token validation failed with status 401, token might be expired');
        return false;
      } else {
        console.error(`Token validation failed with status ${response.status}: ${await response.text()}`);
        return false;
      }
    } catch (error) {
      console.error('Error validating token:', error);
      return false;
    }
  }

  async function refreshAccessToken(): Promise<string | null> {
    console.log('Attempting to refresh access token...');

    const encodedCredentials = btoa(`${clientId}:${clientSecret}`);

    try {
      const response = await fetch('https://zoom.us/oauth/token', {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${encodedCredentials}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: `grant_type=refresh_token&refresh_token=${refreshToken}`
      });

      const data = await response.json();

      if (response.ok && data.access_token) {
        console.log('Token refresh successful');
        
        // Update tokens in Supabase
        const { error } = await supabase
          .from('zoom_connections')
          .update({
            access_token: data.access_token,
            refresh_token: data.refresh_token || refreshToken, // Use new refresh token if provided
            expires_at: new Date(Date.now() + data.expires_in * 1000).toISOString()
          })
          .eq('id', connection.id);

        if (error) {
          console.error('Error updating tokens in Supabase:', error);
          throw new Error('Failed to update tokens in database');
        }
        
        return data.access_token;
      } else {
        console.error('Token refresh failed:', data);
        throw new Error(data.error_description || 'Failed to refresh access token');
      }
    } catch (error) {
      console.error('Error refreshing token:', error);
      return null;
    }
  }

  async function makeZoomAPIRequest(method: string, endpoint: string, body?: any) {
    let currentToken = accessToken;

    // Validate token before making the request
    const isTokenValid = await validateToken(currentToken);

    if (!isTokenValid) {
      console.warn('Access token is invalid, attempting to refresh');
      const newToken = await refreshAccessToken();
      if (newToken) {
        currentToken = newToken;
      } else {
        console.error('Failed to refresh access token, request cannot proceed');
        throw new Error('Authentication failed: Could not refresh access token');
      }
    }

    const url = `https://api.zoom.us/v2${endpoint}`;
    const headers = {
      'Authorization': `Bearer ${currentToken}`,
      'Content-Type': 'application/json'
    };

    const options: any = {
      method,
      headers
    };

    if (body) {
      options.body = JSON.stringify(body);
    }

    try {
      const response = await fetch(url, options);
      const data = await response.json();

      if (!response.ok) {
        console.error(`Zoom API request failed with status ${response.status} for ${endpoint}:`, data);
        
        // Specific handling for rate limit errors
        if (response.status === 429) {
          throw new Error(`Rate limit exceeded: ${data.message || 'Too many requests'}`);
        }
        
        throw new Error(data.message || `Zoom API error: ${response.statusText}`);
      }

      return data;
    } catch (error) {
      console.error(`Error making Zoom API request to ${endpoint}:`, error);
      throw error;
    }
  }

  const client = {
    makeZoomAPIRequest,
    async getWebinar(webinarId: string) {
      return await makeZoomAPIRequest('GET', `/webinars/${webinarId}`);
    },
    async listWebinars(userId: string, options: { from?: string, to?: string, type?: string, page_size?: number, page_number?: number } = {}) {
      const { from, to, type = 'past', page_size = 300, page_number = 1 } = options;
      let url = `/users/${userId}/webinars?type=${type}&page_size=${page_size}&page_number=${page_number}`;
    
      if (from) {
        url += `&from=${from}`;
      }
      if (to) {
        url += `&to=${to}`;
      }
    
      return await makeZoomAPIRequest('GET', url);
    },
    
    async getWebinarRegistrants(webinarId: string, options: { status?: string; pageSize?: number } = {}) {
      const { status = 'approved', pageSize = 100 } = options;
      
      console.log(`📋 Fetching webinar registrants for ${webinarId} with status: ${status}`);
      
      try {
        const allRegistrants = [];
        let pageNumber = 1;
        let hasMore = true;
        
        while (hasMore) {
          const params = new URLSearchParams({
            page_size: pageSize.toString(),
            page_number: pageNumber.toString(),
            status: status
          });
          
          const response = await makeZoomAPIRequest(
            'GET',
            `/webinars/${webinarId}/registrants?${params}`
          );
          
          if (response.registrants && response.registrants.length > 0) {
            allRegistrants.push(...response.registrants);
            console.log(`📊 Page ${pageNumber}: Found ${response.registrants.length} registrants`);
          }
          
          hasMore = response.page_number < response.page_count;
          pageNumber++;
          
          // Safety break
          if (pageNumber > 100) {
            console.log(`⚠️ Breaking after 100 pages for safety`);
            break;
          }
        }
        
        console.log(`✅ Total webinar registrants found: ${allRegistrants.length}`);
        return allRegistrants;
        
      } catch (error) {
        console.error(`❌ Error fetching webinar registrants for ${webinarId}:`, error);
        throw error;
      }
    },

    async getMeetingRegistrants(meetingId: string, options: { status?: string } = {}) {
      console.log(`📞 Fetching meeting registrants for ${meetingId} with status: ${options.status || 'all'}`);
      
      try {
        const params = new URLSearchParams({
          page_size: '100'
        });
        
        if (options.status) {
          params.append('status', options.status);
        }
        
        const allRegistrants = [];
        let pageNumber = 1;
        let hasMore = true;
        
        while (hasMore) {
          params.set('page_number', pageNumber.toString());
          
          const response = await makeZoomAPIRequest(
            `GET`,
            `/meetings/${meetingId}/registrants?${params}`
          );
          
          if (response.registrants && response.registrants.length > 0) {
            allRegistrants.push(...response.registrants);
            console.log(`📊 Page ${pageNumber}: Found ${response.registrants.length} meeting registrants`);
          }
          
          hasMore = response.page_number < response.page_count;
          pageNumber++;
        }
        
        console.log(`✅ Total meeting registrants found: ${allRegistrants.length}`);
        return allRegistrants;
        
      } catch (error) {
        console.error(`❌ Error fetching meeting registrants for ${meetingId}:`, error);
        throw error;
      }
    },

    async getAlternativeRegistrants(webinarId: string) {
      console.log(`🔄 Trying alternative registrant endpoints for ${webinarId}`);
      
      const endpoints = [
        `/past_webinars/${webinarId}/registrants`,
        `/report/webinars/${webinarId}/registrants`,
        `/webinars/${webinarId}/batch_registrants`
      ];
      
      for (const endpoint of endpoints) {
        try {
          console.log(`🔍 Trying endpoint: ${endpoint}`);
          
          const response = await makeZoomAPIRequest('GET', endpoint);
          
          if (response.registrants && response.registrants.length > 0) {
            console.log(`✅ Alternative endpoint successful: Found ${response.registrants.length} registrants`);
            return response.registrants;
          }
          
        } catch (error) {
          console.log(`⚠️ Alternative endpoint ${endpoint} failed: ${error.message}`);
        }
      }
      
      return [];
    }
  };

  return client;
}
