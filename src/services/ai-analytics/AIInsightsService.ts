
import { supabase } from '@/integrations/supabase/client';
import { AIInsight, CreateAIInsightRequest } from '@/types/ai-analytics';

export class AIInsightsService {
  /**
   * Get all AI insights for user's webinars
   */
  static async getUserInsights(options?: {
    webinarId?: string;
    insightType?: string;
    status?: string;
    limit?: number;
    offset?: number;
  }) {
    let query = supabase
      .from('ai_insights')
      .select('*')
      .order('created_at', { ascending: false });

    if (options?.webinarId) {
      query = query.eq('webinar_id', options.webinarId);
    }

    if (options?.insightType) {
      query = query.eq('insight_type', options.insightType);
    }

    if (options?.status) {
      query = query.eq('status', options.status);
    }

    if (options?.limit) {
      query = query.limit(options.limit);
    }

    if (options?.offset) {
      query = query.range(options.offset, (options.offset + (options.limit || 10)) - 1);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching AI insights:', error);
      throw error;
    }

    return data as AIInsight[];
  }

  /**
   * Get a specific AI insight by ID
   */
  static async getInsightById(id: string) {
    const { data, error } = await supabase
      .from('ai_insights')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching AI insight:', error);
      throw error;
    }

    return data as AIInsight;
  }

  /**
   * Create a new AI insight
   */
  static async createInsight(insight: CreateAIInsightRequest) {
    const { data, error } = await supabase
      .from('ai_insights')
      .insert({
        ...insight,
        user_id: (await supabase.auth.getUser()).data.user?.id
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating AI insight:', error);
      throw error;
    }

    return data as AIInsight;
  }

  /**
   * Update an AI insight
   */
  static async updateInsight(id: string, updates: Partial<AIInsight>) {
    const { data, error } = await supabase
      .from('ai_insights')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating AI insight:', error);
      throw error;
    }

    return data as AIInsight;
  }

  /**
   * Update insight status
   */
  static async updateInsightStatus(
    id: string, 
    status: string, 
    errorMessage?: string,
    processingDuration?: number
  ) {
    const updates: any = { status };
    
    if (status === 'processing') {
      updates.processing_started_at = new Date().toISOString();
    } else if (status === 'completed' || status === 'failed') {
      updates.processing_completed_at = new Date().toISOString();
      if (processingDuration) {
        updates.processing_duration_ms = processingDuration;
      }
    }

    if (errorMessage) {
      updates.error_message = errorMessage;
    }

    return this.updateInsight(id, updates);
  }

  /**
   * Delete an AI insight
   */
  static async deleteInsight(id: string) {
    const { error } = await supabase
      .from('ai_insights')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting AI insight:', error);
      throw error;
    }

    return true;
  }

  /**
   * Get insights summary for dashboard
   */
  static async getInsightsSummary() {
    const { data, error } = await supabase
      .from('ai_insights')
      .select('insight_type, status, confidence_score, created_at')
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) {
      console.error('Error fetching insights summary:', error);
      throw error;
    }

    // Calculate summary statistics
    const summary = {
      total: data.length,
      byType: {} as Record<string, number>,
      byStatus: {} as Record<string, number>,
      avgConfidence: 0,
      recentInsights: data.slice(0, 5),
    };

    let totalConfidence = 0;
    let confidenceCount = 0;

    data.forEach(insight => {
      // Count by type
      summary.byType[insight.insight_type] = (summary.byType[insight.insight_type] || 0) + 1;
      
      // Count by status
      summary.byStatus[insight.status] = (summary.byStatus[insight.status] || 0) + 1;
      
      // Calculate average confidence
      if (insight.confidence_score) {
        totalConfidence += insight.confidence_score;
        confidenceCount++;
      }
    });

    if (confidenceCount > 0) {
      summary.avgConfidence = totalConfidence / confidenceCount;
    }

    return summary;
  }
}
