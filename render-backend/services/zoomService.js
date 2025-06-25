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

  // Get webinars with pagination and date range support
  async getWebinars(accessToken, options = {}) {
    const params = {
      type: options.type || 'scheduled',
      page_size: options.page_size || 30,
      page_number: options.page_number || 1,
      ...options.params
    };

    // Add date range parameters if provided
    if (options.from) {
      params.from = this.formatDateForZoomAPI(options.from);
    }
    if (options.to) {
      params.to = this.formatDateForZoomAPI(options.to);
    }

    return this.makeAuthenticatedRequest('/users/me/webinars', accessToken, { params });
  }

  // Get all webinars with enhanced date range support (handles pagination)
  async getAllWebinars(accessToken, options = {}) {
    let allWebinars = [];
    
    // Calculate 90-day range if no dates provided
    const dateRange = this.calculateDateRange(options.from, options.to);
    
    console.log(`📅 Fetching webinars from ${dateRange.from} to ${dateRange.to}`);

    // Get different types of webinars to ensure comprehensive coverage
    const webinarTypes = ['scheduled', 'live', 'ended'];
    
    for (const type of webinarTypes) {
      console.log(`🔍 Fetching ${type} webinars...`);
      
      let pageNumber = 1;
      let hasMore = true;

      while (hasMore) {
        try {
          const response = await this.getWebinars(accessToken, {
            type: type,
            page_number: pageNumber,
            page_size: options.page_size || 30,
            from: dateRange.from,
            to: dateRange.to,
            ...options
          });

          const webinars = response.webinars || [];
          console.log(`📊 Found ${webinars.length} ${type} webinars on page ${pageNumber}`);
          
          allWebinars = allWebinars.concat(webinars);
          
          hasMore = webinars.length === (options.page_size || 30);
          pageNumber++;

          // Safety limit to prevent infinite loops
          if (pageNumber > 100) {
            console.warn(`⚠️ Reached pagination limit of 100 pages for ${type} webinars`);
            break;
          }
        } catch (error) {
          console.error(`❌ Failed to fetch ${type} webinars page ${pageNumber}:`, error.message);
          break;
        }
      }
    }

    // Remove duplicates based on webinar ID
    const uniqueWebinars = this.removeDuplicateWebinars(allWebinars);
    console.log(`✅ Total unique webinars found: ${uniqueWebinars.length}`);

    return uniqueWebinars;
  }

  // Format date for Zoom API (YYYY-MM-DD format)
  formatDateForZoomAPI(date) {
    if (!date) return null;
    
    const dateObj = date instanceof Date ? date : new Date(date);
    return dateObj.toISOString().split('T')[0];
  }

  // Calculate 90-day date range
  calculateDateRange(fromDate, toDate) {
    const now = new Date();
    
    // Default: 90 days in the past to 90 days in the future
    const from = fromDate ? new Date(fromDate) : new Date(now.getTime() - (90 * 24 * 60 * 60 * 1000));
    const to = toDate ? new Date(toDate) : new Date(now.getTime() + (90 * 24 * 60 * 60 * 1000));
    
    return {
      from: from,
      to: to
    };
  }

  // Remove duplicate webinars based on ID
  removeDuplicateWebinars(webinars) {
    const seen = new Set();
    return webinars.filter(webinar => {
      const id = webinar.id || webinar.webinar_id;
      if (seen.has(id)) {
        return false;
      }
      seen.add(id);
      return true;
    });
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
