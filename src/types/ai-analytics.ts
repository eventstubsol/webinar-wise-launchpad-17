
export interface AIInsight {
  id: string;
  user_id: string;
  webinar_id?: string;
  insight_type: string;
  insight_title: string;
  insight_data: any;
  ai_model_name: string;
  confidence_score?: number;
  status: string;
  version: number;
  created_at: string;
  updated_at: string;
}

export interface CreateAIInsightRequest {
  webinar_id?: string;
  insight_type: string;
  insight_title: string;
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
