
const express = require('express');
const router = express.Router();
const supabaseService = require('../services/supabaseService');
const { authMiddleware, extractUser } = require('../middleware/auth');

router.post('/', authMiddleware, extractUser, async (req, res) => {
  try {
    const { connection_id } = req.body;
    const userId = req.userId;

    if (!connection_id) {
      return res.status(400).json({
        success: false,
        error: 'Missing connection_id'
      });
    }

    console.log('Disconnecting Zoom account:', connection_id, 'for user:', userId);

    // Verify connection ownership before deletion
    const connection = await supabaseService.getZoomConnection(connection_id);
    
    if (connection.user_id !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied to this connection'
      });
    }

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
