
const express = require('express');
const router = express.Router();
const supabaseService = require('../services/supabaseService');
const { authMiddleware, extractUser } = require('../middleware/auth');

router.get('/:syncId', authMiddleware, extractUser, async (req, res) => {
  try {
    const { syncId } = req.params;
    const userId = req.userId;

    console.log('Getting sync progress for:', syncId, 'user:', userId);

    // Get sync log and verify ownership through connection
    const syncLog = await supabaseService.getSyncLog(syncId);
    
    if (!syncLog) {
      return res.status(404).json({
        success: false,
        error: 'Sync operation not found'
      });
    }

    const connection = await supabaseService.getZoomConnection(syncLog.connection_id);
    
    if (connection.user_id !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied to this sync operation'
      });
    }

    // Calculate progress percentage
    const totalItems = syncLog.total_items || 0;
    const processedItems = syncLog.processed_items || 0;
    const progress = totalItems > 0 ? Math.round((processedItems / totalItems) * 100) : 0;

    // Determine current operation message
    let currentOperation = 'Initializing...';
    if (syncLog.sync_stage) {
      switch (syncLog.sync_stage) {
        case 'authenticating':
          currentOperation = 'Authenticating with Zoom...';
          break;
        case 'fetching_webinars':
          currentOperation = 'Fetching webinars from Zoom...';
          break;
        case 'processing_webinars':
          currentOperation = `Processing webinars (${processedItems}/${totalItems})`;
          break;
        case 'completed':
          currentOperation = 'Sync completed successfully';
          break;
        case 'failed':
          currentOperation = 'Sync failed';
          break;
        default:
          currentOperation = syncLog.sync_stage;
      }
    }

    // Handle different sync statuses
    let status = syncLog.sync_status;
    if (status === 'pending') {
      currentOperation = 'Sync queued, starting soon...';
    } else if (status === 'running' || status === 'in_progress') {
      status = 'running';
    }

    // Return detailed progress information
    res.json({
      success: true,
      progress: Math.max(0, Math.min(100, syncLog.stage_progress_percentage || progress)),
      status: status,
      currentOperation: currentOperation,
      sync_id: syncId,
      total_items: totalItems,
      processed_items: processedItems,
      started_at: syncLog.started_at,
      completed_at: syncLog.completed_at,
      error_message: syncLog.error_message,
      metadata: syncLog.metadata || {}
    });

  } catch (error) {
    console.error('Sync progress error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get sync progress'
    });
  }
});

module.exports = router;
