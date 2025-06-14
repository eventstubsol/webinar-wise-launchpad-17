
import { supabase } from '@/integrations/supabase/client';
import { castToRecord } from '@/services/types/TypeCasters';
import { WorkflowSubscription } from './types/WorkflowTypes';
import { WorkflowRepository } from './WorkflowRepository';

export class WorkflowSubscriptionService {
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

    // Update workflow subscriber count
    await WorkflowRepository.incrementSubscriberCount(workflowId);

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
}
