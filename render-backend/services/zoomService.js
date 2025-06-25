
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

  // Get detailed webinar information with comprehensive field extraction
  async getWebinarDetails(accessToken, webinarId) {
    try {
      console.log(`🔍 Fetching comprehensive webinar details for: ${webinarId}`);
      const webinarDetails = await this.makeAuthenticatedRequest(`/webinars/${webinarId}`, accessToken);
      
      console.log(`✅ Successfully fetched comprehensive details for webinar: ${webinarId}`);
      console.log('📊 Available fields in webinar details:', Object.keys(webinarDetails));
      
      // Log key fields we're particularly interested in
      if (webinarDetails.registration_url || (webinarDetails.settings && webinarDetails.settings.registration_type)) {
        console.log(`🔗 Registration info found:`);
        console.log(`  - registration_url: ${webinarDetails.registration_url || 'not set'}`);
        console.log(`  - registration_type: ${webinarDetails.settings?.registration_type || 'not set'}`);
        console.log(`  - approval_type: ${webinarDetails.settings?.approval_type || 'not set'}`);
      }
      
      // Log settings object structure for debugging
      if (webinarDetails.settings) {
        console.log(`⚙️ Settings object keys:`, Object.keys(webinarDetails.settings));
      }
      
      return webinarDetails;
    } catch (error) {
      console.warn(`⚠️ Failed to fetch details for webinar ${webinarId}:`, error.message);
      return null;
    }
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

  // Enhanced webinar participants with comprehensive data mapping
  async getWebinarParticipants(accessToken, webinarId) {
    try {
      console.log(`👥 Fetching comprehensive participant data for webinar ${webinarId}`);
      
      const response = await this.makeAuthenticatedRequest(
        `/past_webinars/${webinarId}/participants`,
        accessToken,
        {
          params: {
            page_size: 300,  // Maximum allowed
            include_fields: 'registrant_id,customer_key,join_time,leave_time,duration,attentiveness_score'
          }
        }
      );

      const participants = response.participants || [];
      console.log(`📊 Found ${participants.length} participants for webinar ${webinarId}`);
      
      // Enhanced participant data with comprehensive field mapping
      const enhancedParticipants = participants.map(participant => {
        console.log(`🔍 Processing participant: ${participant.name || participant.user_name || 'Unknown'}`);
        console.log(`📋 Available participant fields:`, Object.keys(participant));
        
        return {
          // Core identification
          participant_id: participant.id || participant.participant_uuid,
          participant_uuid: participant.participant_uuid || participant.id,
          participant_name: participant.name || participant.user_name || 'Unknown',
          participant_email: participant.email || participant.user_email || null,
          participant_user_id: participant.user_id || null,
          registrant_id: participant.registrant_id || null,
          
          // Timing information
          join_time: participant.join_time || null,
          leave_time: participant.leave_time || null,
          duration: participant.duration || 0,
          
          // Engagement metrics (from Zoom Dashboard API)
          attentiveness_score: participant.attentiveness_score || null,
          camera_on_duration: participant.camera_on_duration || 0,
          share_application_duration: participant.share_application_duration || 0,
          share_desktop_duration: participant.share_desktop_duration || 0,
          share_whiteboard_duration: participant.share_whiteboard_duration || 0,
          
          // Interaction flags
          posted_chat: participant.posted_chat || false,
          raised_hand: participant.raised_hand || false,
          answered_polling: participant.answered_polling || false,
          asked_question: participant.asked_question || false,
          
          // Technical information
          device: participant.device || null,
          ip_address: participant.ip_address || null,
          location: participant.location || null,
          network_type: participant.network_type || null,
          version: participant.version || null,
          customer_key: participant.customer_key || null,
          
          // Status and other
          participant_status: participant.status || 'in_meeting',
          failover: participant.failover || false
        };
      });

      console.log(`✅ Enhanced ${enhancedParticipants.length} participants with comprehensive data`);
      return enhancedParticipants;
      
    } catch (error) {
      console.warn(`Could not fetch participants for webinar ${webinarId}:`, error.message);
      return [];
    }
  }

  // Enhanced webinar registrants with comprehensive data mapping
  async getWebinarRegistrants(accessToken, webinarId) {
    try {
      console.log(`📋 Fetching comprehensive registrant data for webinar ${webinarId}`);
      
      let allRegistrants = [];
      let pageNumber = 1;
      let hasMore = true;

      while (hasMore) {
        try {
          const response = await this.makeAuthenticatedRequest(
            `/webinars/${webinarId}/registrants`,
            accessToken,
            {
              params: {
                page_size: 300,  // Maximum allowed
                page_number: pageNumber,
                status: 'approved'  // Get approved registrants
              }
            }
          );

          const registrants = response.registrants || [];
          console.log(`📊 Found ${registrants.length} registrants on page ${pageNumber} for webinar ${webinarId}`);
          
          allRegistrants = allRegistrants.concat(registrants);
          
          hasMore = registrants.length === 300;
          pageNumber++;

          // Safety limit
          if (pageNumber > 50) {
            console.warn(`⚠️ Reached pagination limit for registrants in webinar ${webinarId}`);
            break;
          }
        } catch (pageError) {
          console.error(`❌ Failed to fetch registrants page ${pageNumber}:`, pageError.message);
          break;
        }
      }

      // Enhanced registrant data with comprehensive field mapping
      const enhancedRegistrants = allRegistrants.map(registrant => {
        console.log(`🔍 Processing registrant: ${registrant.email}`);
        console.log(`📋 Available registrant fields:`, Object.keys(registrant));
        
        return {
          // Core identification
          registrant_id: registrant.id || registrant.registrant_id,
          registrant_uuid: registrant.registrant_uuid || null,
          email: registrant.email,
          
          // Personal information
          first_name: registrant.first_name || null,
          last_name: registrant.last_name || null,
          
          // Contact information
          address: registrant.address || null,
          city: registrant.city || null,
          country: registrant.country || null,
          zip: registrant.zip || null,
          state: registrant.state || null,
          phone: registrant.phone || null,
          
          // Professional information
          industry: registrant.industry || null,
          org: registrant.org || registrant.organization || null,
          job_title: registrant.job_title || null,
          purchasing_time_frame: registrant.purchasing_time_frame || null,
          role_in_purchase_process: registrant.role_in_purchase_process || null,
          no_of_employees: registrant.no_of_employees || null,
          
          // Registration details
          comments: registrant.comments || null,
          status: registrant.status || 'approved',
          create_time: registrant.create_time || null,
          registration_time: registrant.registration_time || registrant.create_time || null,
          join_url: registrant.join_url || null,
          
          // Additional tracking
          source_id: registrant.source_id || null,
          tracking_source: registrant.tracking_source || null,
          language: registrant.language || null,
          
          // Custom questions (JSONB)
          custom_questions: registrant.custom_questions || [],
          
          // Attendance tracking (will be populated during sync)
          attended: false,
          join_time: null,
          leave_time: null,
          duration: null
        };
      });

      console.log(`✅ Enhanced ${enhancedRegistrants.length} registrants with comprehensive data`);
      return enhancedRegistrants;
      
    } catch (error) {
      console.warn(`Could not fetch registrants for webinar ${webinarId}:`, error.message);
      return [];
    }
  }

  // Helper method to get registrant details by ID
  async getRegistrantDetails(accessToken, webinarId, registrantId) {
    try {
      const response = await this.makeAuthenticatedRequest(
        `/webinars/${webinarId}/registrants/${registrantId}`,
        accessToken
      );
      
      return response;
    } catch (error) {
      console.warn(`Could not fetch registrant details for ${registrantId}:`, error.message);
      return null;
    }
  }
}

module.exports = new ZoomService();
