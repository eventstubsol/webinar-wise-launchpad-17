
const express = require('express');
const router = express.Router();
const zoomService = require('../services/zoomService');
const supabaseService = require('../services/supabaseService');
const authMiddleware = require('../middleware/auth');

router.post('/', authMiddleware, async (req, res) => {
  try {
    const { refresh_token, connection_id } = req.body;

    if (!refresh_token) {
      return res.status(400).json({
        success: false,
        error: 'Missing refresh_token'
      });
    }

    console.log('Refreshing Zoom token for connection:', connection_id);

    // Refresh token with Zoom
    const tokenData = await zoomService.refreshToken(refresh_token);

    // Update connection in database if connection_id provided
    if (connection_id) {
      const updates = {
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token || refresh_token,
        token_expires_at: new Date(Date.now() + (tokenData.expires_in * 1000)).toISOString(),
        updated_at: new Date().toISOString()
      };

      const connection = await supabaseService.updateZoomConnection(connection_id, updates);
      
      res.json({
        success: true,
        message: 'Token refreshed successfully',
        connection: {
          id: connection.id,
          token_expires_at: connection.token_expires_at,
          updated_at: connection.updated_at
        }
      });
    } else {
      res.json({
        success: true,
        message: 'Token refreshed successfully',
        tokenData: {
          access_token: tokenData.access_token,
          expires_in: tokenData.expires_in,
          token_type: tokenData.token_type
        }
      });
    }

  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to refresh token'
    });
  }
});

module.exports = router;
