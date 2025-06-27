const router = require('express').Router();
const { authMiddleware } = require('../../middleware/auth');
const campaignService = require('../../services/email/campaignService');

// Launch campaign
router.post('/launch', authMiddleware, async (req, res) => {
  try {
    const { campaign_id } = req.body;
    
    if (!campaign_id) {
      return res.status(400).json({
        success: false,
        error: 'Campaign ID is required'
      });
    }

    const result = await campaignService.launchCampaign(campaign_id, req.userId);
    
    res.json({
      success: true,
      message: 'Campaign launched successfully',
      ...result
    });
  } catch (error) {
    console.error('Campaign launch error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Schedule campaign
router.post('/schedule', authMiddleware, async (req, res) => {
  try {
    const { campaign_id, scheduled_time, recurring } = req.body;
    
    if (!campaign_id || !scheduled_time) {
      return res.status(400).json({
        success: false,
        error: 'Campaign ID and scheduled time are required'
      });
    }

    const result = await campaignService.scheduleCampaign(
      campaign_id, 
      req.userId,
      { scheduled_time, recurring }
    );
    
    res.json({
      success: true,
      message: 'Campaign scheduled successfully',
      ...result
    });
  } catch (error) {
    console.error('Campaign scheduling error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Process scheduled campaigns (called by cron job or manually)
router.post('/process-scheduled', async (req, res) => {
  try {
    // Verify this is called by internal service or has proper auth
    const apiKey = req.headers['x-api-key'];
    const internalKey = process.env.INTERNAL_API_KEY || 'default-internal-key';
    
    if (apiKey !== internalKey) {
      return res.status(403).json({
        success: false,
        error: 'Unauthorized'
      });
    }

    const result = await campaignService.processScheduledCampaigns();
    
    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    console.error('Scheduled campaign processing error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get campaign status
router.get('/:campaignId/status', authMiddleware, async (req, res) => {
  try {
    const { campaignId } = req.params;
    const supabase = require('../../services/supabaseService').supabaseService;
    
    // Get campaign details
    const { data: campaign, error } = await supabase.serviceClient
      .from('email_campaigns')
      .select(`
        id,
        name,
        status,
        created_at,
        last_run_at,
        email_send_queue(count),
        email_sends(count)
      `)
      .eq('id', campaignId)
      .eq('user_id', req.userId)
      .single();

    if (error || !campaign) {
      return res.status(404).json({
        success: false,
        error: 'Campaign not found'
      });
    }

    res.json({
      success: true,
      campaign: {
        ...campaign,
        queued_count: campaign.email_send_queue?.[0]?.count || 0,
        sent_count: campaign.email_sends?.[0]?.count || 0
      }
    });
  } catch (error) {
    console.error('Campaign status error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Cancel scheduled campaign
router.post('/:campaignId/cancel', authMiddleware, async (req, res) => {
  try {
    const { campaignId } = req.params;
    const supabase = require('../../services/supabaseService').supabaseService;
    
    // Update campaign status
    const { error: campaignError } = await supabase.serviceClient
      .from('email_campaigns')
      .update({ 
        status: 'cancelled',
        updated_at: new Date().toISOString()
      })
      .eq('id', campaignId)
      .eq('user_id', req.userId);

    if (campaignError) {
      throw new Error('Failed to cancel campaign');
    }

    // Cancel any pending executions
    const { error: queueError } = await supabase.serviceClient
      .from('campaign_execution_queue')
      .update({ 
        status: 'cancelled',
        completed_at: new Date().toISOString()
      })
      .eq('campaign_id', campaignId)
      .eq('status', 'pending');

    res.json({
      success: true,
      message: 'Campaign cancelled successfully'
    });
  } catch (error) {
    console.error('Campaign cancellation error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
