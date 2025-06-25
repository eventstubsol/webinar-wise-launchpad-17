
const express = require('express');
const router = express.Router();
const supabaseService = require('../services/supabaseService');
const { authMiddleware, extractUser } = require('../middleware/auth');

router.post('/:syncId', authMiddleware, extractUser, async (req, res) => {
  try {
    const { syncId } = req.params;
    const userId = req.userId;

    console.log('Cancelling sync:', syncId, 'for user:', userId);

    // Get sync log and verify ownership through connection
    const syncLog = await supabaseService.getSyncLog(syncId);
    const connection = await supabaseService.getZoomConnection(syncLog.connection_id);
    
    if (connection.user_id !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied to this sync operation'
      });
    }

    // Update sync log to cancelled status
    await supabaseService.updateSyncLog(syncId, {
      sync_status: 'cancelled',
      status: 'cancelled',
      completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });

    res.json({
      success: true,
      message: 'Sync operation cancelled',
      syncId
    });

  } catch (error) {
    console.error('Cancel sync error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to cancel sync'
    });
  }
});

module.exports = router;
