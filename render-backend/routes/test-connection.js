
const express = require('express');
const router = express.Router();
const zoomService = require('../services/zoomService');
const supabaseService = require('../services/supabaseService');
const { authMiddleware, extractUser } = require('../middleware/auth');

router.get('/', authMiddleware, extractUser, async (req, res) => {
  try {
    const { connection_id } = req.query;
    const userId = req.userId;

    if (!connection_id) {
      return res.status(400).json({
        success: false,
        error: 'Missing connection_id parameter'
      });
    }

    console.log('Testing Zoom connection:', connection_id, 'for user:', userId);

    // Get connection and verify ownership
    const connection = await supabaseService.getZoomConnection(connection_id);
    
    if (connection.user_id !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied to this connection'
      });
    }

    // Test the connection by making a simple API call
    const userInfo = await zoomService.makeAuthenticatedRequest('/users/me', connection.access_token);

    res.json({
      success: true,
      message: 'Connection test successful',
      userInfo: {
        id: userInfo.id,
        email: userInfo.email,
        type: userInfo.type,
        account_id: userInfo.account_id
      }
    });

  } catch (error) {
    console.error('Connection test error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Connection test failed'
    });
  }
});

module.exports = router;
