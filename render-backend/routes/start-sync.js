
const express = require('express');
const { v4: uuidv4 } = require('uuid');
const router = express.Router();
const supabaseService = require('../services/supabaseService');
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

    // Verify connection ownership
    const connection = await supabaseService.getZoomConnection(connection_id);
    
    if (connection.user_id !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied to this connection'
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

    // In a real implementation, you would start the actual sync process here
    // For now, we'll simulate starting the sync
    console.log('Sync operation queued with ID:', syncId);

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

module.exports = router;
