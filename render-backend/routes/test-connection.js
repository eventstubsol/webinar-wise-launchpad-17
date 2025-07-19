
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

    console.log('Testing connection:', connection_id, 'for user:', userId);

    // Get connection and verify ownership
    const connection = await supabaseService.getZoomConnection(connection_id);
    
    if (connection.user_id !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied to this connection'
      });
    }

    // Get Zoom credentials
    const credentials = await supabaseService.getZoomCredentials(userId);
    if (!credentials) {
      return res.status(400).json({
        success: false,
        error: 'Zoom credentials not found'
      });
    }

    // Test the connection
    console.log('Testing Zoom API connection...');
    const startTime = Date.now();
    
    try {
      // Get access token
      const token = await zoomService.getAccessToken(credentials);
      if (!token) {
        throw new Error('Failed to obtain access token');
      }

      // Test API call
      const axios = require('axios');
      const response = await Promise.race([
        axios.get('https://api.zoom.us/v2/users/me', {
          headers: { Authorization: `Bearer ${token}` },
          timeout: 10000
        }),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('API call timeout')), 10000)
        )
      ]);

      const responseTime = Date.now() - startTime;
      
      console.log(`Connection test successful in ${responseTime}ms for user: ${response.data.email}`);

      res.json({
        success: true,
        message: 'Zoom connection is working properly',
        userInfo: {
          email: response.data.email,
          account_id: response.data.account_id,
          type: response.data.type,
          plan_type: response.data.plan_type
        },
        responseTime,
        statusCode: 200
      });

    } catch (apiError) {
      const responseTime = Date.now() - startTime;
      console.error('Zoom API test failed:', apiError.message);
      
      let statusCode = 500;
      let errorMessage = apiError.message;
      
      if (apiError.response?.status === 401) {
        statusCode = 401;
        errorMessage = 'Invalid Zoom credentials or expired token';
      } else if (apiError.response?.status === 403) {
        statusCode = 403;
        errorMessage = 'Insufficient permissions for Zoom API';
      } else if (apiError.message.includes('timeout')) {
        statusCode = 408;
        errorMessage = 'Zoom API request timeout';
      }

      res.status(statusCode).json({
        success: false,
        error: errorMessage,
        statusCode,
        responseTime,
        details: {
          originalError: apiError.response?.data || apiError.message,
          endpoint: 'https://api.zoom.us/v2/users/me'
        }
      });
    }

  } catch (error) {
    console.error('Connection test error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Connection test failed'
    });
  }
});

module.exports = router;
