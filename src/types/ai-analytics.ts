
export interface AIInsight {
  id: string;
  user_id: string;
  webinar_id?: string;
  insight_type: string;
  insight_title: string;
  insight_summary?: string;
  insight_data: any;
  ai_model_name: string;
  confidence_score?: number;
  status: string;
  version: number;
  processing_duration_ms?: number;
  created_at: string;
  updated_at: string;
}

export interface CreateAIInsightRequest {
  webinar_id?: string;
  insight_type: string;
  insight_title: string;
  insight_summary?: string;
  insight_data: any;
  ai_model_name: string;
  confidence_score?: number;
  status?: string;
  version?: number;
}

export interface EngagementPrediction {
  id: string;
  user_id: string;
  webinar_id: string;
  prediction_type: string;
  predicted_value: number;
  confidence_score: number;
  model_name: string;
  prediction_timestamp: string;
  created_at: string;
  updated_at: string;
}

export interface CustomMetric {
  id: string;
  user_id: string;
  metric_name: string;
  metric_description: string;
  calculation_formula: string;
  data_type: 'number' | 'percentage' | 'currency' | 'duration';
  aggregation_method: string;
  time_period_days: number;
  warning_threshold?: number;
  critical_threshold?: number;
  chart_type: string;
  display_format: string;
  color_scheme: string;
  is_active: boolean;
  is_public: boolean;
  dashboard_order: number;
  created_at: string;
  updated_at: string;
}
