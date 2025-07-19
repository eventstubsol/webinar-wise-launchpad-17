const { EnhancedSyncProcessor } = require('../../../src/services/zoom/processors/enhanced-sync-processor');
const { WebinarStatusFixer } = require('../../../src/services/zoom/processors/webinar-status-fixer');
const supabaseService = require('./supabaseService');
const zoomService = require('./zoomService');

class EnhancedZoomSyncService {
  constructor() {
    this.REQUEST_TIMEOUT = 30000;
    this.MAX_RETRIES = 3;
    this.RETRY_DELAY = 2000;
  }

  async syncWebinarsWithEnhancedProcessing({ connection, credentials, syncLogId, syncType, onProgress }) {
    console.log(`🚀 [EnhancedSync] Starting ${syncType} sync for connection ${connection.id}`);
    
    let processedWebinars = 0;
    let totalRegistrants = 0;
    let totalParticipants = 0;
    let errors = [];

    try {
      // Initialize enhanced processor
      const processor = new EnhancedSyncProcessor(credentials);

      // Update sync log
      await supabaseService.updateSyncLog(syncLogId, {
        sync_progress: 5,
        current_operation: 'Initializing enhanced sync process...',
        updated_at: new Date().toISOString()
      });

      // Fix existing webinar statuses first
      console.log(`🔧 Fixing existing webinar statuses...`);
      await WebinarStatusFixer.fixAllWebinarStatuses(supabaseService.supabase);

      // Test Zoom API connection
      const connectionTest = await this.testZoomConnection(credentials);
      if (!connectionTest.success) {
        throw new Error(`Zoom API connection failed: ${connectionTest.error}`);
      }

      await supabaseService.updateSyncLog(syncLogId, {
        sync_progress: 15,
        current_operation: 'Fetching webinars with enhanced processing...',
        updated_at: new Date().toISOString()
      });

      // Fetch webinars
      const webinars = await this.fetchWebinarsWithRetry(credentials, syncType);
      const totalWebinars = webinars.length;

      console.log(`📊 Found ${totalWebinars} webinars to sync with enhanced processing`);

      await supabaseService.updateSyncLog(syncLogId, {
        sync_progress: 25,
        current_operation: `Processing ${totalWebinars} webinars with registrants & participants...`,
        total_items: totalWebinars,
        updated_at: new Date().toISOString()
      });

      // Process each webinar with enhanced processing
      for (let i = 0; i < webinars.length; i++) {
        const webinar = webinars[i];
        const progressPercent = Math.round(25 + ((i / totalWebinars) * 65)); // 25-90%
        
        try {
          console.log(`🔄 Enhanced processing webinar ${i + 1}/${totalWebinars}: ${webinar.topic}`);
          
          await supabaseService.updateSyncLog(syncLogId, {
            sync_progress: progressPercent,
            current_operation: `Processing: ${webinar.topic} (${i + 1}/${totalWebinars})`,
            processed_items: i,
            updated_at: new Date().toISOString()
          });

          if (onProgress) {
            onProgress(progressPercent, `Processing: ${webinar.topic}`);
          }

          // Use enhanced processor
          const result = await processor.processWebinar(
            supabaseService.supabase,
            webinar,
            connection.id
          );

          if (result.success) {
            processedWebinars++;
            totalRegistrants += result.registrants;
            totalParticipants += result.participants;
            console.log(`✅ Enhanced processing completed: ${result.registrants} registrants, ${result.participants} participants`);
          } else {
            errors.push({
              webinarId: webinar.id,
              webinarTopic: webinar.topic,
              error: result.error,
              timestamp: new Date().toISOString()
            });
          }

        } catch (error) {
          console.error(`❌ Enhanced processing failed for ${webinar.topic}:`, error);
          errors.push({
            webinarId: webinar.id,
            webinarTopic: webinar.topic,
            error: error.message,
            timestamp: new Date().toISOString()
          });
        }

        // Add delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      // Backfill historical data for past webinars
      console.log(`🔄 Starting backfill for historical data...`);
      await supabaseService.updateSyncLog(syncLogId, {
        sync_progress: 90,
        current_operation: 'Backfilling historical participant data...',
        updated_at: new Date().toISOString()
      });

      try {
        const backfillResults = await processor.backfillHistoricalData(
          supabaseService.supabase,
          connection.id
        );
        
        totalRegistrants += backfillResults.registrantsSynced;
        totalParticipants += backfillResults.participantsSynced;
        errors.push(...backfillResults.errors);
        
        console.log(`✅ Backfill completed: ${backfillResults.registrantsSynced} registrants, ${backfillResults.participantsSynced} participants`);
      } catch (backfillError) {
        console.error(`❌ Backfill failed:`, backfillError);
        errors.push({
          webinarId: 'backfill',
          webinarTopic: 'Historical Data Backfill',
          error: backfillError.message,
          timestamp: new Date().toISOString()
        });
      }

      // Final update
      await supabaseService.updateSyncLog(syncLogId, {
        sync_progress: 100,
        current_operation: 'Enhanced sync completed',
        processed_items: processedWebinars,
        updated_at: new Date().toISOString()
      });

      const results = {
        processedWebinars,
        totalWebinars,
        totalRegistrants,
        totalParticipants,
        errors
      };

      console.log(`🎉 Enhanced sync completed:`, results);
      return results;

    } catch (error) {
      console.error(`💥 Enhanced sync critical error:`, error);
      
      await supabaseService.updateSyncLog(syncLogId, {
        sync_progress: 0,
        current_operation: 'Enhanced sync failed',
        error_message: error.message,
        error_details: {
          type: error.name || 'Unknown',
          message: error.message,
          processedWebinars,
          totalRegistrants,
          totalParticipants,
          errors
        },
        updated_at: new Date().toISOString()
      });

      throw error;
    }
  }

  async testZoomConnection(credentials) {
    try {
      console.log(`🔍 Testing enhanced connection with account ID: ${credentials.account_id}`);
      
      const token = await zoomService.getAccessToken(credentials);
      if (!token) {
        return { success: false, error: 'Failed to obtain access token' };
      }

      const response = await Promise.race([
        fetch('https://api.zoom.us/v2/users/me', {
          headers: { Authorization: `Bearer ${token}` }
        }),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Connection test timeout')), 10000)
        )
      ]);

      const userData = await response.json();
      console.log(`✅ Enhanced connection test successful, user: ${userData.email}`);
      
      return { 
        success: true, 
        userInfo: {
          email: userData.email,
          account_id: userData.account_id,
          type: userData.type
        }
      };

    } catch (error) {
      console.error(`❌ Enhanced connection test failed:`, error.message);
      return { 
        success: false, 
        error: error.message,
        statusCode: error.status
      };
    }
  }

  async fetchWebinarsWithRetry(credentials, syncType) {
    let lastError;
    
    for (let attempt = 1; attempt <= this.MAX_RETRIES; attempt++) {
      try {
        console.log(`📡 Enhanced fetching webinars (attempt ${attempt}/${this.MAX_RETRIES})`);
        
        const token = await zoomService.getAccessToken(credentials);
        const options = {
          headers: { Authorization: `Bearer ${token}` },
        };

        let url = 'https://api.zoom.us/v2/users/me/webinars?page_size=300';
        if (syncType === 'incremental') {
          const fromDate = new Date();
          fromDate.setDate(fromDate.getDate() - 30);
          url += `&from=${fromDate.toISOString().split('T')[0]}`;
        }

        const response = await Promise.race([
          fetch(url, options),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Webinar fetch timeout')), this.REQUEST_TIMEOUT)
          )
        ]);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        console.log(`✅ Enhanced fetch successful: ${data.webinars?.length || 0} webinars`);
        return data.webinars || [];

      } catch (error) {
        lastError = error;
        console.error(`❌ Enhanced fetch attempt ${attempt} failed:`, error.message);
        
        if (attempt < this.MAX_RETRIES) {
          console.log(`⏳ Retrying in ${this.RETRY_DELAY}ms...`);
          await new Promise(resolve => setTimeout(resolve, this.RETRY_DELAY));
        }
      }
    }

    throw new Error(`Failed to fetch webinars after ${this.MAX_RETRIES} attempts: ${lastError.message}`);
  }
}

module.exports = new EnhancedZoomSyncService();
