
const express = require('express');
const supabaseService = require('../services/supabaseService');
const router = express.Router();

/**
 * POST /reset-participant-sync
 * Resets participant sync status for enhanced data recovery
 */
router.post('/reset-participant-sync', async (req, res) => {
  try {
    console.log('🔄 Starting participant sync reset for enhanced data recovery...');
    
    const connectionId = req.headers['zoom_connection_id'] || req.body.connectionId;
    
    if (!connectionId) {
      return res.status(400).json({
        error: 'Missing connection ID',
        message: 'Connection ID is required for participant sync reset'
      });
    }

    console.log(`🔍 Resetting participant sync for connection: ${connectionId}`);

    // Call the enhanced reset function
    const resetResult = await supabaseService.resetParticipantSyncForRecovery(connectionId);
    
    console.log(`✅ Participant sync reset completed:`, resetResult);

    res.json({
      success: true,
      message: 'Participant sync reset completed successfully',
      data: resetResult
    });

  } catch (error) {
    console.error('❌ Participant sync reset failed:', error);
    
    res.status(500).json({
      error: 'Reset operation failed',
      message: error.message,
      details: error.stack
    });
  }
});

module.exports = router;
