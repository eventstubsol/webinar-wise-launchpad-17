const express = require('express');
const router = express.Router();
const { supabaseService } = require('../services/supabaseService');
const { extractUser } = require('../middleware/auth');

router.get('/sync-progress/:syncId', extractUser, async (req, res) => {
  const requestId = req.requestId || Math.random().toString(36).substring(7);
  const { syncId } = req.params;
  
  console.log(`📊 [${requestId}] GET /sync-progress/${syncId}`);

  try {
    const userId = req.userId;

    if (!syncId) {
      return res.status(400).json({
        success: false,
        error: 'Missing syncId parameter',
        requestId
      });
    }

    // Get sync log with connection info to verify ownership
    console.log(`🔍 [${requestId}] Fetching sync log...`);
    const syncLog = await supabaseService.getSyncLogWithConnection(syncId, userId);
    
    if (!syncLog) {
      console.error(`❌ [${requestId}] Sync log not found or access denied`);
      return res.status(404).json({
        success: false,
        error: 'Sync log not found or access denied',
        requestId
      });
    }

    console.log(`✅ [${requestId}] Found sync log:`, {
      id: syncLog.id,
      status: syncLog.sync_status,
      started_at: syncLog.started_at,
      total_items: syncLog.total_items,
      processed_items: syncLog.processed_items,
      current_operation: syncLog.current_operation,
      sync_progress: syncLog.sync_progress
    });

    // Use sync_progress from database if available, otherwise calculate
    let progress = syncLog.sync_progress || 0;
    
    // If sync_progress is not set but we have items, calculate it
    if (!syncLog.sync_progress && syncLog.total_items > 0) {
      progress = Math.round((syncLog.processed_items / syncLog.total_items) * 100);
    } else if (syncLog.sync_status === 'completed' || syncLog.status === 'completed') {
      progress = 100;
    } else if (syncLog.sync_status === 'running' && progress === 0) {
      // If running but no progress yet, show at least 5%
      progress = 5;
    }

    // Use current_operation from database if available
    let currentOperation = syncLog.current_operation || 'Initializing...';
    
    // Fallback to generating operation message if not in database
    if (!syncLog.current_operation) {
      if (syncLog.sync_status === 'completed' || syncLog.status === 'completed') {
        currentOperation = `Sync completed successfully! Processed ${syncLog.processed_items || 0} webinars.`;
      } else if (syncLog.sync_status === 'failed') {
        currentOperation = 'Sync failed';
      } else if (syncLog.sync_status === 'cancelled') {
        currentOperation = 'Sync was cancelled';
      } else if (syncLog.sync_status === 'running') {
        if (syncLog.total_items > 0) {
          currentOperation = `Processing webinars (${syncLog.processed_items}/${syncLog.total_items})`;
        } else {
          currentOperation = 'Fetching webinar data...';
        }
      }
    }

    // Calculate duration
    const startTime = new Date(syncLog.started_at);
    const endTime = syncLog.completed_at ? new Date(syncLog.completed_at) : new Date();
    const duration = Math.round((endTime - startTime) / 1000); // in seconds

    const response = {
      success: true,
      syncId: syncLog.id,
      status: syncLog.sync_status || syncLog.status || 'pending',
      progress: progress,
      currentOperation: currentOperation,
      totalItems: syncLog.total_items || 0,
      processedItems: syncLog.processed_items || 0,
      startedAt: syncLog.started_at,
      completedAt: syncLog.completed_at,
      duration: duration,
      error: syncLog.error_message || null,
      metadata: syncLog.metadata || {},
      connectionId: syncLog.connection_id,
      requestId
    };

    console.log(`📊 [${requestId}] Returning sync progress:`, {
      status: response.status,
      progress: response.progress,
      currentOperation: response.currentOperation
    });

    res.json(response);

  } catch (error) {
    console.error(`💥 [${requestId}] Get sync progress error:`, {
      message: error.message,
      stack: process.env.NODE_ENV === 'production' ? 'Hidden in production' : error.stack
    });

    res.status(500).json({
      success: false,
      error: error.message || 'Internal server error',
      requestId
    });
  }
});

// Get recent sync logs for a connection
router.get('/sync-logs/:connectionId', extractUser, async (req, res) => {
  const requestId = req.requestId || Math.random().toString(36).substring(7);
  const { connectionId } = req.params;
  const { limit = 10 } = req.query;
  
  console.log(`📜 [${requestId}] GET /sync-logs/${connectionId}`);

  try {
    const userId = req.userId;

    // Verify connection ownership
    const connection = await supabaseService.getConnectionById(connectionId, userId);
    
    if (!connection) {
      return res.status(404).json({
        success: false,
        error: 'Connection not found or access denied',
        requestId
      });
    }

    // Get recent sync logs
    const syncLogs = await supabaseService.getRecentSyncLogs(connectionId, parseInt(limit));

    console.log(`✅ [${requestId}] Found ${syncLogs.length} sync logs`);

    res.json({
      success: true,
      syncLogs: syncLogs,
      connectionId: connectionId,
      requestId
    });

  } catch (error) {
    console.error(`💥 [${requestId}] Get sync logs error:`, {
      message: error.message,
      stack: process.env.NODE_ENV === 'production' ? 'Hidden in production' : error.stack
    });

    res.status(500).json({
      success: false,
      error: error.message || 'Internal server error',
      requestId
    });
  }
});

module.exports = router;
