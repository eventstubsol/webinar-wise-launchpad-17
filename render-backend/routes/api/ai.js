const router = require('express').Router();
const { authMiddleware } = require('../../middleware/auth');
const aiInsightsService = require('../../services/ai/aiInsightsService');

// Generate AI insights
router.post('/generate-insights', authMiddleware, async (req, res) => {
  try {
    const { webinar_id, analysis_type } = req.body;
    
    if (!webinar_id || !analysis_type) {
      return res.status(400).json({
        success: false,
        error: 'Webinar ID and analysis type are required'
      });
    }

    // Validate analysis type
    const validTypes = [
      'engagement_analysis',
      'content_effectiveness',
      'sentiment_analysis',
      'speaker_performance',
      'roi_analysis'
    ];

    if (!validTypes.includes(analysis_type)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid analysis type'
      });
    }

    const result = await aiInsightsService.generateInsights(
      webinar_id,
      analysis_type,
      req.userId
    );
    
    res.json(result);
  } catch (error) {
    console.error('AI insights generation error:', error);
    
    // Handle rate limit errors
    if (error.message.includes('Rate limit')) {
      return res.status(429).json({
        success: false,
        error: error.message
      });
    }
    
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get AI insights for a webinar
router.get('/insights/:webinarId', authMiddleware, async (req, res) => {
  try {
    const { webinarId } = req.params;
    const { type } = req.query;
    
    const supabase = require('../../services/supabaseService').supabaseService;
    
    let query = supabase.serviceClient
      .from('ai_insights')
      .select('*')
      .eq('webinar_id', webinarId)
      .eq('user_id', req.userId)
      .order('created_at', { ascending: false });

    if (type) {
      query = query.eq('insight_type', type);
    }

    const { data: insights, error } = await query;

    if (error) {
      throw error;
    }

    res.json({
      success: true,
      insights: insights || []
    });
  } catch (error) {
    console.error('AI insights fetch error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get AI insight by ID
router.get('/insights/detail/:insightId', authMiddleware, async (req, res) => {
  try {
    const { insightId } = req.params;
    const supabase = require('../../services/supabaseService').supabaseService;
    
    const { data: insight, error } = await supabase.serviceClient
      .from('ai_insights')
      .select('*')
      .eq('id', insightId)
      .eq('user_id', req.userId)
      .single();

    if (error || !insight) {
      return res.status(404).json({
        success: false,
        error: 'Insight not found'
      });
    }

    res.json({
      success: true,
      insight
    });
  } catch (error) {
    console.error('AI insight fetch error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Update predictive models (placeholder)
router.post('/update-models', authMiddleware, async (req, res) => {
  try {
    // This would be implemented with actual ML model training
    res.json({
      success: true,
      message: 'Model update queued',
      note: 'This is a placeholder endpoint'
    });
  } catch (error) {
    console.error('Model update error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
