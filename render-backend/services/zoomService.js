
const axios = require('axios');

class ZoomService {
  constructor() {
    this.baseURL = 'https://api.zoom.us/v2';
    this.oauthURL = 'https://zoom.us/oauth';
  }

  async getAccessToken(accountId, clientId, clientSecret) {
    try {
      const response = await axios.post(`${this.oauthURL}/token`, null, {
        params: {
          grant_type: 'account_credentials',
          account_id: accountId
        },
        headers: {
          'Authorization': `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });

      return response.data;
    } catch (error) {
      console.error('Zoom token error:', error.response?.data || error.message);
      throw new Error(error.response?.data?.error_description || 'Failed to get access token');
    }
  }

  async validateCredentials(accountId, clientId, clientSecret) {
    try {
      // Get access token
      const tokenData = await this.getAccessToken(accountId, clientId, clientSecret);
      
      // Test the token by making a user info request
      const userResponse = await axios.get(`${this.baseURL}/users/me`, {
        headers: {
          'Authorization': `Bearer ${tokenData.access_token}`
        }
      });

      return {
        valid: true,
        tokenData,
        userInfo: userResponse.data
      };
    } catch (error) {
      console.error('Zoom validation error:', error.response?.data || error.message);
      return {
        valid: false,
        error: error.response?.data?.message || error.message
      };
    }
  }

  async refreshTokenWithCredentials(refreshToken, clientId, clientSecret) {
    try {
      const response = await axios.post(`${this.oauthURL}/token`, null, {
        params: {
          grant_type: 'refresh_token',
          refresh_token: refreshToken
        },
        headers: {
          'Authorization': `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });

      return response.data;
    } catch (error) {
      console.error('Zoom refresh error:', error.response?.data || error.message);
      throw new Error(error.response?.data?.error_description || 'Failed to refresh token');
    }
  }

  async makeAuthenticatedRequest(endpoint, accessToken, method = 'GET', data = null) {
    try {
      const config = {
        method,
        url: `${this.baseURL}${endpoint}`,
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      };

      if (data && (method === 'POST' || method === 'PUT')) {
        config.data = data;
      }

      const response = await axios(config);
      return response.data;
    } catch (error) {
      console.error('Zoom API error:', error.response?.data || error.message);
      throw new Error(error.response?.data?.message || 'Zoom API request failed');
    }
  }

  async getWebinars(accessToken, options = {}) {
    const params = new URLSearchParams({
      page_size: options.pageSize || 30,
      type: 'scheduled',
      ...options
    });

    return this.makeAuthenticatedRequest(`/users/me/webinars?${params}`, accessToken);
  }

  async getWebinar(webinarId, accessToken) {
    return this.makeAuthenticatedRequest(`/webinars/${webinarId}`, accessToken);
  }

  async getWebinarParticipants(webinarId, accessToken) {
    return this.makeAuthenticatedRequest(`/report/webinars/${webinarId}/participants`, accessToken);
  }
}

module.exports = new ZoomService();
