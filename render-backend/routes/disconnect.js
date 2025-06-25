
const express = require('express');
const router = express.Router();
const supabaseService = require('../services/supabaseService');
const authMiddleware = require('../middleware/auth');

router.post('/', authMiddleware, async (req, res) => {
  try {
    const { connection_id } = req.body;

    if (!connection_id) {
      return res.status(400).json({
        success: false,
        error: 'Missing connection_id'
      });
    }

    console.log('Disconnecting Zoom account:', connection_id);

    // Delete connection from database
    await supabaseService.deleteZoomConnection(connection_id);

    res.json({
      success: true,
      message: 'Zoom account disconnected successfully'
    });

  } catch (error) {
    console.error('Disconnect error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to disconnect account'
    });
  }
});

module.exports = router;
