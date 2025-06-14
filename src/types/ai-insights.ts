
export interface OpenAIInsightResponse {
  insights?: string[];
  peak_moments?: Array<{
    time: string;
    reason: string;
    engagement_level: number;
  }>;
  drop_off_analysis?: {
    major_dropoff_points: Array<{
      time: string;
      dropoff_count: number;
      likely_reason: string;
    }>;
    recommendations: string[];
  };
  recommendations?: string[];
  engagement_score?: number;
  justification?: string;
  effective_segments?: Array<{
    segment: string;
    effectiveness_score: number;
    reason: string;
  }>;
  ineffective_segments?: Array<{
    segment: string;
    effectiveness_score: number;
    issues: string[];
  }>;
  key_themes?: string[];
  content_gaps?: string[];
  improvements?: string[];
  effectiveness_score?: number;
  overall_sentiment?: number;
  sentiment_timeline?: Array<{
    period: string;
    sentiment_score: number;
  }>;
  positive_drivers?: string[];
  negative_drivers?: string[];
  satisfaction_indicators?: string[];
  strong_moments?: Array<{
    moment: string;
    impact: string;
  }>;
  improvement_areas?: string[];
  engagement_techniques?: string[];
  cost_per_participant?: number;
  conversion_ratio?: number;
  roi_percentage?: number;
  business_impact_score?: number;
  roi_strategies?: string[];
}

export interface StreamingInsightData {
  content: string;
  isComplete: boolean;
  confidence?: number;
}

export interface InsightGenerationStatus {
  insightId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress?: number;
  estimatedTimeRemaining?: number;
  error?: string;
}

export interface UsageStatistics {
  totalRequests: number;
  requestsByModel: Record<string, number>;
  requestsByStatus: Record<string, number>;
  avgProcessingTime: number;
  estimatedCost: number;
}
