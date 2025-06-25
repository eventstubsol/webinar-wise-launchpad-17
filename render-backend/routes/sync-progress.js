
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
    const connection = await supabaseService.getZoomConnection(syncLog.connection_id);
    
    if (connection.user_id !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied to this sync operation'
      });
    }

    // Return actual sync progress from database
    res.json({
      success: true,
      progress: Math.floor((syncLog.processed_items / Math.max(syncLog.total_items, 1)) * 100),
      status: syncLog.sync_status,
      currentOperation: syncLog.sync_stage || 'Processing...',
      sync_id: syncId,
      total_items: syncLog.total_items,
      processed_items: syncLog.processed_items
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
