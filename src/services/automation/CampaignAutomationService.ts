
import { supabase } from '@/integrations/supabase/client';
import { castToRecord, castToArray } from '@/services/types/TypeCasters';

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
  status: string;
  started_at: string;
  completed_at?: string;
  next_action_at?: string;
  metadata: Record<string, any>;
}

export class CampaignAutomationService {
  static async getWorkflows(userId: string): Promise<AutomationWorkflow[]> {
    const { data, error } = await supabase
      .from('campaign_automation_workflows')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return (data || []).map(workflow => ({
      id: workflow.id,
      user_id: workflow.user_id,
      workflow_name: workflow.workflow_name,
      workflow_type: workflow.workflow_type,
      trigger_conditions: castToRecord(workflow.trigger_conditions),
      workflow_steps: castToArray(workflow.workflow_steps),
      is_active: workflow.is_active,
      total_subscribers: workflow.total_subscribers,
      completed_subscribers: workflow.completed_subscribers,
      created_at: workflow.created_at,
      updated_at: workflow.updated_at,
    }));
  }

  static async createWorkflow(
    userId: string,
    workflow: Omit<AutomationWorkflow, 'id' | 'user_id' | 'total_subscribers' | 'completed_subscribers' | 'created_at' | 'updated_at'>
  ): Promise<AutomationWorkflow> {
    const { data, error } = await supabase
      .from('campaign_automation_workflows')
      .insert({
        user_id: userId,
        workflow_name: workflow.workflow_name,
        workflow_type: workflow.workflow_type,
        trigger_conditions: workflow.trigger_conditions as any,
        workflow_steps: workflow.workflow_steps as any,
        is_active: workflow.is_active,
      })
      .select()
      .single();

    if (error) throw error;

    return {
      id: data.id,
      user_id: data.user_id,
      workflow_name: data.workflow_name,
      workflow_type: data.workflow_type,
      trigger_conditions: castToRecord(data.trigger_conditions),
      workflow_steps: castToArray(data.workflow_steps),
      is_active: data.is_active,
      total_subscribers: data.total_subscribers,
      completed_subscribers: data.completed_subscribers,
      created_at: data.created_at,
      updated_at: data.updated_at,
    };
  }

  static async subscribeToWorkflow(
    workflowId: string,
    subscriberEmail: string,
    subscriberId: string,
    metadata: Record<string, any> = {}
  ): Promise<WorkflowSubscription> {
    const { data, error } = await supabase
      .from('workflow_subscriptions')
      .insert({
        workflow_id: workflowId,
        subscriber_email: subscriberEmail,
        subscriber_id: subscriberId,
        current_step: 0,
        status: 'active',
        next_action_at: new Date().toISOString(),
        metadata: metadata as any,
      })
      .select()
      .single();

    if (error) throw error;

    // Update workflow subscriber count manually
    await supabase
      .from('campaign_automation_workflows')
      .update({
        total_subscribers: supabase.raw('total_subscribers + 1')
      })
      .eq('id', workflowId);

    return {
      id: data.id,
      workflow_id: data.workflow_id,
      subscriber_email: data.subscriber_email,
      subscriber_id: data.subscriber_id,
      current_step: data.current_step,
      status: data.status,
      started_at: data.started_at,
      completed_at: data.completed_at,
      next_action_at: data.next_action_at,
      metadata: castToRecord(data.metadata),
    };
  }

  static async getWorkflowSubscriptions(workflowId: string): Promise<WorkflowSubscription[]> {
    const { data, error } = await supabase
      .from('workflow_subscriptions')
      .select('*')
      .eq('workflow_id', workflowId)
      .order('started_at', { ascending: false });

    if (error) throw error;

    return (data || []).map(subscription => ({
      id: subscription.id,
      workflow_id: subscription.workflow_id,
      subscriber_email: subscription.subscriber_email,
      subscriber_id: subscription.subscriber_id,
      current_step: subscription.current_step,
      status: subscription.status,
      started_at: subscription.started_at,
      completed_at: subscription.completed_at,
      next_action_at: subscription.next_action_at,
      metadata: castToRecord(subscription.metadata),
    }));
  }

  static async createWebinarFollowUpWorkflow(
    userId: string,
    webinarId: string,
    workflowName: string
  ): Promise<AutomationWorkflow> {
    const defaultSteps: WorkflowStep[] = [
      {
        id: '1',
        type: 'email',
        name: 'Thank You Email',
        config: {
          template_id: 'thank_you_template',
          subject: 'Thank you for attending our webinar!',
          delay_hours: 1
        },
        delay_hours: 1
      },
      {
        id: '2',
        type: 'email',
        name: 'Resource Follow-up',
        config: {
          template_id: 'resources_template',
          subject: 'Additional resources from today\'s webinar',
          delay_hours: 24
        },
        delay_hours: 24
      },
      {
        id: '3',
        type: 'email',
        name: 'Feedback Request',
        config: {
          template_id: 'feedback_template',
          subject: 'We\'d love your feedback!',
          delay_hours: 72
        },
        delay_hours: 72
      }
    ];

    return this.createWorkflow(userId, {
      workflow_name: workflowName,
      workflow_type: 'webinar_follow_up',
      trigger_conditions: {
        webinar_id: webinarId,
        trigger_event: 'webinar_attended'
      },
      workflow_steps: defaultSteps,
      is_active: true,
    });
  }

  static async scheduleCampaignExecution(
    campaignId: string,
    executionType: 'immediate' | 'scheduled' | 'triggered',
    scheduledFor?: string,
    config: Record<string, any> = {}
  ): Promise<void> {
    const { error } = await supabase
      .from('campaign_execution_queue')
      .insert({
        campaign_id: campaignId,
        execution_type: executionType,
        scheduled_for: scheduledFor || new Date().toISOString(),
        execution_config: config as any,
        status: 'pending'
      });

    if (error) throw error;
  }

  static async scheduleWorkflowExecution(
    workflowId: string,
    executionType: 'immediate' | 'scheduled' | 'triggered',
    scheduledFor?: string,
    config: Record<string, any> = {}
  ): Promise<void> {
    const { error } = await supabase
      .from('campaign_execution_queue')
      .insert({
        workflow_id: workflowId,
        execution_type: executionType,
        scheduled_for: scheduledFor || new Date().toISOString(),
        execution_config: config as any,
        status: 'pending'
      });

    if (error) throw error;
  }

  static async getExecutionQueue(userId: string): Promise<any[]> {
    const { data, error } = await supabase
      .from('campaign_execution_queue')
      .select(`
        *,
        email_campaigns!campaign_execution_queue_campaign_id_fkey(id, campaign_type, subject_template),
        campaign_automation_workflows!campaign_execution_queue_workflow_id_fkey(id, workflow_name, workflow_type)
      `)
      .or(`
        campaign_id.in.(select id from email_campaigns where user_id = '${userId}'),
        workflow_id.in.(select id from campaign_automation_workflows where user_id = '${userId}')
      `)
      .order('scheduled_for', { ascending: true });

    if (error) throw error;
    return data || [];
  }
}
