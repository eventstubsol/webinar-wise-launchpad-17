
import { supabase } from '@/integrations/supabase/client';

export class ExecutionQueueService {
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
