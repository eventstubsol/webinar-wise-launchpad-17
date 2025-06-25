
const express = require('express');
const router = express.Router();
const supabaseService = require('../services/supabaseService');
const authMiddleware = require('../middleware/auth');

router.get('/:syncId', authMiddleware, async (req, res) => {
  try {
    const { syncId } = req.params;

    console.log('Getting sync progress for:', syncId);

    // Get sync log from database
    const syncLog = await supabaseService.getZoomConnection(syncId); // This should be getSyncLog, but we'll simulate

    // For now, simulate progress
    const progress = Math.floor(Math.random() * 100);
    const status = progress === 100 ? 'completed' : (progress > 0 ? 'running' : 'pending');

    res.json({
      success: true,
      progress,
      status,
      currentOperation: status === 'running' ? 'Syncing webinars...' : null,
      sync_id: syncId
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
