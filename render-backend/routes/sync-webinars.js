
const express = require('express');
const { v4: uuidv4 } = require('uuid');
const router = express.Router();
const zoomService = require('../services/zoomService');
const zoomSyncService = require('../services/zoomSyncService');
const supabaseService = require('../services/supabaseService');
const { authMiddleware, extractUser } = require('../middleware/auth');

router.post('/', authMiddleware, extractUser, async (req, res) => {
  try {
    const { 
      connection_id, 
      type = 'manual', 
      webinarId, 
      debug = false, 
      testMode = false,
      priority = 'normal' 
    } = req.body;
    const userId = req.userId;

    if (!connection_id) {
      return res.status(400).json({
        success: false,
        error: 'Missing connection_id'
      });
    }

    console.log('Syncing webinars for connection:', connection_id, 'user:', userId);

    // Get connection and verify ownership
    const connection = await supabaseService.getZoomConnection(connection_id);
    
    if (connection.user_id !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied to this connection'
      });
    }

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
        sync_id: syncId,
        user_id: userId
      }
    };

    await supabaseService.createSyncLog(syncLogData);

    // Start webinar sync process
    try {
      // Get Zoom credentials
      const credentials = await supabaseService.getZoomCredentials(userId);
      if (!credentials) {
        throw new Error('Zoom credentials not found. Please set up your Zoom credentials first.');
      }

      // Progress callback function
      const onProgress = async (progress, operation) => {
        await supabaseService.updateSyncLog(syncId, {
          sync_progress: progress,
          current_operation: operation,
          updated_at: new Date().toISOString()
        });
      };

      // Start the sync
      const syncResults = await zoomSyncService.syncWebinars({
        connection,
        credentials,
        syncLogId: syncId,
        syncType: type,
        onProgress
      });

      // Update sync log as completed
      await supabaseService.updateSyncLog(syncId, {
        sync_status: 'completed',
        status: 'completed',
        completed_at: new Date().toISOString(),
        processed_items: syncResults.processedWebinars,
        total_items: syncResults.totalWebinars,
        webinars_synced: syncResults.processedWebinars,
        error_details: syncResults.errors,
        sync_progress: 100,
        current_operation: 'Sync completed successfully'
      });

      console.log('Sync completed:', syncResults);

    } catch (syncError) {
      console.error('Sync error:', syncError);
      
      // Update sync log as failed
      await supabaseService.updateSyncLog(syncId, {
        sync_status: 'failed',
        status: 'failed',
        error_message: `Sync error: ${syncError.message}`,
        completed_at: new Date().toISOString(),
        sync_progress: 0,
        current_operation: 'Sync failed'
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
