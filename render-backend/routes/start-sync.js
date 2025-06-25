const express = require('express');
const { v4: uuidv4 } = require('uuid');
const router = express.Router();
const supabaseService = require('../services/supabaseService');
const zoomService = require('../services/zoomService');
const { authMiddleware, extractUser } = require('../middleware/auth');

router.post('/', authMiddleware, extractUser, async (req, res) => {
  try {
    const { connection_id, sync_type = 'manual' } = req.body;
    const userId = req.userId;

    if (!connection_id) {
      return res.status(400).json({
        success: false,
        error: 'Missing connection_id'
      });
    }

    console.log('Starting sync for connection:', connection_id, 'type:', sync_type, 'user:', userId);

    // Get connection and verify ownership
    const connection = await supabaseService.getZoomConnection(connection_id);
    
    if (connection.user_id !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied to this connection'
      });
    }

    // Get user credentials
    const credentials = await supabaseService.getUserCredentials(userId);
    if (!credentials) {
      return res.status(400).json({
        success: false,
        error: 'No Zoom credentials found. Please configure your credentials first.'
      });
    }

    // Create sync log entry
    const syncId = uuidv4();
    const syncLogData = {
      id: syncId,
      connection_id,
      sync_type,
      sync_status: 'pending',
      status: 'pending',
      started_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      total_items: 0,
      processed_items: 0,
      metadata: {
        requested_at: new Date().toISOString(),
        sync_id: syncId,
        user_id: userId,
        date_range: '90 days past to 90 days future'
      }
    };

    await supabaseService.createSyncLog(syncLogData);

    // Start the sync process asynchronously
    performWebinarSync(syncId, connection, credentials, sync_type)
      .catch(error => {
        console.error('Sync process failed:', error);
        // Update sync log with error
        supabaseService.updateSyncLog(syncId, {
          sync_status: 'failed',
          status: 'failed',
          error_message: error.message,
          completed_at: new Date().toISOString()
        }).catch(logError => {
          console.error('Failed to update sync log with error:', logError);
        });
      });

    res.json({
      success: true,
      message: 'Sync operation started',
      syncId,
      sync_type,
      status: 'pending'
    });

  } catch (error) {
    console.error('Start sync error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to start sync'
    });
  }
});

// Async function to perform the actual sync
async function performWebinarSync(syncId, connection, credentials, syncType) {
  console.log(`🚀 Starting webinar sync process for sync ID: ${syncId}`);
  
  try {
    // Update status to running
    await supabaseService.updateSyncLog(syncId, {
      sync_status: 'running',
      status: 'running',
      sync_stage: 'authenticating',
      stage_progress_percentage: 5
    });

    // Get access token
    console.log('Getting Zoom access token...');
    const accessToken = await zoomService.getAccessToken(credentials);
    
    // Update progress
    await supabaseService.updateSyncLog(syncId, {
      sync_stage: 'calculating_date_range',
      stage_progress_percentage: 10
    });

    // Calculate date range (90 days past to 90 days future)
    const now = new Date();
    const fromDate = new Date(now.getTime() - (90 * 24 * 60 * 60 * 1000)); // 90 days ago
    const toDate = new Date(now.getTime() + (90 * 24 * 60 * 60 * 1000));   // 90 days future
    
    console.log(`📅 Sync date range: ${fromDate.toISOString().split('T')[0]} to ${toDate.toISOString().split('T')[0]}`);

    // Update progress
    await supabaseService.updateSyncLog(syncId, {
      sync_stage: 'fetching_webinars',
      stage_progress_percentage: 15,
      metadata: {
        date_range_from: fromDate.toISOString(),
        date_range_to: toDate.toISOString(),
        sync_type: syncType
      }
    });

    // Fetch all webinars with date range
    console.log('Fetching webinars from Zoom API with 90-day range...');
    const webinars = await zoomService.getAllWebinars(accessToken, {
      from: fromDate,
      to: toDate
    });

    console.log(`📊 Found ${webinars.length} webinars to sync in date range`);

    // Update total items
    await supabaseService.updateSyncLog(syncId, {
      total_items: webinars.length,
      sync_stage: 'processing_webinars',
      stage_progress_percentage: 25
    });

    let processedCount = 0;
    let errorCount = 0;

    // Process webinars in batches
    const batchSize = 5;
    for (let i = 0; i < webinars.length; i += batchSize) {
      const batch = webinars.slice(i, Math.min(i + batchSize, webinars.length));
      
      console.log(`Processing batch ${Math.floor(i/batchSize) + 1}, webinars ${i + 1}-${Math.min(i + batchSize, webinars.length)}`);

      // Process batch
      for (const webinar of batch) {
        try {
          // Store webinar in database with enhanced detail fetching
          await storeWebinar(webinar, connection.id, accessToken);
          
          // Optionally fetch participants and registrants for completed webinars
          if (webinar.status === 'ended') {
            try {
              const [participants, registrants] = await Promise.all([
                zoomService.getWebinarParticipants(accessToken, webinar.id),
                zoomService.getWebinarRegistrants(accessToken, webinar.id)
              ]);

              // Store participants and registrants
              await storeParticipants(participants.participants || [], webinar.id, connection.id);
              await storeRegistrants(registrants.registrants || [], webinar.id, connection.id);
            } catch (detailError) {
              console.warn(`Failed to fetch details for webinar ${webinar.id}:`, detailError.message);
            }
          }

          processedCount++;
        } catch (webinarError) {
          console.error(`Failed to process webinar ${webinar.id}:`, webinarError.message);
          errorCount++;
        }
      }

      // Update progress
      const progressPercentage = 25 + Math.round((processedCount / webinars.length) * 70);
      await supabaseService.updateSyncLog(syncId, {
        processed_items: processedCount,
        stage_progress_percentage: progressPercentage
      });

      // Small delay to avoid overwhelming the API
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Complete the sync
    await supabaseService.updateSyncLog(syncId, {
      sync_status: 'completed',
      status: 'completed',
      completed_at: new Date().toISOString(),
      sync_stage: 'completed',
      stage_progress_percentage: 100,
      processed_items: processedCount,
      metadata: {
        total_webinars: webinars.length,
        processed_count: processedCount,
        error_count: errorCount,
        date_range_from: fromDate.toISOString(),
        date_range_to: toDate.toISOString(),
        completed_at: new Date().toISOString(),
        sync_duration_days: 180 // 90 days past + 90 days future
      }
    });

    // Update connection last sync time
    await supabaseService.updateZoomConnection(connection.id, {
      last_sync_at: new Date().toISOString()
    });

    console.log(`✅ Sync completed successfully. Processed ${processedCount}/${webinars.length} webinars from 90-day range`);

  } catch (error) {
    console.error('Sync process failed:', error);
    
    await supabaseService.updateSyncLog(syncId, {
      sync_status: 'failed',
      status: 'failed',
      error_message: error.message,
      completed_at: new Date().toISOString(),
      sync_stage: 'failed',
      stage_progress_percentage: 0
    });

    throw error;
  }
}

// Helper function to store webinar data with enhanced detail fetching
async function storeWebinar(webinar, connectionId, accessToken) {
  console.log(`📝 Storing webinar: ${webinar.id} - ${webinar.topic}`);
  
  try {
    // Fetch detailed webinar information to get complete data
    const webinarDetails = await zoomService.getWebinarDetails(accessToken, webinar.id);
    
    // Merge data from list response and detailed response
    const mergedWebinar = { ...webinar };
    
    if (webinarDetails) {
      console.log(`🔗 Merging detailed info for webinar: ${webinar.id}`);
      
      // Extract host email from detailed response
      if (webinarDetails.host_email) {
        mergedWebinar.host_email = webinarDetails.host_email;
        console.log(`✅ Found host_email: ${webinarDetails.host_email}`);
      }
      
      // Extract registration URL if registration is enabled
      if (webinarDetails.settings?.registration_type && webinarDetails.settings.registration_type > 0) {
        if (webinarDetails.registration_url) {
          mergedWebinar.registration_url = webinarDetails.registration_url;
          console.log(`✅ Found registration_url: ${webinarDetails.registration_url}`);
        }
      }
      
      // Log the structure for debugging if fields are still missing
      if (!webinarDetails.host_email) {
        console.warn(`⚠️ host_email not found in detailed response for webinar ${webinar.id}`);
        console.log('Available fields in webinar details:', Object.keys(webinarDetails));
      }
      
      // Merge other potentially useful fields from detailed response
      if (webinarDetails.agenda && !mergedWebinar.agenda) {
        mergedWebinar.agenda = webinarDetails.agenda;
      }
      
      if (webinarDetails.timezone && !mergedWebinar.timezone) {
        mergedWebinar.timezone = webinarDetails.timezone;
      }
    } else {
      console.warn(`⚠️ Could not fetch detailed info for webinar ${webinar.id}, using basic data only`);
    }
    
    // Transform merged webinar data to database format
    const webinarData = {
      connection_id: connectionId,
      zoom_webinar_id: mergedWebinar.id?.toString() || mergedWebinar.webinar_id?.toString(),
      webinar_id: mergedWebinar.id?.toString() || mergedWebinar.webinar_id?.toString(),
      zoom_uuid: mergedWebinar.uuid || null,
      host_id: mergedWebinar.host_id || '',
      host_email: mergedWebinar.host_email || '', // Now should be populated from detailed response
      topic: mergedWebinar.topic || 'Untitled Webinar',
      agenda: mergedWebinar.agenda || null,
      webinar_type: mergedWebinar.type || 5,
      status: mergedWebinar.status || 'available',
      start_time: mergedWebinar.start_time || new Date().toISOString(),
      duration: mergedWebinar.duration || 60,
      timezone: mergedWebinar.timezone || 'UTC',
      registration_url: mergedWebinar.registration_url || null, // Now should be populated from detailed response
      join_url: mergedWebinar.join_url || '',
      synced_at: new Date().toISOString(),
      participant_sync_status: 'not_applicable'
    };

    await supabaseService.storeWebinar(webinarData);
    console.log(`✅ Successfully stored webinar: ${mergedWebinar.id} with enhanced details`);
  } catch (error) {
    console.error(`❌ Failed to store webinar ${webinar.id}:`, error);
    throw error;
  }
}

// Helper function to store participants
async function storeParticipants(participants, webinarId, connectionId) {
  if (!participants || participants.length === 0) {
    console.log(`No participants to store for webinar ${webinarId}`);
    return;
  }

  console.log(`📝 Storing ${participants.length} participants for webinar ${webinarId}`);
  
  try {
    // Get the internal webinar UUID from our database
    const webinarRecord = await supabaseService.getWebinarByZoomId(webinarId, connectionId);
    if (!webinarRecord) {
      console.warn(`Webinar record not found for Zoom ID ${webinarId}`);
      return;
    }

    const participantData = participants.map(participant => ({
      webinar_id: webinarRecord.id,
      participant_uuid: participant.id || participant.participant_uuid,
      name: participant.name || 'Unknown',
      email: participant.email || null,
      user_id: participant.user_id || null,
      registrant_id: participant.registrant_id || null,
      join_time: participant.join_time || null,
      leave_time: participant.leave_time || null,
      duration: participant.duration || 0,
      status: participant.status || 'joined',
      failover: participant.failover || false
    }));

    await supabaseService.storeParticipants(participantData);
    console.log(`✅ Successfully stored ${participants.length} participants`);
  } catch (error) {
    console.error(`❌ Failed to store participants for webinar ${webinarId}:`, error);
    throw error;
  }
}

// Helper function to store registrants
async function storeRegistrants(registrants, webinarId, connectionId) {
  if (!registrants || registrants.length === 0) {
    console.log(`No registrants to store for webinar ${webinarId}`);
    return;
  }

  console.log(`📝 Storing ${registrants.length} registrants for webinar ${webinarId}`);
  
  try {
    // Get the internal webinar UUID from our database
    const webinarRecord = await supabaseService.getWebinarByZoomId(webinarId, connectionId);
    if (!webinarRecord) {
      console.warn(`Webinar record not found for Zoom ID ${webinarId}`);
      return;
    }

    const registrantData = registrants.map(registrant => ({
      webinar_id: webinarRecord.id,
      registrant_id: registrant.id || registrant.registrant_id,
      registrant_uuid: registrant.registrant_uuid || null,
      email: registrant.email || '',
      first_name: registrant.first_name || null,
      last_name: registrant.last_name || null,
      address: registrant.address || null,
      city: registrant.city || null,
      country: registrant.country || null,
      zip: registrant.zip || null,
      state: registrant.state || null,
      phone: registrant.phone || null,
      industry: registrant.industry || null,
      org: registrant.org || null,
      job_title: registrant.job_title || null,
      purchasing_time_frame: registrant.purchasing_time_frame || null,
      role_in_purchase_process: registrant.role_in_purchase_process || null,
      no_of_employees: registrant.no_of_employees || null,
      comments: registrant.comments || null,
      status: registrant.status || 'approved',
      create_time: registrant.create_time || null,
      join_url: registrant.join_url || null,
      custom_questions: registrant.custom_questions || []
    }));

    await supabaseService.storeRegistrants(registrantData);
    console.log(`✅ Successfully stored ${registrants.length} registrants`);
  } catch (error) {
    console.error(`❌ Failed to store registrants for webinar ${webinarId}:`, error);
    throw error;
  }
}

module.exports = router;
