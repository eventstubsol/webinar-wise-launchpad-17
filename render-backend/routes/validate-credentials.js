
const express = require('express');
const { v4: uuidv4 } = require('uuid');
const router = express.Router();
const zoomService = require('../services/zoomService');
const supabaseService = require('../services/supabaseService');
const { authMiddleware, extractUser } = require('../middleware/auth');

router.post('/', authMiddleware, extractUser, async (req, res) => {
  try {
    const { account_id, client_id, client_secret } = req.body;
    const userId = req.userId; // From extractUser middleware

    if (!account_id || !client_id || !client_secret) {
      return res.status(400).json({
        success: false,
        error: 'Missing required credentials: account_id, client_id, client_secret'
      });
    }

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'User ID required'
      });
    }

    console.log('Validating Zoom credentials for user:', userId);

    // Validate credentials with Zoom using user-provided credentials
    const validation = await zoomService.validateCredentials(account_id, client_id, client_secret);

    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        error: validation.error || 'Invalid Zoom credentials'
      });
    }

    // Create connection record in Supabase with user-specific data
    const connectionData = {
      id: uuidv4(),
      user_id: userId,
      zoom_user_id: validation.userInfo.id,
      zoom_account_id: account_id,
      zoom_email: validation.userInfo.email,
      zoom_account_type: validation.userInfo.type === 1 ? 'Basic' : 'Licensed',
      access_token: validation.tokenData.access_token,
      refresh_token: validation.tokenData.refresh_token || null,
      token_expires_at: new Date(Date.now() + (validation.tokenData.expires_in * 1000)).toISOString(),
      scopes: validation.tokenData.scope ? validation.tokenData.scope.split(' ') : [],
      connection_status: 'active',
      connection_type: 'server_to_server',
      is_primary: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const connection = await supabaseService.createZoomConnection(connectionData);

    console.log('Zoom connection created successfully:', connection.id);

    res.json({
      success: true,
      message: 'Zoom credentials validated and connection established',
      connection: {
        id: connection.id,
        zoom_email: connection.zoom_email,
        zoom_account_type: connection.zoom_account_type,
        connection_status: connection.connection_status,
        created_at: connection.created_at
      }
    });

  } catch (error) {
    console.error('Credential validation error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to validate credentials'
    });
  }
});

module.exports = router;
