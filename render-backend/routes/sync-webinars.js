
const express = require('express');
const { v4: uuidv4 } = require('uuid');
const router = express.Router();
const { authMiddleware, extractUser } = require('../middleware/auth');

// Note: This file is kept for reference but most sync functionality 
// has been moved to the zoom-sync-unified edge function
router.post('/', authMiddleware, extractUser, async (req, res) => {
  try {
    console.log('🔄 Render backend sync route called - redirecting to edge function');
    
    // Return message indicating to use edge function instead
    res.json({
      success: false,
      error: 'This endpoint has been deprecated. Please use the zoom-sync-unified edge function instead.',
      migration_info: {
        new_endpoint: 'zoom-sync-unified edge function',
        action: 'start',
        required_fields: ['connectionId', 'syncType']
      }
    });

  } catch (error) {
    console.error(`❌ Sync webinars error:`, error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to sync webinars'
    });
  }
});

module.exports = router;
