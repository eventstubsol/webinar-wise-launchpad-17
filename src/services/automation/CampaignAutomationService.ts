
import { AutomationWorkflow } from './types/WorkflowTypes';
import { WorkflowRepository } from './WorkflowRepository';
import { WorkflowSubscriptionService } from './WorkflowSubscriptionService';
import { WorkflowTemplateService } from './WorkflowTemplateService';
import { ExecutionQueueService } from './ExecutionQueueService';

export class CampaignAutomationService {
  // Re-export types for backward compatibility
  static async getWorkflows(userId: string) {
    return WorkflowRepository.getWorkflows(userId);
  }

  static async createWorkflow(
    userId: string,
    workflow: Omit<AutomationWorkflow, 'id' | 'user_id' | 'total_subscribers' | 'completed_subscribers' | 'created_at' | 'updated_at'>
  ) {
    return WorkflowRepository.createWorkflow(userId, workflow);
  }

  static async subscribeToWorkflow(
    workflowId: string,
    subscriberEmail: string,
    subscriberId: string,
    metadata: Record<string, any> = {}
  ) {
    return WorkflowSubscriptionService.subscribeToWorkflow(workflowId, subscriberEmail, subscriberId, metadata);
  }

  static async getWorkflowSubscriptions(workflowId: string) {
    return WorkflowSubscriptionService.getWorkflowSubscriptions(workflowId);
  }

  static async createWebinarFollowUpWorkflow(
    userId: string,
    webinarId: string,
    workflowName: string
  ) {
    const defaultSteps = WorkflowTemplateService.createWebinarFollowUpSteps();

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
  ) {
    return ExecutionQueueService.scheduleCampaignExecution(campaignId, executionType, scheduledFor, config);
  }

  static async scheduleWorkflowExecution(
    workflowId: string,
    executionType: 'immediate' | 'scheduled' | 'triggered',
    scheduledFor?: string,
    config: Record<string, any> = {}
  ) {
    return ExecutionQueueService.scheduleWorkflowExecution(workflowId, executionType, scheduledFor, config);
  }

  static async getExecutionQueue(userId: string) {
    return ExecutionQueueService.getExecutionQueue(userId);
  }
}

// Re-export types for backward compatibility
export type { WorkflowStep, AutomationWorkflow, WorkflowSubscription } from './types/WorkflowTypes';
