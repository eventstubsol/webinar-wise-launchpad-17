
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
   * Note: This is a stub since ai_insights table doesn't exist
   */
  static async getInsightStatus(insightId: string) {
    console.warn('OpenAIInsightsService: ai_insights table not implemented yet');
    return {
      id: insightId,
      status: 'completed',
      progress: 100,
      result: null
    };
  }

  /**
   * Cancel insight generation (if possible)
   * Note: This is a stub since ai_insights table doesn't exist
   */
  static async cancelInsight(insightId: string) {
    console.warn('OpenAIInsightsService: ai_insights table not implemented yet');
    return true;
  }

  /**
   * Get usage statistics for cost tracking
   * Note: This is a stub since ai_insights table doesn't exist
   */
  static async getUsageStats(userId?: string) {
    console.warn('OpenAIInsightsService: ai_insights table not implemented yet');
    
    // Return mock data structure
    const stats = {
      totalRequests: 0,
      requestsByModel: {} as Record<string, number>,
      requestsByStatus: {} as Record<string, number>,
      avgProcessingTime: 0,
      estimatedCost: 0
    };

    return stats;
  }
}
