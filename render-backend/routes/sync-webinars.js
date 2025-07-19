
const express = require('express');
const { v4: uuidv4 } = require('uuid');
const router = express.Router();
const zoomService = require('../services/zoomService');
const enhancedZoomSyncService = require('../services/enhancedZoomSyncService'); // CHANGED: Use enhanced service
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
      priority = 'normal',
      enhanced = true // NEW: Enable enhanced processing by default
    } = req.body;
    const userId = req.userId;

    if (!connection_id) {
      return res.status(400).json({
        success: false,
        error: 'Missing connection_id'
      });
    }

    console.log(`🚀 Starting ${enhanced ? 'ENHANCED' : 'standard'} sync for connection:`, connection_id, 'user:', userId);

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
      sync_type: enhanced ? `${type}_enhanced` : type, // Mark enhanced syncs
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
        enhanced, // Track enhanced mode
        sync_id: syncId,
        user_id: userId
      }
    };

    await supabaseService.createSyncLog(syncLogData);

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

      let syncResults;

      if (enhanced) {
        // Use enhanced sync service with registrants & participants
        console.log(`🚀 Starting ENHANCED sync with full data fetching...`);
        syncResults = await enhancedZoomSyncService.syncWebinarsWithEnhancedProcessing({
          connection,
          credentials,
          syncLogId: syncId,
          syncType: type,
          onProgress
        });
      } else {
        // Fallback to standard sync
        console.log(`🔄 Starting STANDARD sync (fallback mode)...`);
        const standardZoomSyncService = require('../services/zoomSyncService');
        syncResults = await standardZoomSyncService.syncWebinars({
          connection,
          credentials,
          syncLogId: syncId,
          syncType: type,
          onProgress
        });
      }

      // Update sync log as completed
      await supabaseService.updateSyncLog(syncId, {
        sync_status: 'completed',
        status: 'completed',
        completed_at: new Date().toISOString(),
        processed_items: syncResults.processedWebinars,
        total_items: syncResults.totalWebinars || syncResults.processedWebinars,
        webinars_synced: syncResults.processedWebinars,
        error_details: syncResults.errors,
        sync_progress: 100,
        current_operation: enhanced 
          ? `Enhanced sync completed: ${syncResults.totalRegistrants || 0} registrants, ${syncResults.totalParticipants || 0} participants`
          : 'Standard sync completed successfully'
      });

      console.log(`✅ ${enhanced ? 'Enhanced' : 'Standard'} sync completed:`, syncResults);

      res.json({
        success: true,
        message: `${enhanced ? 'Enhanced webinar sync' : 'Webinar sync'} completed`,
        syncId,
        type: enhanced ? `${type}_enhanced` : type,
        stats: {
          webinars: syncResults.processedWebinars,
          registrants: syncResults.totalRegistrants || 0,
          participants: syncResults.totalParticipants || 0,
          errors: syncResults.errors?.length || 0
        }
      });

    } catch (syncError) {
      console.error(`❌ ${enhanced ? 'Enhanced' : 'Standard'} sync error:`, syncError);
      
      await supabaseService.updateSyncLog(syncId, {
        sync_status: 'failed',
        status: 'failed',
        error_message: `${enhanced ? 'Enhanced' : 'Standard'} sync error: ${syncError.message}`,
        completed_at: new Date().toISOString(),
        sync_progress: 0,
        current_operation: `${enhanced ? 'Enhanced' : 'Standard'} sync failed`
      });
      throw syncError;
    }

  } catch (error) {
    console.error(`❌ Sync webinars error:`, error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to sync webinars'
    });
  }
});

module.exports = router;
