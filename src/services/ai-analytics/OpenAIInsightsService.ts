
import { supabase } from '@/integrations/supabase/client';

export interface GenerateInsightRequest {
  webinarId: string;
  analysisType: 'engagement_analysis' | 'content_effectiveness' | 'sentiment_analysis' | 'speaker_performance' | 'roi_analysis';
  stream?: boolean;
}

export interface InsightGenerationResponse {
  success: boolean;
  insightId: string;
  result?: any;
  confidence?: number;
  processingTime?: number;
  error?: string;
}

export interface StreamingInsightEvent {
  type: 'content_delta' | 'complete' | 'error';
  content?: string;
  insightId?: string;
  error?: string;
}

export class OpenAIInsightsService {
  /**
   * Generate AI insights for a webinar
   */
  static async generateInsight(request: GenerateInsightRequest): Promise<InsightGenerationResponse> {
    try {
      const { data, error } = await supabase.functions.invoke('ai-insights-generator', {
        body: request
      });

      if (error) {
        throw new Error(error.message);
      }

      return data;
    } catch (error) {
      console.error('Error generating AI insight:', error);
      throw error;
    }
  }

  /**
   * Generate streaming AI insights for real-time updates
   */
  static async generateStreamingInsight(
    request: GenerateInsightRequest,
    onUpdate: (event: StreamingInsightEvent) => void
  ): Promise<void> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No active session');
      }

      const response = await fetch(
        `https://guwvvinnifypcxwbcnzz.functions.supabase.co/ai-insights-generator`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ ...request, stream: true }),
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response body');
      }

      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const eventData = JSON.parse(line.slice(6));
              onUpdate(eventData);
            } catch (e) {
              console.warn('Failed to parse streaming event:', line);
            }
          }
        }
      }
    } catch (error) {
      console.error('Error in streaming insight generation:', error);
      onUpdate({
        type: 'error',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Get insight generation status and progress
   */
  static async getInsightStatus(insightId: string) {
    try {
      const { data, error } = await supabase
        .from('ai_insights')
        .select('*')
        .eq('id', insightId)
        .single();

      if (error) {
        throw new Error(error.message);
      }

      return data;
    } catch (error) {
      console.error('Error fetching insight status:', error);
      throw error;
    }
  }

  /**
   * Cancel insight generation (if possible)
   */
  static async cancelInsight(insightId: string) {
    try {
      const { error } = await supabase
        .from('ai_insights')
        .update({
          status: 'failed',
          error_message: 'Cancelled by user',
          processing_completed_at: new Date().toISOString()
        })
        .eq('id', insightId)
        .eq('status', 'processing');

      if (error) {
        throw new Error(error.message);
      }

      return true;
    } catch (error) {
      console.error('Error cancelling insight:', error);
      throw error;
    }
  }

  /**
   * Get usage statistics for cost tracking
   */
  static async getUsageStats(userId?: string) {
    try {
      let query = supabase
        .from('ai_insights')
        .select('ai_model_name, processing_duration_ms, created_at, status');

      if (userId) {
        query = query.eq('user_id', userId);
      }

      // Get data for the last 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      query = query.gte('created_at', thirtyDaysAgo.toISOString());

      const { data, error } = await query;

      if (error) {
        throw new Error(error.message);
      }

      // Calculate usage statistics
      const stats = {
        totalRequests: data?.length || 0,
        requestsByModel: {} as Record<string, number>,
        requestsByStatus: {} as Record<string, number>,
        avgProcessingTime: 0,
        estimatedCost: 0
      };

      if (data && data.length > 0) {
        let totalProcessingTime = 0;
        let processedCount = 0;

        data.forEach(insight => {
          // Count by model
          stats.requestsByModel[insight.ai_model_name] = 
            (stats.requestsByModel[insight.ai_model_name] || 0) + 1;

          // Count by status
          stats.requestsByStatus[insight.status] = 
            (stats.requestsByStatus[insight.status] || 0) + 1;

          // Calculate average processing time
          if (insight.processing_duration_ms) {
            totalProcessingTime += insight.processing_duration_ms;
            processedCount++;
          }
        });

        if (processedCount > 0) {
          stats.avgProcessingTime = totalProcessingTime / processedCount;
        }

        // Rough cost estimation (would need actual token counts for accuracy)
        stats.estimatedCost = data.length * 0.02; // Rough estimate per request
      }

      return stats;
    } catch (error) {
      console.error('Error fetching usage stats:', error);
      throw error;
    }
  }
}
