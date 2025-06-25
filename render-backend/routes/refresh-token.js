
const express = require('express');
const router = express.Router();
const zoomService = require('../services/zoomService');
const supabaseService = require('../services/supabaseService');
const { authMiddleware, extractUser } = require('../middleware/auth');

router.post('/', authMiddleware, extractUser, async (req, res) => {
  try {
    const { refresh_token, connection_id } = req.body;
    const userId = req.userId;

    if (!refresh_token || !connection_id) {
      return res.status(400).json({
        success: false,
        error: 'Missing refresh_token or connection_id'
      });
    }

    console.log('Refreshing Zoom token for connection:', connection_id, 'user:', userId);

    // Get connection and credentials, verify ownership
    const { connection, credentials } = await supabaseService.getConnectionWithCredentials(connection_id);
    
    if (connection.user_id !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied to this connection'
      });
    }

    if (!credentials) {
      return res.status(400).json({
        success: false,
        error: 'No credentials found for this connection'
      });
    }

    // Refresh token with user-specific credentials
    const tokenData = await zoomService.refreshTokenWithCredentials(
      refresh_token, 
      credentials.client_id, 
      credentials.client_secret
    );

    // Update connection in database
    const updates = {
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token || refresh_token,
      token_expires_at: new Date(Date.now() + (tokenData.expires_in * 1000)).toISOString(),
      updated_at: new Date().toISOString()
    };

    const updatedConnection = await supabaseService.updateZoomConnection(connection_id, updates);
    
    res.json({
      success: true,
      message: 'Token refreshed successfully',
      connection: {
        id: updatedConnection.id,
        token_expires_at: updatedConnection.token_expires_at,
        updated_at: updatedConnection.updated_at
      }
    });

  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to refresh token'
    });
  }
});

module.exports = router;
