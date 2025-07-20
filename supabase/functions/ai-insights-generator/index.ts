
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0';

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Rate limiting configuration
const RATE_LIMITS = {
  requests_per_hour: 50,
  tokens_per_day: 100000,
  max_cost_per_day: 10.00 // USD
};

// Model configuration
const MODEL_CONFIG = {
  complex: 'gpt-4o-mini', // For complex analysis
  simple: 'gpt-3.5-turbo', // For simple summaries
  costs: {
    'gpt-4o-mini': { input: 0.00015, output: 0.0006 }, // per 1K tokens
    'gpt-3.5-turbo': { input: 0.0005, output: 0.0015 }
  }
};

// Prompt templates
const PROMPT_TEMPLATES = {
  engagement_analysis: `
Analyze the following webinar engagement data and provide actionable insights:

Webinar Details:
- Title: {title}
- Duration: {duration} minutes
- Total Registrants: {registrants}
- Total Attendees: {attendees}

Engagement Metrics:
- Join/Leave Patterns: {join_leave_data}
- Poll Participation: {poll_data}
- Q&A Activity: {qa_data}
- Chat Messages: {chat_data}
- Average Attention Score: {attention_score}

Please provide:
1. Key engagement insights (3-4 bullet points)
2. Peak engagement moments and why they occurred
3. Drop-off analysis with specific recommendations
4. Actionable strategies to improve future engagement
5. Overall engagement score (1-100) with justification

Format as JSON with keys: insights, peak_moments, drop_off_analysis, recommendations, engagement_score, justification.
`,

  content_effectiveness: `
Evaluate the content effectiveness of this webinar:

Content Data:
- Q&A Questions: {questions}
- Poll Results: {polls}
- Chat Topics: {chat_topics}
- Engagement Peaks: {engagement_peaks}
- Content Segments: {segments}

Analyze:
1. Which content segments were most/least effective
2. Key themes from audience questions
3. Content gaps identified from Q&A
4. Suggestions for content improvement
5. Content effectiveness score (1-100)

Format as JSON with keys: effective_segments, ineffective_segments, key_themes, content_gaps, improvements, effectiveness_score.
`,

  sentiment_analysis: `
Analyze audience sentiment throughout this webinar:

Sentiment Data:
- Chat Messages: {chat_messages}
- Q&A Questions: {questions}
- Poll Responses: {poll_responses}
- Participation Patterns: {participation}

Provide:
1. Overall sentiment score (-100 to +100)
2. Sentiment timeline (beginning, middle, end)
3. Key positive and negative sentiment drivers
4. Audience satisfaction indicators
5. Recommendations to improve sentiment

Format as JSON with keys: overall_sentiment, sentiment_timeline, positive_drivers, negative_drivers, satisfaction_indicators, recommendations.
`,

  speaker_performance: `
Analyze speaker performance based on audience engagement:

Performance Data:
- Engagement Timeline: {engagement_timeline}
- Q&A Response Quality: {qa_responses}
- Audience Retention: {retention_data}
- Interaction Frequency: {interactions}

Evaluate:
1. Speaking effectiveness score (1-100)
2. Strong performance moments
3. Areas for improvement
4. Audience engagement techniques used
5. Recommendations for future presentations

Format as JSON with keys: effectiveness_score, strong_moments, improvement_areas, engagement_techniques, recommendations.
`,

  roi_analysis: `
Calculate ROI and business impact for this webinar:

Business Data:
- Registration Cost: {registration_cost}
- Attendee Value: {attendee_value}
- Engagement Metrics: {engagement_metrics}
- Follow-up Actions: {follow_ups}
- Conversion Data: {conversions}

Calculate:
1. Cost per engaged participant
2. Engagement-to-conversion ratio
3. ROI percentage
4. Business impact score (1-100)
5. Strategies to improve ROI

Format as JSON with keys: cost_per_participant, conversion_ratio, roi_percentage, business_impact_score, roi_strategies.
`
};

async function checkRateLimit(userId: string): Promise<boolean> {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  
  const { data, error } = await supabase
    .from('ai_insights')
    .select('id')
    .eq('user_id', userId)
    .gte('created_at', oneHourAgo);

  if (error) {
    console.error('Rate limit check error:', error);
    return false;
  }

  return (data?.length || 0) < RATE_LIMITS.requests_per_hour;
}

async function estimateTokens(text: string): Promise<number> {
  // Rough estimation: 1 token ≈ 4 characters
  return Math.ceil(text.length / 4);
}

async function selectModel(analysisType: string, dataComplexity: number): Promise<string> {
  // Use GPT-4 for complex analysis, GPT-3.5 for simple summaries
  const complexAnalysisTypes = ['engagement_analysis', 'content_effectiveness', 'roi_analysis'];
  
  if (complexAnalysisTypes.includes(analysisType) || dataComplexity > 1000) {
    return MODEL_CONFIG.complex;
  }
  
  return MODEL_CONFIG.simple;
}

async function generateInsight(
  prompt: string,
  model: string,
  stream: boolean = false
): Promise<any> {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openAIApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
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
      max_tokens: 2000,
      stream: stream
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
  }

  if (stream) {
    return response;
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

async function fetchWebinarData(webinarId: string, userId: string) {
  const { data: webinar, error: webinarError } = await supabase
    .from('zoom_webinars')
    .select(`
      *,
      zoom_participants(*),
      zoom_polls(*),
      zoom_qna(*),
      zoom_registrants(*)
    `)
    .eq('id', webinarId)
    .single();

  if (webinarError) {
    throw new Error(`Failed to fetch webinar data: ${webinarError.message}`);
  }

  // Verify user owns this webinar
  const { data: connection } = await supabase
    .from('zoom_connections')
    .select('user_id')
    .eq('id', webinar.connection_id)
    .single();

  if (connection?.user_id !== userId) {
    throw new Error('Unauthorized access to webinar data');
  }

  return webinar;
}

function formatPrompt(template: string, data: any): string {
  let formatted = template;
  
  // Replace placeholders with actual data
  const replacements = {
    title: data.topic || 'Unknown',
    duration: data.duration || 0,
    registrants: data.total_registrants || 0,
    attendees: data.total_attendees || 0,
    join_leave_data: JSON.stringify(data.zoom_participants?.map((p: any) => ({
      join_time: p.join_time,
      leave_time: p.leave_time,
      duration: p.duration
    })) || []),
    poll_data: JSON.stringify(data.zoom_polls || []),
    qa_data: JSON.stringify(data.zoom_qna || []),
    chat_data: JSON.stringify([]), // Would need chat data if available
    attention_score: data.zoom_participants?.reduce((sum: number, p: any) => sum + (p.attentiveness_score || 0), 0) / (data.zoom_participants?.length || 1) || 0,
    questions: JSON.stringify(data.zoom_qna?.map((q: any) => q.question) || []),
    polls: JSON.stringify(data.zoom_polls || []),
    chat_topics: JSON.stringify([]), // Would extract from chat if available
    engagement_peaks: JSON.stringify([]), // Would calculate from timing data
    segments: JSON.stringify([]), // Would need content segmentation
    chat_messages: JSON.stringify([]),
    participation: JSON.stringify(data.zoom_participants || []),
    engagement_timeline: JSON.stringify([]),
    qa_responses: JSON.stringify(data.zoom_qna || []),
    retention_data: JSON.stringify([]),
    interactions: JSON.stringify([]),
    registration_cost: 0, // Would need business data
    attendee_value: 0,
    engagement_metrics: JSON.stringify({}),
    follow_ups: JSON.stringify([]),
    conversions: JSON.stringify([])
  };

  Object.entries(replacements).forEach(([key, value]) => {
    formatted = formatted.replace(new RegExp(`{${key}}`, 'g'), String(value));
  });

  return formatted;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { webinarId, analysisType, stream = false } = await req.json();
    
    // Get user from auth header
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      throw new Error('Invalid authorization');
    }

    // Check rate limits
    const canProceed = await checkRateLimit(user.id);
    if (!canProceed) {
      return new Response(
        JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
        { 
          status: 429, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Validate analysis type
    if (!PROMPT_TEMPLATES[analysisType as keyof typeof PROMPT_TEMPLATES]) {
      throw new Error(`Invalid analysis type: ${analysisType}`);
    }

    // Fetch webinar data
    const webinarData = await fetchWebinarData(webinarId, user.id);
    
    // Format prompt
    const template = PROMPT_TEMPLATES[analysisType as keyof typeof PROMPT_TEMPLATES];
    const prompt = formatPrompt(template, webinarData);
    
    // Estimate complexity and select model
    const dataComplexity = await estimateTokens(prompt);
    const selectedModel = await selectModel(analysisType, dataComplexity);
    
    console.log(`Generating ${analysisType} insight for webinar ${webinarId} using ${selectedModel}`);

    // Create insight record in database
    const { data: insightRecord, error: insertError } = await supabase
      .from('ai_insights')
      .insert({
        user_id: user.id,
        webinar_id: webinarId,
        insight_type: analysisType,
        insight_title: `${analysisType.replace('_', ' ').toUpperCase()} Analysis`,
        ai_model_name: selectedModel,
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

    if (stream) {
      // For streaming responses
      const openaiResponse = await generateInsight(prompt, selectedModel, true);
      
      // Set up streaming response
      const encoder = new TextEncoder();
      const readable = new ReadableStream({
        async start(controller) {
          try {
            const reader = openaiResponse.body?.getReader();
            if (!reader) throw new Error('No response body');

            let fullContent = '';
            
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;

              const chunk = new TextDecoder().decode(value);
              const lines = chunk.split('\n');
              
              for (const line of lines) {
                if (line.startsWith('data: ')) {
                  const data = line.slice(6);
                  if (data === '[DONE]') continue;
                  
                  try {
                    const parsed = JSON.parse(data);
                    const content = parsed.choices?.[0]?.delta?.content;
                    if (content) {
                      fullContent += content;
                      controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                        type: 'content_delta',
                        content: content,
                        insightId: insightRecord.id
                      })}\n\n`));
                    }
                  } catch (e) {
                    // Skip invalid JSON lines
                  }
                }
              }
            }

            // Update database with final result
            try {
              const parsedContent = JSON.parse(fullContent);
              await supabase
                .from('ai_insights')
                .update({
                  status: 'completed',
                  insight_data: parsedContent,
                  insight_summary: fullContent.substring(0, 500),
                  confidence_score: 0.85,
                  processing_completed_at: new Date().toISOString(),
                  processing_duration_ms: Date.now() - new Date(insightRecord.processing_started_at).getTime()
                })
                .eq('id', insightRecord.id);
            } catch (parseError) {
              console.error('Failed to parse AI response:', parseError);
              await supabase
                .from('ai_insights')
                .update({
                  status: 'completed',
                  insight_summary: fullContent.substring(0, 500),
                  confidence_score: 0.7,
                  processing_completed_at: new Date().toISOString()
                })
                .eq('id', insightRecord.id);
            }

            controller.enqueue(encoder.encode(`data: ${JSON.stringify({
              type: 'complete',
              insightId: insightRecord.id
            })}\n\n`));
            
            controller.close();
          } catch (error) {
            console.error('Streaming error:', error);
            
            // Update database with error
            await supabase
              .from('ai_insights')
              .update({
                status: 'failed',
                error_message: error.message,
                processing_completed_at: new Date().toISOString()
              })
              .eq('id', insightRecord.id);

            controller.error(error);
          }
        }
      });

      return new Response(readable, {
        headers: {
          ...corsHeaders,
          'Content-Type': 'text/plain',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        }
      });
    } else {
      // For non-streaming responses
      const startTime = Date.now();
      const result = await generateInsight(prompt, selectedModel, false);
      const processingDuration = Date.now() - startTime;

      // Parse and store result
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
      await supabase
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

      return new Response(JSON.stringify({
        success: true,
        insightId: insightRecord.id,
        result: parsedResult,
        confidence: confidence,
        processingTime: processingDuration
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

  } catch (error) {
    console.error('AI insights generation error:', error);
    return new Response(JSON.stringify({ 
      error: error.message || 'Failed to generate AI insights' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
