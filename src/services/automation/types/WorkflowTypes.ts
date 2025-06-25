
export interface WorkflowStep {
  id: string;
  type: 'email' | 'delay' | 'condition' | 'tag' | 'segment';
  name: string;
  config: Record<string, any>;
  delay_hours?: number;
}

export interface AutomationWorkflow {
  id: string;
  user_id: string;
  workflow_name: string;
  workflow_type: string;
  trigger_conditions: Record<string, any>;
  workflow_steps: WorkflowStep[];
  is_active: boolean;
  total_subscribers: number;
  completed_subscribers: number;
  created_at: string;
  updated_at: string;
}

export interface WorkflowSubscription {
  id: string;
  workflow_id: string;
  subscriber_email: string;
  subscriber_id: string;
  current_step: number;
  status: 'active' | 'paused' | 'completed' | 'cancelled';
  started_at: string;
  completed_at?: string;
  next_action_at?: string;
  metadata: Record<string, any>;
}

export interface ExecutionQueueItem {
  id: string;
  campaign_id?: string;
  workflow_id?: string;
  execution_type: 'immediate' | 'scheduled' | 'triggered';
  scheduled_for?: string;
  priority: number;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  execution_config: Record<string, any>;
  progress_data: Record<string, any>;
  error_message?: string;
  started_at?: string;
  completed_at?: string;
  created_at: string;
  updated_at: string;
}
