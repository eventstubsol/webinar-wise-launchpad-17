
const axios = require('axios');

class ZoomService {
  constructor() {
    this.baseURL = 'https://api.zoom.us/v2';
  }

  // Get access token using credentials
  async getAccessToken(credentials) {
    try {
      const response = await axios.post('https://zoom.us/oauth/token', null, {
        params: {
          grant_type: 'account_credentials',
          account_id: credentials.account_id
        },
        auth: {
          username: credentials.client_id,
          password: credentials.client_secret
        },
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });

      return response.data.access_token;
    } catch (error) {
      console.error('Failed to get access token:', error.response?.data || error.message);
      throw new Error('Failed to authenticate with Zoom API');
    }
  }

  // Make authenticated request to Zoom API
  async makeAuthenticatedRequest(endpoint, accessToken, options = {}) {
    try {
      const response = await axios({
        method: options.method || 'GET',
        url: `${this.baseURL}${endpoint}`,
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          ...options.headers
        },
        params: options.params,
        data: options.data,
        timeout: 30000
      });

      return response.data;
    } catch (error) {
      console.error(`Zoom API request failed for ${endpoint}:`, error.response?.data || error.message);
      throw error;
    }
  }

  // Get user info
  async getUserInfo(accessToken) {
    return this.makeAuthenticatedRequest('/users/me', accessToken);
  }

  // Get webinars with pagination
  async getWebinars(accessToken, options = {}) {
    const params = {
      type: options.type || 'scheduled',
      page_size: options.page_size || 30,
      page_number: options.page_number || 1,
      ...options.params
    };

    return this.makeAuthenticatedRequest('/users/me/webinars', accessToken, { params });
  }

  // Get all webinars (handles pagination)
  async getAllWebinars(accessToken, options = {}) {
    let allWebinars = [];
    let pageNumber = 1;
    let hasMore = true;

    while (hasMore) {
      try {
        const response = await this.getWebinars(accessToken, {
          ...options,
          page_number: pageNumber
        });

        allWebinars = allWebinars.concat(response.webinars || []);
        
        hasMore = response.webinars && response.webinars.length === (options.page_size || 30);
        pageNumber++;

        // Safety limit to prevent infinite loops
        if (pageNumber > 100) {
          console.warn('Reached pagination limit of 100 pages');
          break;
        }
      } catch (error) {
        console.error(`Failed to fetch webinars page ${pageNumber}:`, error.message);
        break;
      }
    }

    return allWebinars;
  }

  // Get webinar participants
  async getWebinarParticipants(accessToken, webinarId) {
    try {
      return this.makeAuthenticatedRequest(
        `/webinars/${webinarId}/participants`,
        accessToken
      );
    } catch (error) {
      // Some webinars might not have participants data available
      console.warn(`Could not fetch participants for webinar ${webinarId}:`, error.message);
      return { participants: [] };
    }
  }

  // Get webinar registrants
  async getWebinarRegistrants(accessToken, webinarId) {
    try {
      return this.makeAuthenticatedRequest(
        `/webinars/${webinarId}/registrants`,
        accessToken
      );
    } catch (error) {
      console.warn(`Could not fetch registrants for webinar ${webinarId}:`, error.message);
      return { registrants: [] };
    }
  }
}

module.exports = new ZoomService();
