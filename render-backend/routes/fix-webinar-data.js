
const express = require('express');
const router = express.Router();
const { WebinarStatusFixer } = require('../../../src/services/zoom/processors/webinar-status-fixer');
const { EnhancedSyncProcessor } = require('../../../src/services/zoom/processors/enhanced-sync-processor');
const supabaseService = require('../services/supabaseService');
const { authMiddleware, extractUser } = require('../middleware/auth');

/**
 * POST /api/fix-webinar-data
 * Manual endpoint to fix webinar statuses and backfill missing data
 */
router.post('/', authMiddleware, extractUser, async (req, res) => {
  try {
    const { connection_id, fix_statuses = true, backfill_data = true } = req.body;
    const userId = req.userId;

    if (!connection_id) {
      return res.status(400).json({
        success: false,
        error: 'Missing connection_id'
      });
    }

    console.log(`🔧 Starting webinar data fix for connection: ${connection_id}`);

    // Verify connection ownership
    const connection = await supabaseService.getZoomConnection(connection_id);
    if (connection.user_id !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied to this connection'
      });
    }

    const results = {
      statusFix: null,
      backfillResults: null
    };

    // Phase 1: Fix webinar statuses
    if (fix_statuses) {
      console.log(`🔧 Fixing webinar statuses...`);
      try {
        results.statusFix = await WebinarStatusFixer.fixAllWebinarStatuses(supabaseService.supabase);
        console.log(`✅ Status fix completed:`, results.statusFix);
      } catch (error) {
        console.error(`❌ Status fix failed:`, error);
        results.statusFix = { error: error.message };
      }
    }

    // Phase 2: Backfill missing data
    if (backfill_data) {
      console.log(`🔄 Backfilling missing participant/registrant data...`);
      try {
        // Get credentials for data fetching
        const credentials = await supabaseService.getZoomCredentials(userId);
        if (!credentials) {
          throw new Error('Zoom credentials not found');
        }

        const processor = new EnhancedSyncProcessor(credentials);
        results.backfillResults = await processor.backfillHistoricalData(
          supabaseService.supabase,
          connection_id
        );
        console.log(`✅ Backfill completed:`, results.backfillResults);
      } catch (error) {
        console.error(`❌ Backfill failed:`, error);
        results.backfillResults = { error: error.message };
      }
    }

    res.json({
      success: true,
      message: 'Webinar data fix process completed',
      results
    });

  } catch (error) {
    console.error(`❌ Fix webinar data error:`, error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fix webinar data'
    });
  }
});

/**
 * GET /api/fix-webinar-data/status
 * Get status of webinars that need fixing
 */
router.get('/status', authMiddleware, extractUser, async (req, res) => {
  try {
    const { connection_id } = req.query;
    const userId = req.userId;

    if (!connection_id) {
      return res.status(400).json({
        success: false,
        error: 'Missing connection_id'
      });
    }

    // Verify connection ownership
    const connection = await supabaseService.getZoomConnection(connection_id);
    if (connection.user_id !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied to this connection'
      });
    }

    // Get webinars needing participant data
    const webinarsNeedingData = await WebinarStatusFixer.getWebinarsNeedingParticipantData(
      supabaseService.supabase,
      connection_id
    );

    // Get overall stats
    const { data: allWebinars, error } = await supabaseService.supabase
      .from('zoom_webinars')
      .select('status, participant_sync_status, total_registrants, total_attendees')
      .eq('connection_id', connection_id);

    if (error) {
      throw error;
    }

    const stats = {
      total: allWebinars.length,
      needingParticipantData: webinarsNeedingData.length,
      statusDistribution: {},
      syncStatusDistribution: {},
      withRegistrants: allWebinars.filter(w => (w.total_registrants || 0) > 0).length,
      withParticipants: allWebinars.filter(w => (w.total_attendees || 0) > 0).length
    };

    // Calculate distributions
    allWebinars.forEach(w => {
      stats.statusDistribution[w.status] = (stats.statusDistribution[w.status] || 0) + 1;
      stats.syncStatusDistribution[w.participant_sync_status] = (stats.syncStatusDistribution[w.participant_sync_status] || 0) + 1;
    });

    res.json({
      success: true,
      stats,
      webinarsNeedingData: webinarsNeedingData.slice(0, 10) // Return first 10 for preview
    });

  } catch (error) {
    console.error(`❌ Get fix status error:`, error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get fix status'
    });
  }
});

module.exports = router;
