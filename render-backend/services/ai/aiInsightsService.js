const { Configuration, OpenAIApi } = require('openai');
const { supabaseService } = require('../supabaseService');

class AIInsightsService {
  constructor() {
    const apiKey = process.env.OPENAI_API_KEY;
    
    if (apiKey) {
      const configuration = new Configuration({ apiKey });
      this.openai = new OpenAIApi(configuration);
      console.log('✅ OpenAI service initialized');
    } else {
      console.warn('⚠️ OpenAI API key not found. AI insights will be disabled.');
      this.openai = null;
    }

    // Model configuration
    this.models = {
      complex: 'gpt-4o-mini',    // For complex analysis
      simple: 'gpt-3.5-turbo'     // For simple summaries
    };

    // Rate limits
    this.rateLimits = {
      requestsPerHour: 50,
      tokensPerDay: 100000,
      maxCostPerDay: 10.00
    };
  }

  /**
   * Generate AI insights for a webinar
   */
  async generateInsights(webinarId, analysisType, userId) {
    try {
      if (!this.openai) {
        throw new Error('AI service not configured');
      }

      // Check rate limits
      const canProceed = await this.checkRateLimit(userId);
      if (!canProceed) {
        throw new Error('Rate limit exceeded. Please try again later.');
      }

      // Fetch webinar data
      const webinarData = await this.fetchWebinarData(webinarId, userId);
      
      // Select appropriate model
      const model = this.selectModel(analysisType);
      
      // Generate prompt
      const prompt = this.generatePrompt(analysisType, webinarData);
      
      // Create insight record
      const { data: insightRecord, error: insertError } = await supabaseService.serviceClient
        .from('ai_insights')
        .insert({
          user_id: userId,
          webinar_id: webinarId,
          insight_type: analysisType,
          insight_title: `${analysisType.replace('_', ' ').toUpperCase()} Analysis`,
          ai_model_name: model,
          status: 'processing',
          processing_started_at: new Date().toISOString(),
          insight_data: {},
          confidence_score: 0
        })
        .select()
        .single();

      if (insertError) {
        throw new Error(`Failed to create insight record: ${insertError.message}`);
      }

      // Generate insight
      const startTime = Date.now();
      const result = await this.callOpenAI(prompt, model);
      const processingDuration = Date.now() - startTime;

      // Parse result
      let parsedResult;
      let confidence = 0.85;
      
      try {
        parsedResult = JSON.parse(result);
      } catch (parseError) {
        console.error('Failed to parse AI response:', parseError);
        parsedResult = { raw_response: result };
        confidence = 0.7;
      }

      // Update insight record
      await supabaseService.serviceClient
        .from('ai_insights')
        .update({
          status: 'completed',
          insight_data: parsedResult,
          insight_summary: result.substring(0, 500),
          confidence_score: confidence,
          processing_completed_at: new Date().toISOString(),
          processing_duration_ms: processingDuration
        })
        .eq('id', insightRecord.id);

      return {
        success: true,
        insightId: insightRecord.id,
        result: parsedResult,
        confidence: confidence,
        processingTime: processingDuration
      };

    } catch (error) {
      console.error('AI insights generation error:', error);
      throw error;
    }
  }

  /**
   * Check rate limits for user
   */
  async checkRateLimit(userId) {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    
    const { data, error } = await supabaseService.serviceClient
      .from('ai_insights')
      .select('id')
      .eq('user_id', userId)
      .gte('created_at', oneHourAgo);

    if (error) {
      console.error('Rate limit check error:', error);
      return false;
    }

    return (data?.length || 0) < this.rateLimits.requestsPerHour;
  }

  /**
   * Fetch webinar data for analysis
   */
  async fetchWebinarData(webinarId, userId) {
    const { data: webinar, error } = await supabaseService.serviceClient
      .from('zoom_webinars')
      .select(`
        *,
        zoom_participants(count),
        zoom_registrants(count)
      `)
      .eq('id', webinarId)
      .single();

    if (error || !webinar) {
      throw new Error('Webinar not found');
    }

    // Verify user owns this webinar
    const { data: connection } = await supabaseService.serviceClient
      .from('zoom_connections')
      .select('user_id')
      .eq('id', webinar.connection_id)
      .single();

    if (connection?.user_id !== userId) {
      throw new Error('Unauthorized access to webinar data');
    }

    return webinar;
  }

  /**
   * Select appropriate model based on analysis type
   */
  selectModel(analysisType) {
    const complexAnalysisTypes = ['engagement_analysis', 'content_effectiveness', 'roi_analysis'];
    
    if (complexAnalysisTypes.includes(analysisType)) {
      return this.models.complex;
    }
    
    return this.models.simple;
  }

  /**
   * Generate prompt based on analysis type
   */
  generatePrompt(analysisType, webinarData) {
    const prompts = {
      engagement_analysis: this.generateEngagementPrompt(webinarData),
      content_effectiveness: this.generateContentPrompt(webinarData),
      sentiment_analysis: this.generateSentimentPrompt(webinarData),
      speaker_performance: this.generateSpeakerPrompt(webinarData),
      roi_analysis: this.generateROIPrompt(webinarData)
    };

    return prompts[analysisType] || this.generateDefaultPrompt(webinarData);
  }

  /**
   * Generate engagement analysis prompt
   */
  generateEngagementPrompt(data) {
    return `
Analyze the following webinar engagement data and provide actionable insights:

Webinar Details:
- Title: ${data.topic || 'Unknown'}
- Duration: ${data.duration || 0} minutes
- Total Registrants: ${data.zoom_registrants?.count || 0}
- Total Attendees: ${data.zoom_participants?.count || 0}

Please provide:
1. Key engagement insights (3-4 bullet points)
2. Attendance rate analysis
3. Recommendations to improve future engagement
4. Overall engagement score (1-100) with justification

Format as JSON with keys: insights, attendance_analysis, recommendations, engagement_score, justification.
`;
  }

  /**
   * Generate content effectiveness prompt
   */
  generateContentPrompt(data) {
    return `
Evaluate the content effectiveness of this webinar:

Webinar Topic: ${data.topic}
Duration: ${data.duration} minutes
Attendee Count: ${data.zoom_participants?.count || 0}

Analyze:
1. Title effectiveness
2. Duration appropriateness
3. Content optimization suggestions
4. Content effectiveness score (1-100)

Format as JSON with keys: title_effectiveness, duration_analysis, optimization_suggestions, effectiveness_score.
`;
  }

  /**
   * Generate sentiment analysis prompt
   */
  generateSentimentPrompt(data) {
    return `
Analyze the sentiment for this webinar:

Webinar: ${data.topic}
Attendance Rate: ${((data.zoom_participants?.count || 0) / (data.zoom_registrants?.count || 1) * 100).toFixed(1)}%

Provide:
1. Predicted audience sentiment (-100 to +100)
2. Factors affecting sentiment
3. Recommendations to improve sentiment

Format as JSON with keys: sentiment_score, factors, recommendations.
`;
  }

  /**
   * Generate speaker performance prompt
   */
  generateSpeakerPrompt(data) {
    return `
Analyze speaker performance based on webinar metrics:

Webinar: ${data.topic}
Duration: ${data.duration} minutes
Engagement Rate: ${((data.zoom_participants?.count || 0) / (data.zoom_registrants?.count || 1) * 100).toFixed(1)}%

Evaluate:
1. Speaking effectiveness score (1-100)
2. Areas for improvement
3. Recommendations for future presentations

Format as JSON with keys: effectiveness_score, improvement_areas, recommendations.
`;
  }

  /**
   * Generate ROI analysis prompt
   */
  generateROIPrompt(data) {
    return `
Calculate potential ROI for this webinar:

Webinar: ${data.topic}
Registrants: ${data.zoom_registrants?.count || 0}
Attendees: ${data.zoom_participants?.count || 0}

Calculate:
1. Engagement value score
2. Lead quality estimate
3. ROI improvement strategies
4. Business impact score (1-100)

Format as JSON with keys: engagement_value, lead_quality, roi_strategies, business_impact_score.
`;
  }

  /**
   * Generate default prompt
   */
  generateDefaultPrompt(data) {
    return `
Analyze this webinar and provide insights:

Webinar: ${data.topic}
Duration: ${data.duration} minutes
Participants: ${data.zoom_participants?.count || 0}

Provide a general analysis with actionable insights.

Format as JSON.
`;
  }

  /**
   * Call OpenAI API
   */
  async callOpenAI(prompt, model) {
    try {
      const response = await this.openai.createChatCompletion({
        model: model,
        messages: [
          {
            role: 'system',
            content: 'You are an expert webinar analytics consultant. Provide actionable, data-driven insights in the requested JSON format. Be specific and practical in your recommendations.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 2000
      });

      return response.data.choices[0].message.content;
    } catch (error) {
      console.error('OpenAI API error:', error);
      throw new Error(`AI service error: ${error.message}`);
    }
  }

  /**
   * Process analytics data
   */
  async processAnalytics(eventType, eventData) {
    try {
      // This would implement real-time analytics processing
      // For now, just log the event
      await supabaseService.serviceClient
        .from('analytics_events')
        .insert({
          event_type: eventType,
          event_data: eventData,
          processed_at: new Date().toISOString()
        });

      return { success: true };
    } catch (error) {
      console.error('Analytics processing error:', error);
      throw error;
    }
  }
}

module.exports = new AIInsightsService();
