const router = require('express').Router();
const { authMiddleware } = require('../../middleware/auth');
const emailService = require('../../services/email/emailService');
const emailTrackingService = require('../../services/email/emailTrackingService');
const campaignService = require('../../services/email/campaignService');

// Send email endpoint
router.post('/send', authMiddleware, async (req, res) => {
  try {
    const result = await emailService.sendEmail(req.body);
    
    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    console.error('Email send error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Process email queue
router.post('/process-queue', authMiddleware, async (req, res) => {
  try {
    const { campaign_id, batch_size = 10 } = req.body;
    
    const result = await emailService.processQueue({ campaign_id, batch_size });
    
    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    console.error('Queue processing error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Email tracking endpoints (no auth required)
router.get('/track/open', async (req, res) => {
  try {
    const { id } = req.query;
    
    if (!id) {
      return res.status(400).send('Missing tracking ID');
    }

    // Track the open
    await emailTrackingService.trackOpen(
      id,
      req.headers['user-agent'],
      req.ip
    );

    // Return tracking pixel
    const pixel = emailTrackingService.getTrackingPixel();
    
    res.set({
      'Content-Type': 'image/gif',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    });
    
    res.send(pixel);
  } catch (error) {
    console.error('Open tracking error:', error);
    // Still return pixel even on error
    const pixel = emailTrackingService.getTrackingPixel();
    res.type('image/gif').send(pixel);
  }
});

router.get('/track/click', async (req, res) => {
  try {
    const { id, url } = req.query;
    
    if (!id || !url) {
      return res.status(400).send('Missing parameters');
    }

    // Track the click
    await emailTrackingService.trackClick(
      id,
      decodeURIComponent(url),
      req.headers['user-agent'],
      req.ip
    );

    // Redirect to target URL
    res.redirect(decodeURIComponent(url));
  } catch (error) {
    console.error('Click tracking error:', error);
    // Still redirect even on error
    if (url) {
      res.redirect(decodeURIComponent(url));
    } else {
      res.status(400).send('Invalid redirect URL');
    }
  }
});

router.get('/track/unsubscribe', async (req, res) => {
  try {
    const { id } = req.query;
    
    if (!id) {
      return res.status(400).send('Missing tracking ID');
    }

    // Track the unsubscribe
    await emailTrackingService.trackUnsubscribe(
      id,
      req.headers['user-agent'],
      req.ip
    );

    // Return unsubscribe confirmation
    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Unsubscribed</title>
        <style>
          body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
          .container { max-width: 600px; margin: 0 auto; }
          h1 { color: #333; }
          p { color: #666; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>You've been unsubscribed</h1>
          <p>You have successfully been removed from our mailing list.</p>
          <p>We're sorry to see you go. If you change your mind, you can always re-subscribe from your account settings.</p>
        </div>
      </body>
      </html>
    `);
  } catch (error) {
    console.error('Unsubscribe tracking error:', error);
    res.status(500).send('An error occurred while processing your unsubscribe request.');
  }
});

// Email preferences endpoint
router.get('/preferences', async (req, res) => {
  try {
    const { token } = req.query;
    
    if (!token) {
      return res.status(400).json({
        success: false,
        error: 'Missing token'
      });
    }

    // Get preferences using token
    const { data: prefs, error } = await require('../../services/supabaseService').supabaseService.serviceClient
      .from('email_preferences')
      .select('*, profiles(email)')
      .eq('preference_management_token', token)
      .single();

    if (error || !prefs) {
      return res.status(404).json({
        success: false,
        error: 'Invalid or expired token'
      });
    }

    // Check token expiry
    if (new Date(prefs.preference_token_expires_at) < new Date()) {
      return res.status(410).json({
        success: false,
        error: 'Token expired'
      });
    }

    res.json({
      success: true,
      preferences: prefs.preferences || {},
      email: prefs.profiles?.email
    });
  } catch (error) {
    console.error('Preferences fetch error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

router.post('/preferences', async (req, res) => {
  try {
    const { token } = req.query;
    const { preferences } = req.body;
    
    if (!token) {
      return res.status(400).json({
        success: false,
        error: 'Missing token'
      });
    }

    const supabase = require('../../services/supabaseService').supabaseService;

    // Get preferences record
    const { data: prefs, error: fetchError } = await supabase.serviceClient
      .from('email_preferences')
      .select('id, preference_token_expires_at')
      .eq('preference_management_token', token)
      .single();

    if (fetchError || !prefs) {
      return res.status(404).json({
        success: false,
        error: 'Invalid token'
      });
    }

    // Check token expiry
    if (new Date(prefs.preference_token_expires_at) < new Date()) {
      return res.status(410).json({
        success: false,
        error: 'Token expired'
      });
    }

    // Update preferences
    const { data: updated, error: updateError } = await supabase.serviceClient
      .from('email_preferences')
      .update({
        preferences: preferences,
        unsubscribed: !Object.values(preferences).some(v => v === true),
        updated_at: new Date().toISOString()
      })
      .eq('id', prefs.id)
      .select()
      .single();

    if (updateError) {
      throw updateError;
    }

    res.json({
      success: true,
      preferences: updated.preferences
    });
  } catch (error) {
    console.error('Preferences update error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get campaign statistics
router.get('/campaigns/:campaignId/stats', authMiddleware, async (req, res) => {
  try {
    const { campaignId } = req.params;
    
    const stats = await emailTrackingService.getCampaignStats(campaignId);
    
    res.json({
      success: true,
      stats
    });
  } catch (error) {
    console.error('Campaign stats error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
