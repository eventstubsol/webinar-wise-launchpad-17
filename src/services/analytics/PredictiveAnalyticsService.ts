import { supabase } from '@/integrations/supabase/client';
import { castToRecord, castToArray, castModelType } from '@/services/types/TypeCasters';

export interface PredictiveModel {
  id: string;
  model_name: string;
  model_type: 'churn_prediction' | 'ltv_prediction' | 'engagement_forecast';
  algorithm: string;
  model_parameters: Record<string, any>;
  feature_columns: string[];
  target_column: string;
  accuracy_score?: number;
  precision_score?: number;
  recall_score?: number;
  f1_score?: number;
  training_data_size?: number;
  last_trained_at?: string;
  is_active: boolean;
}

export interface ChurnPrediction {
  email_address: string;
  churn_probability: number;
  risk_level: 'low' | 'medium' | 'high';
  contributing_factors: Record<string, number>;
  recommended_actions: string[];
  confidence: number;
}

export interface LTVPrediction {
  email_address: string;
  predicted_ltv: number;
  ltv_category: 'low' | 'medium' | 'high';
  time_horizon_days: number;
  confidence: number;
  contributing_factors: Record<string, number>;
}

export interface EngagementForecast {
  email_address: string;
  predicted_engagement_score: number;
  forecast_period_days: number;
  trend: 'increasing' | 'decreasing' | 'stable';
  confidence: number;
  key_drivers: Record<string, number>;
}

export class PredictiveAnalyticsService {
  static async getPredictiveModels(userId: string): Promise<PredictiveModel[]> {
    const { data, error } = await supabase
      .from('predictive_models')
      .select('*')
      .eq('user_id', userId)
      .order('last_trained_at', { ascending: false });

    if (error) throw error;
    
    return (data || []).map(model => ({
      id: model.id,
      model_name: model.model_name,
      model_type: castModelType(model.model_type),
      algorithm: model.algorithm,
      model_parameters: castToRecord(model.model_parameters),
      feature_columns: castToArray(model.feature_columns),
      target_column: model.target_column,
      accuracy_score: model.accuracy_score,
      precision_score: model.precision_score,
      recall_score: model.recall_score,
      f1_score: model.f1_score,
      training_data_size: model.training_data_size,
      last_trained_at: model.last_trained_at,
      is_active: model.is_active,
    }));
  }

  static async createPredictiveModel(
    userId: string,
    model: Omit<PredictiveModel, 'id'>
  ): Promise<PredictiveModel> {
    const { data, error } = await supabase
      .from('predictive_models')
      .insert({
        user_id: userId,
        model_name: model.model_name,
        model_type: model.model_type,
        algorithm: model.algorithm,
        model_parameters: model.model_parameters,
        feature_columns: model.feature_columns,
        target_column: model.target_column,
        accuracy_score: model.accuracy_score,
        precision_score: model.precision_score,
        recall_score: model.recall_score,
        f1_score: model.f1_score,
        training_data_size: model.training_data_size,
        last_trained_at: model.last_trained_at,
        is_active: model.is_active,
      })
      .select()
      .single();

    if (error) throw error;
    
    return {
      id: data.id,
      model_name: data.model_name,
      model_type: castModelType(data.model_type),
      algorithm: data.algorithm,
      model_parameters: castToRecord(data.model_parameters),
      feature_columns: castToArray(data.feature_columns),
      target_column: data.target_column,
      accuracy_score: data.accuracy_score,
      precision_score: data.precision_score,
      recall_score: data.recall_score,
      f1_score: data.f1_score,
      training_data_size: data.training_data_size,
      last_trained_at: data.last_trained_at,
      is_active: data.is_active,
    };
  }

  static async predictChurn(
    userId: string,
    emailAddresses?: string[]
  ): Promise<ChurnPrediction[]> {
    // Get behavior profiles for prediction
    let query = supabase
      .from('user_behavior_profiles')
      .select('*')
      .eq('user_id', userId);

    if (emailAddresses) {
      query = query.in('email_address', emailAddresses);
    }

    const { data: profiles, error } = await query;
    if (error) throw error;

    if (!profiles || profiles.length === 0) {
      return [];
    }

    const predictions: ChurnPrediction[] = [];

    for (const profile of profiles) {
      const churnProbability = this.calculateChurnProbability(profile);
      const riskLevel = this.getChurnRiskLevel(churnProbability);
      const contributingFactors = this.getChurnFactors(profile);
      const recommendedActions = this.getChurnRecommendations(profile, churnProbability);

      predictions.push({
        email_address: profile.email_address,
        churn_probability: churnProbability,
        risk_level: riskLevel,
        contributing_factors: contributingFactors,
        recommended_actions: recommendedActions,
        confidence: this.calculateConfidence(profile),
      });
    }

    return predictions;
  }

  static async predictLTV(
    userId: string,
    emailAddresses?: string[],
    timeHorizonDays: number = 365
  ): Promise<LTVPrediction[]> {
    let query = supabase
      .from('user_behavior_profiles')
      .select('*')
      .eq('user_id', userId);

    if (emailAddresses) {
      query = query.in('email_address', emailAddresses);
    }

    const { data: profiles, error } = await query;
    if (error) throw error;

    if (!profiles || profiles.length === 0) {
      return [];
    }

    const predictions: LTVPrediction[] = [];

    for (const profile of profiles) {
      const predictedLTV = this.calculateLTV(profile, timeHorizonDays);
      const ltvCategory = this.getLTVCategory(predictedLTV);
      const contributingFactors = this.getLTVFactors(profile);

      predictions.push({
        email_address: profile.email_address,
        predicted_ltv: predictedLTV,
        ltv_category: ltvCategory,
        time_horizon_days: timeHorizonDays,
        confidence: this.calculateConfidence(profile),
        contributing_factors: contributingFactors,
      });
    }

    return predictions;
  }

  static async forecastEngagement(
    userId: string,
    emailAddresses?: string[],
    forecastDays: number = 30
  ): Promise<EngagementForecast[]> {
    let query = supabase
      .from('user_behavior_profiles')
      .select('*')
      .eq('user_id', userId);

    if (emailAddresses) {
      query = query.in('email_address', emailAddresses);
    }

    const { data: profiles, error } = await query;
    if (error) throw error;

    if (!profiles || profiles.length === 0) {
      return [];
    }

    const forecasts: EngagementForecast[] = [];

    for (const profile of profiles) {
      const predictedScore = this.forecastEngagementScore(profile, forecastDays);
      const trend = this.getEngagementTrend(profile);
      const keyDrivers = this.getEngagementDrivers(profile);

      forecasts.push({
        email_address: profile.email_address,
        predicted_engagement_score: predictedScore,
        forecast_period_days: forecastDays,
        trend,
        confidence: this.calculateConfidence(profile),
        key_drivers: keyDrivers,
      });
    }

    return forecasts;
  }

  static async trainModel(
    modelId: string,
    trainingData: any[]
  ): Promise<{ success: boolean; metrics: Record<string, number> }> {
    // This would typically interface with a ML service
    // For now, we'll simulate training and return mock metrics
    
    const { error } = await supabase
      .from('predictive_models')
      .update({
        last_trained_at: new Date().toISOString(),
        training_data_size: trainingData.length,
        accuracy_score: 0.85,
        precision_score: 0.83,
        recall_score: 0.87,
        f1_score: 0.85,
      })
      .eq('id', modelId);

    if (error) throw error;

    return {
      success: true,
      metrics: {
        accuracy: 0.85,
        precision: 0.83,
        recall: 0.87,
        f1_score: 0.85,
      },
    };
  }

  private static calculateChurnProbability(profile: any): number {
    let churnScore = 0;

    // Engagement score factor (lower engagement = higher churn risk)
    churnScore += (100 - profile.engagement_score) * 0.4;

    // Days since last engagement
    if (profile.last_engagement_at) {
      const daysSince = Math.floor(
        (Date.now() - new Date(profile.last_engagement_at).getTime()) / 
        (1000 * 60 * 60 * 24)
      );
      churnScore += Math.min(50, daysSince * 0.5);
    } else {
      churnScore += 50;
    }

    // Existing churn risk score
    churnScore += profile.churn_risk_score * 10;

    return Math.min(1.0, churnScore / 100);
  }

  private static getChurnRiskLevel(probability: number): 'low' | 'medium' | 'high' {
    if (probability < 0.3) return 'low';
    if (probability < 0.7) return 'medium';
    return 'high';
  }

  private static getChurnFactors(profile: any): Record<string, number> {
    return {
      low_engagement: Math.max(0, (50 - profile.engagement_score) / 50),
      inactivity: profile.last_engagement_at ? 
        Math.min(1, Math.floor((Date.now() - new Date(profile.last_engagement_at).getTime()) / (1000 * 60 * 60 * 24)) / 30) : 1,
      lifecycle_stage: profile.lifecycle_stage === 'dormant' ? 0.8 : 0.2,
    };
  }

  private static getChurnRecommendations(profile: any, churnProbability: number): string[] {
    const recommendations = [];

    if (churnProbability > 0.7) {
      recommendations.push('Send personalized win-back campaign');
      recommendations.push('Offer exclusive discount or incentive');
    }

    if (profile.engagement_score < 30) {
      recommendations.push('Reduce email frequency temporarily');
      recommendations.push('Send content preference survey');
    }

    if (profile.last_engagement_at) {
      const daysSince = Math.floor(
        (Date.now() - new Date(profile.last_engagement_at).getTime()) / 
        (1000 * 60 * 60 * 24)
      );
      
      if (daysSince > 30) {
        recommendations.push('Send re-engagement campaign');
      }
    }

    return recommendations;
  }

  private static calculateLTV(profile: any, timeHorizonDays: number): number {
    // Simplified LTV calculation based on engagement and predicted behavior
    const baseValue = 50; // Base LTV in currency units
    const engagementMultiplier = profile.engagement_score / 50;
    const timeMultiplier = timeHorizonDays / 365;
    
    return baseValue * engagementMultiplier * timeMultiplier * (1 - profile.churn_risk_score);
  }

  private static getLTVCategory(ltv: number): 'low' | 'medium' | 'high' {
    if (ltv < 25) return 'low';
    if (ltv < 75) return 'medium';
    return 'high';
  }

  private static getLTVFactors(profile: any): Record<string, number> {
    return {
      engagement_score: profile.engagement_score / 100,
      loyalty: profile.lifecycle_stage === 'active' ? 0.8 : 0.4,
      predicted_longevity: 1 - profile.churn_risk_score,
    };
  }

  private static forecastEngagementScore(profile: any, forecastDays: number): number {
    const currentScore = profile.engagement_score;
    const trend = this.getEngagementTrend(profile);
    
    let forecastScore = currentScore;
    
    if (trend === 'increasing') {
      forecastScore += (forecastDays / 30) * 5; // +5 points per month
    } else if (trend === 'decreasing') {
      forecastScore -= (forecastDays / 30) * 3; // -3 points per month
    }
    
    return Math.max(0, Math.min(100, forecastScore));
  }

  private static getEngagementTrend(profile: any): 'increasing' | 'decreasing' | 'stable' {
    // This would analyze historical data to determine trend
    // For now, using simple heuristics based on current state
    
    if (profile.engagement_score > 70) return 'stable';
    if (profile.churn_risk_score > 0.6) return 'decreasing';
    if (profile.lifecycle_stage === 'new') return 'increasing';
    
    return 'stable';
  }

  private static getEngagementDrivers(profile: any): Record<string, number> {
    return {
      content_relevance: 0.3,
      send_time_optimization: profile.preferred_send_hour ? 0.8 : 0.4,
      frequency_optimization: 0.6,
      personalization: 0.5,
    };
  }

  private static calculateConfidence(profile: any): number {
    // Calculate confidence based on data availability and recency
    let confidence = 0.5; // Base confidence
    
    if (profile.last_engagement_at) {
      const daysSince = Math.floor(
        (Date.now() - new Date(profile.last_engagement_at).getTime()) / 
        (1000 * 60 * 60 * 24)
      );
      confidence += Math.max(0, (30 - daysSince) / 30) * 0.3;
    }
    
    if (profile.interaction_history && profile.interaction_history.length > 10) {
      confidence += 0.2;
    }
    
    return Math.min(1.0, confidence);
  }
}
