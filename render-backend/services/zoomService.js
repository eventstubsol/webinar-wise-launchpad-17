
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

  // Validate credentials by attempting authentication and fetching user info
  async validateCredentials(account_id, client_id, client_secret) {
    try {
      console.log('Validating Zoom credentials...');
      
      // Create credentials object
      const credentials = {
        account_id,
        client_id,
        client_secret
      };

      // Step 1: Try to get access token
      const accessToken = await this.getAccessToken(credentials);
      
      if (!accessToken) {
        return {
          valid: false,
          error: 'Failed to obtain access token'
        };
      }

      // Step 2: Get user info to verify the token works
      const userInfo = await this.getUserInfo(accessToken);
      
      if (!userInfo) {
        return {
          valid: false,
          error: 'Failed to retrieve user information'
        };
      }

      console.log('Zoom credentials validated successfully');
      
      return {
        valid: true,
        userInfo: {
          id: userInfo.id,
          email: userInfo.email,
          type: userInfo.type,
          account_id: userInfo.account_id,
          first_name: userInfo.first_name,
          last_name: userInfo.last_name,
          display_name: userInfo.display_name,
          timezone: userInfo.timezone,
          language: userInfo.language,
          status: userInfo.status
        },
        tokenData: {
          access_token: accessToken,
          expires_in: 3600, // Zoom S2S tokens typically expire in 1 hour
          scope: 'webinar:read webinar:write meeting:read meeting:write user:read'
        }
      };

    } catch (error) {
      console.error('Credential validation failed:', error.message);
      
      // Provide more specific error messages based on error type
      let errorMessage = 'Invalid credentials';
      
      if (error.message.includes('authenticate')) {
        errorMessage = 'Invalid Account ID, Client ID, or Client Secret';
      } else if (error.message.includes('user information')) {
        errorMessage = 'Authentication succeeded but failed to retrieve user information';
      } else if (error.response?.status === 401) {
        errorMessage = 'Invalid Account ID, Client ID, or Client Secret';
      } else if (error.response?.status === 403) {
        errorMessage = 'Access denied. Check your app permissions and scopes';
      }
      
      return {
        valid: false,
        error: errorMessage
      };
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
