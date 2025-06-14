
export type AIInsightType = 'engagement' | 'content' | 'predictive' | 'custom' | 'performance';
export type AIInsightStatus = 'pending' | 'processing' | 'completed' | 'failed';
export type PredictionType = 'dropout_risk' | 'engagement_score' | 'interaction_likelihood' | 'attention_score';
export type ContentType = 'transcript' | 'slides' | 'chat' | 'audio' | 'video';
export type AnalysisStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'retrying';
export type MetricDataType = 'number' | 'percentage' | 'duration' | 'count' | 'ratio';
export type TemplateCategory = 'performance' | 'engagement' | 'content' | 'custom' | 'predictive';
export type SharingPermission = 'private' | 'team' | 'public';

export interface AIInsight {
  id: string;
  webinar_id: string;
  user_id: string;
  insight_type: AIInsightType;
  insight_title: string;
  insight_summary?: string;
  ai_model_name: string;
  ai_model_version?: string;
  confidence_score?: number;
  insight_data: Record<string, any>;
  supporting_data?: Record<string, any>;
  status: AIInsightStatus;
  version: number;
  parent_insight_id?: string;
  processing_started_at?: string;
  processing_completed_at?: string;
  processing_duration_ms?: number;
  error_message?: string;
  created_at: string;
  updated_at: string;
}

export interface EngagementPrediction {
  id: string;
  webinar_id: string;
  participant_id?: string;
  prediction_type: PredictionType;
  predicted_value: number;
  confidence_score: number;
  model_name: string;
  model_version?: string;
  feature_vector?: Record<string, any>;
  prediction_timestamp: string;
  webinar_elapsed_minutes?: number;
  participant_session_duration?: number;
  actual_value?: number;
  prediction_accuracy?: number;
  validated_at?: string;
  contributing_factors?: any[];
  prediction_explanation?: string;
  created_at: string;
  updated_at: string;
}

export interface ContentAnalysis {
  id: string;
  webinar_id: string;
  recording_id?: string;
  content_type: ContentType;
  content_source?: string;
  content_hash?: string;
  analysis_model: string;
  analysis_version?: string;
  analysis_parameters?: Record<string, any>;
  analysis_results: Record<string, any>;
  extracted_text?: string;
  key_topics?: any[];
  sentiment_scores?: Record<string, any>;
  keywords?: any[];
  summary?: string;
  analysis_quality_score?: number;
  processing_confidence?: number;
  status: AnalysisStatus;
  processing_started_at?: string;
  processing_completed_at?: string;
  processing_duration_ms?: number;
  error_message?: string;
  retry_count: number;
  created_at: string;
  updated_at: string;
}

export interface CustomMetric {
  id: string;
  user_id: string;
  connection_id?: string;
  metric_name: string;
  metric_description?: string;
  metric_category?: string;
  data_type: MetricDataType;
  calculation_formula: string;
  calculation_parameters?: Record<string, any>;
  aggregation_method: string;
  time_period_days: number;
  target_value?: number;
  warning_threshold?: number;
  critical_threshold?: number;
  display_format: string;
  chart_type: string;
  color_scheme: string;
  is_active: boolean;
  is_public: boolean;
  dashboard_order: number;
  created_at: string;
  updated_at: string;
}

export interface InsightTemplate {
  id: string;
  created_by: string;
  template_name: string;
  template_description?: string;
  category: TemplateCategory;
  version: number;
  ai_model_requirements?: Record<string, any>;
  input_parameters: Record<string, any>;
  output_schema: Record<string, any>;
  prompt_template: string;
  processing_config?: Record<string, any>;
  validation_rules?: any[];
  retry_policy?: Record<string, any>;
  sharing_permission: SharingPermission;
  allowed_users?: any[];
  allowed_teams?: any[];
  usage_count: number;
  success_rate?: number;
  avg_processing_time_ms?: number;
  is_active: boolean;
  is_featured: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateAIInsightRequest {
  webinar_id: string;
  insight_type: AIInsightType;
  insight_title: string;
  insight_summary?: string;
  ai_model_name: string;
  ai_model_version?: string;
  insight_data: Record<string, any>;
  supporting_data?: Record<string, any>;
}

export interface CreateEngagementPredictionRequest {
  webinar_id: string;
  participant_id?: string;
  prediction_type: PredictionType;
  predicted_value: number;
  confidence_score: number;
  model_name: string;
  model_version?: string;
  feature_vector?: Record<string, any>;
  webinar_elapsed_minutes?: number;
  participant_session_duration?: number;
  contributing_factors?: any[];
  prediction_explanation?: string;
}

export interface CreateContentAnalysisRequest {
  webinar_id: string;
  recording_id?: string;
  content_type: ContentType;
  content_source?: string;
  analysis_model: string;
  analysis_version?: string;
  analysis_parameters?: Record<string, any>;
}

export interface CreateCustomMetricRequest {
  metric_name: string;
  metric_description?: string;
  metric_category?: string;
  data_type: MetricDataType;
  calculation_formula: string;
  calculation_parameters?: Record<string, any>;
  aggregation_method?: string;
  time_period_days?: number;
  target_value?: number;
  warning_threshold?: number;
  critical_threshold?: number;
  display_format?: string;
  chart_type?: string;
  color_scheme?: string;
  is_public?: boolean;
  dashboard_order?: number;
}

export interface CreateInsightTemplateRequest {
  template_name: string;
  template_description?: string;
  category: TemplateCategory;
  ai_model_requirements?: Record<string, any>;
  input_parameters: Record<string, any>;
  output_schema: Record<string, any>;
  prompt_template: string;
  processing_config?: Record<string, any>;
  validation_rules?: any[];
  retry_policy?: Record<string, any>;
  sharing_permission?: SharingPermission;
  allowed_users?: any[];
  allowed_teams?: any[];
}
