
const express = require('express');
const router = express.Router();
const zoomService = require('../services/zoomService');
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

    console.log('Running performance test for connection:', connection_id, 'user:', userId);

    // Get connection and verify ownership
    const connection = await supabaseService.getZoomConnection(connection_id);
    
    if (connection.user_id !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied to this connection'
      });
    }

    const startTime = Date.now();

    // Test various API endpoints
    const tests = [];
    
    try {
      const userInfo = await zoomService.makeAuthenticatedRequest('/users/me', connection.access_token);
      tests.push({ endpoint: '/users/me', success: true, response_time: Date.now() - startTime });
    } catch (error) {
      tests.push({ endpoint: '/users/me', success: false, error: error.message });
    }

    try {
      const webinars = await zoomService.getWebinars(connection.access_token, { page_size: 5 });
      tests.push({ endpoint: '/users/me/webinars', success: true, count: webinars.webinars?.length || 0 });
    } catch (error) {
      tests.push({ endpoint: '/users/me/webinars', success: false, error: error.message });
    }

    const totalTime = Date.now() - startTime;

    res.json({
      success: true,
      message: 'Performance test completed',
      results: {
        total_time_ms: totalTime,
        tests_run: tests.length,
        tests_passed: tests.filter(t => t.success).length,
        tests_failed: tests.filter(t => !t.success).length,
        details: tests
      }
    });

  } catch (error) {
    console.error('Performance test error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Performance test failed'
    });
  }
});

module.exports = router;
