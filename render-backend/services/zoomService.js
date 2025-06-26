
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
  async getWebinars(accessToken, userId = 'me', options = {}) {
    try {
      const params = new URLSearchParams({
        page_size: options.pageSize || 30,
        page_number: options.pageNumber || 1,
        type: options.type || 'scheduled'
      });

      const response = await axios.get(`${this.baseURL}/users/${userId}/webinars?${params}`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000
      });

      return {
        success: true,
        webinars: response.data.webinars || [],
        totalRecords: response.data.total_records || 0,
        pageCount: response.data.page_count || 1
      };
      
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || error.message,
        status: error.response?.status
      };
    }
  }
}

// Create singleton instance
const zoomService = new ZoomService();

module.exports = { zoomService };
