
const axios = require('axios');

class ZoomService {
  constructor() {
    this.baseURL = 'https://api.zoom.us/v2';
    this.oauthURL = 'https://zoom.us/oauth';
  }

  /**
   * Validate access token by making a test API call
   */
  async validateAccessToken(accessToken) {
    try {
      console.log('Validating Zoom access token...');
      
      const response = await axios.get(`${this.baseURL}/users/me`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        timeout: 10000
      });

      console.log('Token validation successful:', {
        status: response.status,
        userId: response.data?.id
      });
      
      return true;
    } catch (error) {
      if (error.response?.data) {
        console.log('Token validation error:', error.response.data);
      } else {
        console.log('Token validation network error:', error.message);
      }
      return false;
    }
  }

  /**
   * Get server-to-server access token using client credentials
   */
  async getServerToServerToken(clientId, clientSecret, accountId) {
    try {
      console.log('Getting server-to-server token for account:', accountId);
      
      const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
      
      const response = await axios.post(`${this.oauthURL}/token`, 
        new URLSearchParams({
          grant_type: 'account_credentials',
          account_id: accountId
        }), {
          headers: {
            'Authorization': `Basic ${credentials}`,
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          timeout: 15000
        }
      );

      console.log('Server-to-server token obtained successfully');
      
      return {
        access_token: response.data.access_token,
        expires_in: response.data.expires_in,
        token_type: response.data.token_type
      };
      
    } catch (error) {
      console.error('Server-to-server token request failed:', {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message
      });
      
      throw new Error(
        error.response?.data?.error_description || 
        error.response?.data?.error || 
        'Failed to get server-to-server token'
      );
    }
  }

  /**
   * Refresh OAuth access token using refresh token
   */
  async refreshOAuthToken(refreshToken) {
    try {
      console.log('Refreshing OAuth token...');
      
      const response = await axios.post(`${this.oauthURL}/token`, 
        new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: refreshToken
        }), {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          timeout: 15000
        }
      );

      console.log('OAuth token refreshed successfully');
      
      return {
        access_token: response.data.access_token,
        refresh_token: response.data.refresh_token,
        expires_in: response.data.expires_in,
        token_type: response.data.token_type
      };
      
    } catch (error) {
      console.error('OAuth token refresh failed:', {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message
      });
      
      throw new Error(
        error.response?.data?.error_description || 
        error.response?.data?.error || 
        'Failed to refresh OAuth token'
      );
    }
  }

  /**
   * Refresh token with user-specific credentials (for backward compatibility)
   */
  async refreshTokenWithCredentials(refreshToken, clientId, clientSecret) {
    try {
      console.log('Refreshing token with user credentials...');
      
      const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
      
      const response = await axios.post(`${this.oauthURL}/token`, 
        new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: refreshToken
        }), {
          headers: {
            'Authorization': `Basic ${credentials}`,
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          timeout: 15000
        }
      );

      console.log('Token refreshed with user credentials successfully');
      
      return {
        access_token: response.data.access_token,
        refresh_token: response.data.refresh_token,
        expires_in: response.data.expires_in,
        token_type: response.data.token_type
      };
      
    } catch (error) {
      console.error('Token refresh with credentials failed:', {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message
      });
      
      throw new Error(
        error.response?.data?.error_description || 
        error.response?.data?.error || 
        'Failed to refresh token with credentials'
      );
    }
  }

  /**
   * Test Zoom API connection
   */
  async testConnection(accessToken) {
    try {
      const response = await axios.get(`${this.baseURL}/users/me`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        timeout: 10000
      });

      return {
        success: true,
        user: response.data,
        message: 'Connection test successful'
      };
      
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || error.message,
        status: error.response?.status
      };
    }
  }

  /**
   * Get user's webinars
   */
  async getWebinars(accessToken, options = {}) {
    try {
      const params = new URLSearchParams({
        page_size: options.page_size || 100,
        page_number: options.page_number || 1,
        type: options.type || 'scheduled'
      });

      const response = await axios.get(`${this.baseURL}/users/me/webinars?${params}`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000
      });

      return response.data;
      
    } catch (error) {
      console.error('Get webinars error:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Get a specific webinar
   */
  async getWebinar(webinarId, accessToken) {
    try {
      const response = await axios.get(`${this.baseURL}/webinars/${webinarId}`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000
      });

      return response.data;
      
    } catch (error) {
      console.error('Get webinar error:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Get webinar participants (basic endpoint)
   */
  async getWebinarParticipants(webinarId, accessToken, options = {}) {
    try {
      const params = new URLSearchParams({
        page_size: options.page_size || 100,
        page_number: options.page_number || 1
      });

      const response = await axios.get(`${this.baseURL}/past_webinars/${webinarId}/participants?${params}`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000
      });

      return response.data;
      
    } catch (error) {
      console.error('Get webinar participants error:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Get webinar participants report (detailed endpoint with more data)
   * This endpoint provides session details for participants who joined multiple times
   */
  async getWebinarParticipantsReport(webinarId, accessToken, options = {}) {
    try {
      const params = new URLSearchParams({
        page_size: options.page_size || 300,
        include_fields: 'registrant_id,participant_user_id,email,join_time,leave_time,duration,attentiveness_score,customer_key,location,network_type,device,ip_address,data_center,connection_type,join_time,leave_time,share_application,share_desktop,share_whiteboard,recording,pc_name,domain,mac_address,harddisk_id,version,leave_reason,role'
      });

      if (options.next_page_token) {
        params.append('next_page_token', options.next_page_token);
      }

      const response = await axios.get(`${this.baseURL}/report/webinars/${webinarId}/participants?${params}`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000
      });

      // Log response for debugging
      console.log(`Report API response for webinar ${webinarId}:`);
      console.log(`- Total records: ${response.data.total_records || 0}`);
      console.log(`- Participants returned: ${response.data.participants?.length || 0}`);
      console.log(`- Has next page: ${!!response.data.next_page_token}`);

      return response.data;
      
    } catch (error) {
      console.error('Get webinar participants report error:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Get webinar participant details with session information
   * Uses the dashboard endpoint which provides more detailed metrics
   */
  async getWebinarParticipantsDashboard(webinarId, accessToken, options = {}) {
    try {
      const params = new URLSearchParams({
        type: 'past',
        page_size: options.page_size || 300
      });

      if (options.next_page_token) {
        params.append('next_page_token', options.next_page_token);
      }

      const response = await axios.get(`${this.baseURL}/metrics/webinars/${webinarId}/participants?${params}`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000
      });

      return response.data;
      
    } catch (error) {
      console.error('Get webinar dashboard participants error:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Get all instances of a recurring webinar
   */
  async getWebinarInstances(webinarId, accessToken) {
    try {
      const response = await axios.get(`${this.baseURL}/past_webinars/${webinarId}/instances`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000
      });

      return response.data;
      
    } catch (error) {
      console.error('Get webinar instances error:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Get webinar registrants
   */
  async getWebinarRegistrants(webinarId, accessToken, options = {}) {
    try {
      const params = new URLSearchParams({
        page_size: options.page_size || 100,
        page_number: options.page_number || 1
      });

      const response = await axios.get(`${this.baseURL}/webinars/${webinarId}/registrants?${params}`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000
      });

      return response.data;
      
    } catch (error) {
      console.error('Get webinar registrants error:', error.response?.data || error.message);
      throw error;
    }
  }
}

// Create singleton instance
const zoomService = new ZoomService();

// Export the instance directly
module.exports = zoomService;
