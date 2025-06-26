
const express = require('express');
const router = express.Router();
const { supabaseService } = require('../services/supabaseService');
const { authMiddleware, extractUser } = require('../middleware/auth');

router.post('/cancel-sync/:syncId', authMiddleware, extractUser, async (req, res) => {
  const requestId = req.requestId || Math.random().toString(36).substring(7);
  
  try {
    const { syncId } = req.params;
    const userId = req.userId;

    console.log(`🛑 [${requestId}] Cancelling sync: ${syncId} for user: ${userId}`);

    // Get sync log and verify ownership through connection
    const syncLog = await supabaseService.getSyncLog(syncId);
    
    if (!syncLog) {
      console.error(`❌ [${requestId}] Sync log not found: ${syncId}`);
      return res.status(404).json({
        success: false,
        error: 'Sync operation not found',
        requestId
      });
    }

    const connection = await supabaseService.getZoomConnection(syncLog.connection_id);
    
    if (!connection || connection.user_id !== userId) {
      console.error(`❌ [${requestId}] Access denied to sync operation`);
      return res.status(403).json({
        success: false,
        error: 'Access denied to this sync operation',
        requestId
      });
    }

    // Update sync log to cancelled status
    await supabaseService.updateSyncLog(syncId, {
      sync_status: 'cancelled',
      status: 'cancelled',
      completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });

    console.log(`✅ [${requestId}] Sync cancelled successfully`);

    res.json({
      success: true,
      message: 'Sync operation cancelled',
      syncId,
      requestId
    });

  } catch (error) {
    console.error(`💥 [${requestId}] Cancel sync error:`, error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to cancel sync',
      requestId
    });
  }
});

module.exports = router;
