
const express = require('express');
const { v4: uuidv4 } = require('uuid');
const router = express.Router();
const zoomService = require('../services/zoomService');
const supabaseService = require('../services/supabaseService');
const authMiddleware = require('../middleware/auth');

router.post('/', authMiddleware, async (req, res) => {
  try {
    const { 
      connection_id, 
      type = 'manual', 
      webinarId, 
      debug = false, 
      testMode = false,
      priority = 'normal' 
    } = req.body;

    if (!connection_id) {
      return res.status(400).json({
        success: false,
        error: 'Missing connection_id'
      });
    }

    console.log('Syncing webinars for connection:', connection_id);

    // Get connection details
    const connection = await supabaseService.getZoomConnection(connection_id);

    // Create sync log
    const syncId = uuidv4();
    const syncLogData = {
      id: syncId,
      connection_id,
      sync_type: type,
      sync_status: 'running',
      status: 'running',
      started_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      total_items: 0,
      processed_items: 0,
      metadata: {
        webinarId,
        debug,
        testMode,
        priority,
        sync_id: syncId
      }
    };

    await supabaseService.createSyncLog(syncLogData);

    // Start webinar sync process (simplified for now)
    try {
      if (webinarId) {
        // Sync specific webinar
        const webinar = await zoomService.getWebinar(webinarId, connection.access_token);
        console.log('Synced webinar:', webinar.topic);
      } else {
        // Sync all webinars
        const webinars = await zoomService.getWebinars(connection.access_token, { page_size: 10 });
        console.log('Found webinars:', webinars.webinars?.length || 0);
      }

      // Update sync log as completed
      await supabaseService.updateSyncLog(syncId, {
        sync_status: 'completed',
        status: 'completed',
        completed_at: new Date().toISOString(),
        processed_items: 1
      });

    } catch (syncError) {
      // Update sync log as failed
      await supabaseService.updateSyncLog(syncId, {
        sync_status: 'failed',
        status: 'failed',
        error_message: syncError.message,
        completed_at: new Date().toISOString()
      });
      throw syncError;
    }

    res.json({
      success: true,
      message: 'Webinar sync completed',
      syncId,
      type
    });

  } catch (error) {
    console.error('Sync webinars error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to sync webinars'
    });
  }
});

module.exports = router;
