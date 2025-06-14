
import { supabase } from '@/integrations/supabase/client';

export interface OptimizationExperiment {
  id: string;
  experiment_name: string;
  experiment_type: 'send_time' | 'subject_line' | 'content' | 'frequency';
  hypothesis: string;
  status: 'draft' | 'running' | 'completed' | 'paused';
  start_date?: string;
  end_date?: string;
  control_group_size: number;
  test_configurations: any[];
  success_metrics: string[];
  results: Record<string, any>;
  statistical_significance?: number;
  winner_variant?: string;
}

export interface EngagementScoringModel {
  id: string;
  model_name: string;
  model_type: 'engagement' | 'churn' | 'ltv' | 'send_time';
  model_config: Record<string, any>;
  feature_weights: Record<string, any>;
  performance_metrics: Record<string, any>;
  is_active: boolean;
  last_trained_at?: string;
}

export class EngagementOptimizationEngine {
  static async getOptimizationExperiments(userId: string): Promise<OptimizationExperiment[]> {
    const { data, error } = await supabase
      .from('optimization_experiments')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  static async createOptimizationExperiment(
    userId: string,
    experiment: Omit<OptimizationExperiment, 'id'>
  ): Promise<OptimizationExperiment> {
    const { data, error } = await supabase
      .from('optimization_experiments')
      .insert({
        user_id: userId,
        ...experiment,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async startExperiment(experimentId: string): Promise<OptimizationExperiment> {
    const { data, error } = await supabase
      .from('optimization_experiments')
      .update({
        status: 'running',
        start_date: new Date().toISOString(),
      })
      .eq('id', experimentId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async completeExperiment(
    experimentId: string,
    results: Record<string, any>,
    winnerVariant?: string
  ): Promise<OptimizationExperiment> {
    const { data, error } = await supabase
      .from('optimization_experiments')
      .update({
        status: 'completed',
        end_date: new Date().toISOString(),
        results,
        winner_variant: winnerVariant,
      })
      .eq('id', experimentId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async getScoringModels(userId: string): Promise<EngagementScoringModel[]> {
    const { data, error } = await supabase
      .from('engagement_scoring_models')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('last_trained_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  static async createScoringModel(
    userId: string,
    model: Omit<EngagementScoringModel, 'id'>
  ): Promise<EngagementScoringModel> {
    const { data, error } = await supabase
      .from('engagement_scoring_models')
      .insert({
        user_id: userId,
        ...model,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async optimizeSendTime(userId: string, recipientEmail: string): Promise<{
    optimal_hour: number;
    optimal_day: number;
    confidence: number;
  }> {
    // Get recipient's engagement history
    const { data: events, error } = await supabase
      .from('behavioral_events')
      .select('timestamp, event_type')
      .eq('user_id', userId)
      .eq('email_address', recipientEmail)
      .eq('event_type', 'open')
      .order('timestamp', { ascending: false })
      .limit(100);

    if (error) throw error;

    if (!events || events.length < 5) {
      // Not enough data, return general best practices
      return {
        optimal_hour: 10, // 10 AM
        optimal_day: 2,   // Tuesday
        confidence: 0.3,
      };
    }

    // Analyze engagement patterns
    const hourCounts: Record<number, number> = {};
    const dayCounts: Record<number, number> = {};

    events.forEach(event => {
      const date = new Date(event.timestamp);
      const hour = date.getHours();
      const day = date.getDay();

      hourCounts[hour] = (hourCounts[hour] || 0) + 1;
      dayCounts[day] = (dayCounts[day] || 0) + 1;
    });

    // Find optimal hour and day
    const optimalHour = Object.entries(hourCounts)
      .sort(([,a], [,b]) => b - a)[0]?.[0];
    
    const optimalDay = Object.entries(dayCounts)
      .sort(([,a], [,b]) => b - a)[0]?.[0];

    // Calculate confidence based on data consistency
    const totalEvents = events.length;
    const maxHourCount = Math.max(...Object.values(hourCounts));
    const maxDayCount = Math.max(...Object.values(dayCounts));
    
    const confidence = Math.min(
      (maxHourCount / totalEvents) + (maxDayCount / totalEvents),
      1.0
    );

    return {
      optimal_hour: parseInt(optimalHour) || 10,
      optimal_day: parseInt(optimalDay) || 2,
      confidence,
    };
  }

  static async optimizeFrequency(userId: string, recipientEmail: string): Promise<{
    optimal_frequency_days: number;
    max_frequency_per_week: number;
    confidence: number;
  }> {
    // Get recipient's engagement and fatigue patterns
    const { data: events, error } = await supabase
      .from('behavioral_events')
      .select('timestamp, event_type, campaign_id')
      .eq('user_id', userId)
      .eq('email_address', recipientEmail)
      .gte('timestamp', new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString())
      .order('timestamp', { ascending: true });

    if (error) throw error;

    if (!events || events.length < 10) {
      return {
        optimal_frequency_days: 7,
        max_frequency_per_week: 2,
        confidence: 0.3,
      };
    }

    // Analyze engagement vs frequency patterns
    const campaigns = new Set(events.map(e => e.campaign_id).filter(Boolean));
    const engagementByGap: Record<number, { opens: number; total: number }> = {};

    let lastSentTime: Date | null = null;
    
    events.forEach(event => {
      if (event.campaign_id && lastSentTime) {
        const daysSinceLastSent = Math.floor(
          (new Date(event.timestamp).getTime() - lastSentTime.getTime()) / 
          (1000 * 60 * 60 * 24)
        );

        if (!engagementByGap[daysSinceLastSent]) {
          engagementByGap[daysSinceLastSent] = { opens: 0, total: 0 };
        }

        engagementByGap[daysSinceLastSent].total++;
        if (event.event_type === 'open') {
          engagementByGap[daysSinceLastSent].opens++;
        }
      }

      if (event.campaign_id) {
        lastSentTime = new Date(event.timestamp);
      }
    });

    // Find optimal frequency
    let bestEngagementRate = 0;
    let optimalGap = 7;

    Object.entries(engagementByGap).forEach(([gap, stats]) => {
      const engagementRate = stats.opens / stats.total;
      if (engagementRate > bestEngagementRate && stats.total >= 3) {
        bestEngagementRate = engagementRate;
        optimalGap = parseInt(gap);
      }
    });

    return {
      optimal_frequency_days: Math.max(1, optimalGap),
      max_frequency_per_week: Math.floor(7 / Math.max(1, optimalGap)),
      confidence: Math.min(bestEngagementRate * 2, 1.0),
    };
  }

  static async calculateEngagementPrediction(
    userId: string,
    recipientEmail: string,
    campaignFeatures: Record<string, any>
  ): Promise<{
    predicted_open_rate: number;
    predicted_click_rate: number;
    confidence: number;
    factors: Record<string, number>;
  }> {
    // Get recipient's behavior profile
    const { data: profile } = await supabase
      .from('user_behavior_profiles')
      .select('*')
      .eq('user_id', userId)
      .eq('email_address', recipientEmail)
      .maybeSingle();

    if (!profile) {
      return {
        predicted_open_rate: 0.2,
        predicted_click_rate: 0.05,
        confidence: 0.1,
        factors: {},
      };
    }

    // Simple predictive model based on historical performance
    const baseOpenRate = 0.25;
    const baseClickRate = 0.05;

    // Engagement score factor (0.5 to 1.5 multiplier)
    const engagementFactor = 0.5 + (profile.engagement_score / 100);

    // Time since last engagement factor
    let recencyFactor = 1.0;
    if (profile.last_engagement_at) {
      const daysSince = Math.floor(
        (Date.now() - new Date(profile.last_engagement_at).getTime()) / 
        (1000 * 60 * 60 * 24)
      );
      recencyFactor = Math.max(0.3, 1.0 - (daysSince * 0.02));
    }

    // Subject line and content factors
    const subjectLineFactor = campaignFeatures.subject_length ? 
      Math.max(0.8, 1.2 - (campaignFeatures.subject_length - 50) * 0.005) : 1.0;

    const predictedOpenRate = Math.min(
      0.8,
      baseOpenRate * engagementFactor * recencyFactor * subjectLineFactor
    );

    const predictedClickRate = Math.min(
      0.3,
      baseClickRate * engagementFactor * recencyFactor
    );

    return {
      predicted_open_rate: predictedOpenRate,
      predicted_click_rate: predictedClickRate,
      confidence: Math.min(profile.engagement_score / 100, 0.8),
      factors: {
        engagement_factor: engagementFactor,
        recency_factor: recencyFactor,
        subject_line_factor: subjectLineFactor,
      },
    };
  }
}
