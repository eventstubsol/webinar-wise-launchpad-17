
import { supabase } from '@/integrations/supabase/client';
import { castToRecord, castToArray } from '@/services/types/TypeCasters';
import { AutomationWorkflow } from './types/WorkflowTypes';

export class WorkflowRepository {
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

  static async incrementSubscriberCount(workflowId: string): Promise<void> {
    // Update workflow subscriber count by fetching current count and incrementing
    const { data: currentWorkflow, error: fetchError } = await supabase
      .from('campaign_automation_workflows')
      .select('total_subscribers')
      .eq('id', workflowId)
      .single();

    if (!fetchError && currentWorkflow) {
      await supabase
        .from('campaign_automation_workflows')
        .update({
          total_subscribers: (currentWorkflow.total_subscribers || 0) + 1
        })
        .eq('id', workflowId);
    }
  }
}
