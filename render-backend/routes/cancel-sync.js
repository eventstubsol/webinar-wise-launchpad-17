
const express = require('express');
const router = express.Router();
const supabaseService = require('../services/supabaseService');
const authMiddleware = require('../middleware/auth');

router.post('/:syncId', authMiddleware, async (req, res) => {
  try {
    const { syncId } = req.params;

    console.log('Cancelling sync:', syncId);

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
