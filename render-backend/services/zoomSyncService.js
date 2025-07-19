
const axios = require('axios');
const supabaseService = require('./supabaseService');
const zoomService = require('./zoomService');

class ZoomSyncService {
  constructor() {
    this.REQUEST_TIMEOUT = 30000; // 30 seconds
    this.MAX_RETRIES = 3;
    this.RETRY_DELAY = 2000; // 2 seconds
  }

  async syncWebinars({ connection, credentials, syncLogId, syncType, onProgress }) {
    console.log(`🚀 [ZoomSync] Starting ${syncType} sync for connection ${connection.id}`);
    
    let processedWebinars = 0;
    let totalWebinars = 0;
    let errors = [];

    try {
      // Update sync log to indicate we're starting
      await supabaseService.updateSyncLog(syncLogId, {
        sync_progress: 5,
        current_operation: 'Initializing sync process...',
        updated_at: new Date().toISOString()
      });

      // Test Zoom API connection first
      console.log(`🔍 [ZoomSync] Testing Zoom API connection...`);
      const connectionTest = await this.testZoomConnection(credentials);
      if (!connectionTest.success) {
        throw new Error(`Zoom API connection failed: ${connectionTest.error}`);
      }

      console.log(`✅ [ZoomSync] Zoom API connection verified`);
      await supabaseService.updateSyncLog(syncLogId, {
        sync_progress: 10,
        current_operation: 'Zoom API connection verified, fetching webinars...',
        updated_at: new Date().toISOString()
      });

      // Fetch webinars with detailed logging
      console.log(`📋 [ZoomSync] Fetching webinar list...`);
      const webinars = await this.fetchWebinarsWithRetry(credentials, syncType);
      totalWebinars = webinars.length;
      
      console.log(`📊 [ZoomSync] Found ${totalWebinars} webinars to sync`);
      await supabaseService.updateSyncLog(syncLogId, {
        sync_progress: 20,
        current_operation: `Found ${totalWebinars} webinars, starting detailed sync...`,
        total_items: totalWebinars,
        updated_at: new Date().toISOString()
      });

      // Process each webinar with detailed progress tracking
      for (let i = 0; i < webinars.length; i++) {
        const webinar = webinars[i];
        const progressPercent = Math.round(20 + ((i / totalWebinars) * 70)); // 20-90%
        
        try {
          console.log(`🔄 [ZoomSync] Processing webinar ${i + 1}/${totalWebinars}: ${webinar.topic} (ID: ${webinar.id})`);
          
          await supabaseService.updateSyncLog(syncLogId, {
            sync_progress: progressPercent,
            current_operation: `Processing webinar: ${webinar.topic} (${i + 1}/${totalWebinars})`,
            processed_items: i,
            updated_at: new Date().toISOString()
          });

          if (onProgress) {
            onProgress(progressPercent, `Processing webinar: ${webinar.topic}`);
          }

          // Sync webinar with timeout and retry
          await this.syncSingleWebinarWithRetry(webinar, connection.id, credentials);
          processedWebinars++;
          
          console.log(`✅ [ZoomSync] Successfully processed webinar: ${webinar.topic}`);

        } catch (error) {
          console.error(`❌ [ZoomSync] Failed to process webinar ${webinar.topic}:`, error);
          errors.push({
            webinarId: webinar.id,
            webinarTopic: webinar.topic,
            error: error.message,
            timestamp: new Date().toISOString()
          });
        }

        // Add small delay between webinars to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      // Final progress update
      await supabaseService.updateSyncLog(syncLogId, {
        sync_progress: 95,
        current_operation: 'Finalizing sync...',
        processed_items: processedWebinars,
        updated_at: new Date().toISOString()
      });

      console.log(`🎉 [ZoomSync] Sync completed: ${processedWebinars}/${totalWebinars} webinars processed`);

      return {
        processedWebinars,
        totalWebinars,
        errors
      };

    } catch (error) {
      console.error(`💥 [ZoomSync] Critical sync error:`, error);
      
      // Update sync log with detailed error
      await supabaseService.updateSyncLog(syncLogId, {
        sync_progress: 0,
        current_operation: 'Sync failed',
        error_message: error.message,
        error_details: {
          type: error.name || 'Unknown',
          message: error.message,
          stack: error.stack,
          timestamp: new Date().toISOString(),
          processedWebinars,
          totalWebinars,
          errors
        },
        updated_at: new Date().toISOString()
      });

      throw error;
    }
  }

  async testZoomConnection(credentials) {
    try {
      console.log(`🔍 [ZoomSync] Testing connection with account ID: ${credentials.account_id}`);
      
      const token = await zoomService.getAccessToken(credentials);
      if (!token) {
        return { success: false, error: 'Failed to obtain access token' };
      }

      // Test API call with timeout
      const response = await Promise.race([
        axios.get('https://api.zoom.us/v2/users/me', {
          headers: { Authorization: `Bearer ${token}` }
        }),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Connection test timeout')), 10000)
        )
      ]);

      console.log(`✅ [ZoomSync] Connection test successful, user: ${response.data.email}`);
      return { 
        success: true, 
        userInfo: {
          email: response.data.email,
          account_id: response.data.account_id,
          type: response.data.type
        }
      };

    } catch (error) {
      console.error(`❌ [ZoomSync] Connection test failed:`, error.message);
      return { 
        success: false, 
        error: error.response?.data?.message || error.message,
        statusCode: error.response?.status
      };
    }
  }

  async fetchWebinarsWithRetry(credentials, syncType) {
    let lastError;
    
    for (let attempt = 1; attempt <= this.MAX_RETRIES; attempt++) {
      try {
        console.log(`📡 [ZoomSync] Fetching webinars (attempt ${attempt}/${this.MAX_RETRIES})`);
        
        const token = await zoomService.getAccessToken(credentials);
        const options = {
          headers: { Authorization: `Bearer ${token}` },
          timeout: this.REQUEST_TIMEOUT
        };

        // Determine date range for incremental sync
        let url = 'https://api.zoom.us/v2/users/me/webinars?page_size=300';
        if (syncType === 'incremental') {
          const fromDate = new Date();
          fromDate.setDate(fromDate.getDate() - 30); // Last 30 days for incremental
          url += `&from=${fromDate.toISOString().split('T')[0]}`;
        }

        const response = await Promise.race([
          axios.get(url, options),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Webinar fetch timeout')), this.REQUEST_TIMEOUT)
          )
        ]);

        console.log(`✅ [ZoomSync] Successfully fetched ${response.data.webinars?.length || 0} webinars`);
        return response.data.webinars || [];

      } catch (error) {
        lastError = error;
        console.error(`❌ [ZoomSync] Webinar fetch attempt ${attempt} failed:`, error.message);
        
        if (attempt < this.MAX_RETRIES) {
          console.log(`⏳ [ZoomSync] Retrying in ${this.RETRY_DELAY}ms...`);
          await new Promise(resolve => setTimeout(resolve, this.RETRY_DELAY));
        }
      }
    }

    throw new Error(`Failed to fetch webinars after ${this.MAX_RETRIES} attempts: ${lastError.message}`);
  }

  async syncSingleWebinarWithRetry(webinar, connectionId, credentials) {
    let lastError;
    
    for (let attempt = 1; attempt <= this.MAX_RETRIES; attempt++) {
      try {
        console.log(`🔄 [ZoomSync] Syncing webinar ${webinar.id} (attempt ${attempt})`);
        
        // Store basic webinar info
        await supabaseService.upsertWebinar(webinar, connectionId);
        
        // Fetch additional data if webinar has occurred
        if (webinar.status === 'ended') {
          await this.syncWebinarDetails(webinar.id, credentials);
        }
        
        console.log(`✅ [ZoomSync] Successfully synced webinar ${webinar.id}`);
        return;

      } catch (error) {
        lastError = error;
        console.error(`❌ [ZoomSync] Webinar sync attempt ${attempt} failed:`, error.message);
        
        if (attempt < this.MAX_RETRIES) {
          await new Promise(resolve => setTimeout(resolve, this.RETRY_DELAY));
        }
      }
    }

    throw new Error(`Failed to sync webinar ${webinar.id} after ${this.MAX_RETRIES} attempts: ${lastError.message}`);
  }

  async syncWebinarDetails(webinarId, credentials) {
    try {
      const token = await zoomService.getAccessToken(credentials);
      const headers = { Authorization: `Bearer ${token}` };

      // Fetch participants, registrants, polls, Q&A in parallel with timeouts
      const [participants, registrants, polls, qa] = await Promise.allSettled([
        this.fetchWithTimeout(`https://api.zoom.us/v2/report/webinars/${webinarId}/participants`, headers),
        this.fetchWithTimeout(`https://api.zoom.us/v2/webinars/${webinarId}/registrants`, headers),
        this.fetchWithTimeout(`https://api.zoom.us/v2/webinars/${webinarId}/polls`, headers),
        this.fetchWithTimeout(`https://api.zoom.us/v2/webinars/${webinarId}/qa`, headers)
      ]);

      // Store the data that was successfully fetched
      if (participants.status === 'fulfilled' && participants.value.data) {
        await supabaseService.upsertParticipants(participants.value.data.participants, webinarId);
      }

      if (registrants.status === 'fulfilled' && registrants.value.data) {
        await supabaseService.upsertRegistrants(registrants.value.data.registrants, webinarId);
      }

      // Handle polls and Q&A similarly...

    } catch (error) {
      console.error(`❌ [ZoomSync] Failed to sync details for webinar ${webinarId}:`, error.message);
      // Don't throw - this is additional data, not critical
    }
  }

  async fetchWithTimeout(url, headers) {
    return Promise.race([
      axios.get(url, { headers, timeout: this.REQUEST_TIMEOUT }),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error(`Request timeout: ${url}`)), this.REQUEST_TIMEOUT)
      )
    ]);
  }
}

module.exports = new ZoomSyncService();
