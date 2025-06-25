
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
        user_id: userId
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
      sync_stage: 'fetching_webinars',
      stage_progress_percentage: 15
    });

    // Fetch all webinars
    console.log('Fetching webinars from Zoom API...');
    const webinars = await zoomService.getAllWebinars(accessToken, {
      type: 'all' // Get all webinars (scheduled, live, ended)
    });

    console.log(`Found ${webinars.length} webinars to sync`);

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
          // Store webinar in database
          await storeWebinar(webinar, connection.id);
          
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
        stage_progress_percentage: progressPercentage,
        current_webinar_id: batch[batch.length - 1]?.id?.toString()
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
        completed_at: new Date().toISOString()
      }
    });

    // Update connection last sync time
    await supabaseService.updateZoomConnection(connection.id, {
      last_sync_at: new Date().toISOString()
    });

    console.log(`✅ Sync completed successfully. Processed ${processedCount}/${webinars.length} webinars`);

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

// Helper function to store webinar data
async function storeWebinar(webinar, connectionId) {
  // This would integrate with your Supabase service to store webinar data
  // For now, just log the operation
  console.log(`Storing webinar: ${webinar.id} - ${webinar.topic}`);
  
  // TODO: Implement actual database storage
  // await supabaseService.storeWebinar({
  //   webinar_id: webinar.id,
  //   connection_id: connectionId,
  //   topic: webinar.topic,
  //   start_time: webinar.start_time,
  //   duration: webinar.duration,
  //   status: webinar.status,
  //   // ... other fields
  // });
}

// Helper function to store participants
async function storeParticipants(participants, webinarId, connectionId) {
  console.log(`Storing ${participants.length} participants for webinar ${webinarId}`);
  // TODO: Implement participant storage
}

// Helper function to store registrants
async function storeRegistrants(registrants, webinarId, connectionId) {
  console.log(`Storing ${registrants.length} registrants for webinar ${webinarId}`);
  // TODO: Implement registrant storage
}

module.exports = router;
