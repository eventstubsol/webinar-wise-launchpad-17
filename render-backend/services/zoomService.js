
const axios = require('axios');

class ZoomService {
  constructor() {
    this.baseURL = 'https://api.zoom.us/v2';
  }

  async getWebinars(accessToken, options = {}) {
    console.log('Fetching webinars from Zoom API...');
    
    try {
      const response = await axios.get(`${this.baseURL}/webinars`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        params: {
          page_size: options.pageSize || 30,
          page_number: options.pageNumber || 1,
          from: options.from,
          to: options.to
        },
        timeout: 30000
      });

      console.log(`Zoom API response: ${response.data.webinars?.length || 0} webinars`);
      
      return response.data.webinars || [];
    } catch (error) {
      console.error('Zoom API error:', error.response?.data || error.message);
      
      if (error.response?.status === 401) {
        throw new Error('Zoom access token is invalid or expired. Please reconnect your account.');
      } else if (error.response?.status === 429) {
        throw new Error('Zoom API rate limit exceeded. Please try again later.');
      } else if (error.response?.status >= 500) {
        throw new Error('Zoom API is temporarily unavailable. Please try again later.');
      } else {
        throw new Error(`Zoom API error: ${error.response?.data?.message || error.message}`);
      }
    }
  }

  async refreshToken(refreshToken) {
    console.log('Refreshing Zoom access token...');
    
    try {
      const response = await axios.post('https://zoom.us/oauth/token', null, {
        params: {
          grant_type: 'refresh_token',
          refresh_token: refreshToken
        },
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        timeout: 10000
      });

      return response.data;
    } catch (error) {
      console.error('Token refresh error:', error.response?.data || error.message);
      throw new Error('Failed to refresh Zoom access token');
    }
  }

  async validateToken(accessToken) {
    console.log('Validating Zoom access token...');
    
    try {
      const response = await axios.get(`${this.baseURL}/users/me`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        timeout: 10000
      });

      return response.data;
    } catch (error) {
      console.error('Token validation error:', error.response?.data || error.message);
      
      if (error.response?.status === 401) {
        return null; // Token is invalid
      }
      
      throw new Error('Failed to validate Zoom access token');
    }
  }
}

const zoomService = new ZoomService();

module.exports = { zoomService };
