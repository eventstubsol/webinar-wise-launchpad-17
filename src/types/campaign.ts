
// Database types that match Supabase exactly
export interface DatabaseAudienceSegment {
  id: string;
  user_id: string;
  segment_name: string;
  description?: string;
  filter_criteria: any; // Json from database
  tags: string[];
  is_dynamic: boolean;
  estimated_size: number;
  last_calculated_at?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface DatabaseCampaign {
  id: string;
  user_id: string;
  campaign_type: string;
  status: string;
  subject_template: string;
  audience_segment: any; // Json from database
  template_id?: string;
  workflow_id?: string;
  send_schedule?: any; // Json from database
  last_run_at?: string;
  created_at: string;
  updated_at: string;
}

// Application types
export interface AudienceSegment {
  id: string;
  user_id: string;
  segment_name: string;
  description?: string;
  filter_criteria: Record<string, any>;
  tags: string[];
  is_dynamic: boolean;
  estimated_size: number;
  last_calculated_at?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CampaignVariant {
  id: string;
  campaign_id: string;
  variant_name: string;
  variant_type: 'subject' | 'content' | 'send_time' | 'template';
  template_id?: string;
  subject_line?: string;
  content_changes: Record<string, any>;
  send_time_offset: number;
  split_percentage: number;
  recipient_count: number;
  performance_metrics: Record<string, any>;
  is_control: boolean;
  is_winner: boolean;
  created_at: string;
}

export interface CampaignAnalytics {
  id: string;
  campaign_id: string;
  variant_id?: string;
  metric_type: 'sent' | 'delivered' | 'opened' | 'clicked' | 'bounced' | 'unsubscribed' | 'complained' | 'converted';
  metric_value: number;
  recipient_email?: string;
  event_timestamp: string;
  event_data: Record<string, any>;
  created_at: string;
}

export interface SendTimeOptimization {
  id: string;
  user_id: string;
  recipient_email: string;
  optimal_hour: number;
  optimal_day_of_week: number;
  timezone: string;
  engagement_score: number;
  last_updated: string;
  confidence_level: number;
  sample_size: number;
}

export interface CampaignSchedule {
  id: string;
  campaign_id: string;
  schedule_type: 'immediate' | 'scheduled' | 'recurring' | 'trigger_based';
  send_at?: string;
  timezone: string;
  recurrence_pattern?: Record<string, any>;
  trigger_conditions?: Record<string, any>;
  frequency_cap: Record<string, any>;
  is_active: boolean;
  last_executed_at?: string;
  next_execution_at?: string;
  execution_count: number;
  created_at: string;
  updated_at: string;
}

export interface CampaignPerformanceSummary {
  id: string;
  campaign_id: string;
  total_sent: number;
  total_delivered: number;
  total_opened: number;
  total_clicked: number;
  total_bounced: number;
  total_unsubscribed: number;
  total_complained: number;
  total_converted: number;
  open_rate: number;
  click_rate: number;
  bounce_rate: number;
  unsubscribe_rate: number;
  conversion_rate: number;
  revenue_generated: number;
  calculated_at: string;
  created_at: string;
}

export interface EmailSendQueue {
  id: string;
  campaign_id: string;
  variant_id?: string;
  recipient_email: string;
  recipient_id?: string;
  personalization_data: Record<string, any>;
  scheduled_send_time: string;
  priority: number;
  status: 'queued' | 'processing' | 'sent' | 'failed' | 'cancelled';
  attempts: number;
  max_attempts: number;
  error_message?: string;
  sent_at?: string;
  created_at: string;
  updated_at: string;
}

export interface CampaignTemplate {
  id: string;
  user_id: string;
  template_name: string;
  description?: string;
  category: 'welcome_series' | 'product_launch' | 're_engagement' | 'newsletter' | 'promotional' | 'educational' | 'custom';
  workflow_config: Record<string, any>;
  default_settings: Record<string, any>;
  is_public: boolean;
  is_featured: boolean;
  usage_count: number;
  rating: number;
  rating_count: number;
  tags: string[];
  created_at: string;
  updated_at: string;
}

export interface Campaign {
  id: string;
  user_id: string;
  campaign_type: string;
  status: string;
  subject_template: string;
  audience_segment: Record<string, any>;
  template_id?: string;
  workflow_id?: string;
  send_schedule?: Record<string, any>;
  last_run_at?: string;
  created_at: string;
  updated_at: string;
  ab_test_config?: ABTestConfig;
}

export interface CampaignBuilderStep {
  id: string;
  title: string;
  description: string;
  component: React.ComponentType<any>;
  isComplete: boolean;
  isOptional?: boolean;
}

export interface ABTestConfig {
  enabled: boolean;
  variants: CampaignVariant[];
  test_duration_hours: number;
  success_metric: 'open_rate' | 'click_rate' | 'conversion_rate';
  confidence_level: number;
  sample_size_percentage: number;
}

export interface SegmentFilter {
  field: string;
  operator: 'equals' | 'not_equals' | 'contains' | 'not_contains' | 'greater_than' | 'less_than' | 'in' | 'not_in';
  value: any;
  type: 'string' | 'number' | 'date' | 'boolean' | 'array';
}

export interface SegmentFilterGroup {
  logic: 'AND' | 'OR';
  filters: (SegmentFilter | SegmentFilterGroup)[];
}

// Helper types for the A/B testing UI
export interface TestVariant {
  id: string;
  name: string;
  subject: string;
  percentage: number;
}

// Type conversion utilities
export function transformDatabaseAudienceSegment(dbSegment: DatabaseAudienceSegment): AudienceSegment {
  return {
    ...dbSegment,
    filter_criteria: typeof dbSegment.filter_criteria === 'string' 
      ? JSON.parse(dbSegment.filter_criteria) 
      : dbSegment.filter_criteria || {}
  };
}

export function transformDatabaseCampaign(dbCampaign: DatabaseCampaign): Campaign {
  return {
    ...dbCampaign,
    audience_segment: typeof dbCampaign.audience_segment === 'string'
      ? JSON.parse(dbCampaign.audience_segment)
      : dbCampaign.audience_segment || {},
    send_schedule: typeof dbCampaign.send_schedule === 'string'
      ? JSON.parse(dbCampaign.send_schedule)
      : dbCampaign.send_schedule || undefined
  };
}

// Campaign creation types
export interface CampaignCreateData {
  campaign_type: string;
  subject_template: string;
  status: string;
  user_id: string;
  audience_segment?: Record<string, any>;
  template_id?: string;
  workflow_id?: string;
  send_schedule?: Record<string, any>;
}
