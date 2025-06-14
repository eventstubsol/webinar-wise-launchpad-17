
import { supabase } from '@/integrations/supabase/client';
import { ProcessingTask } from './types';
import { AnalyticsProcessor } from './AnalyticsProcessor';

export class TaskProcessor {
  private analyticsProcessor = new AnalyticsProcessor();

  public async executeTask(task: ProcessingTask) {
    try {
      await this.updateTaskStatus(task.id, 'processing', null, new Date().toISOString());

      let result;
      switch (task.task_type) {
        case 'participant_analysis':
          result = await this.processParticipantAnalysis(task);
          break;
        case 'poll_analysis':
          result = await this.processPollAnalysis(task);
          break;
        case 'qna_analysis':
          result = await this.processQnaAnalysis(task);
          break;
        case 'engagement_analysis':
          result = await this.processEngagementAnalysis(task);
          break;
        case 'ai_insight_generation':
          result = await this.processAIInsightGeneration(task);
          break;
        default:
          throw new Error(`Unknown task type: ${task.task_type}`);
      }

      await this.updateTaskStatus(task.id, 'completed', null, null, new Date().toISOString());

      await this.analyticsProcessor.broadcastEvent('task_completed', {
        task_id: task.id,
        task_type: task.task_type,
        result,
      }, task.user_id ? [task.user_id] : null);

    } catch (error) {
      console.error(`Task ${task.id} failed:`, error);
      
      if (task.retry_count < task.max_retries) {
        const retryDelay = Math.pow(2, task.retry_count) * 1000;
        const scheduledAt = new Date(Date.now() + retryDelay).toISOString();
        
        await supabase
          .from('processing_queue')
          .update({
            retry_count: task.retry_count + 1,
            scheduled_at: scheduledAt,
            status: 'pending',
          })
          .eq('id', task.id);
      } else {
        await this.updateTaskStatus(
          task.id,
          'failed',
          error instanceof Error ? error.message : 'Unknown error',
          null,
          new Date().toISOString()
        );
      }
    }
  }

  private async updateTaskStatus(
    taskId: string,
    status: string,
    errorMessage: string | null = null,
    startedAt: string | null = null,
    completedAt: string | null = null
  ) {
    const updates: any = { status };
    if (errorMessage !== null) updates.error_message = errorMessage;
    if (startedAt !== null) updates.started_at = startedAt;
    if (completedAt !== null) updates.completed_at = completedAt;

    const { error } = await supabase
      .from('processing_queue')
      .update(updates)
      .eq('id', taskId);

    if (error) throw error;
  }

  private async processParticipantAnalysis(task: ProcessingTask): Promise<any> {
    const { webinar_id, participant_id } = task.task_data;

    const { data: participant, error: participantError } = await supabase
      .from('zoom_participants')
      .select('*')
      .eq('id', participant_id)
      .single();

    if (participantError) throw participantError;

    const engagementScore = this.analyticsProcessor.calculateEngagementScore(participant);
    
    await this.analyticsProcessor.updateAnalyticsCache(`participant_engagement:${webinar_id}`, {
      participant_id,
      engagement_score: engagementScore,
      updated_at: new Date().toISOString(),
    });

    return { participant_id, engagement_score: engagementScore };
  }

  private async processPollAnalysis(task: ProcessingTask): Promise<any> {
    const { webinar_id } = task.task_data;

    const { data: polls, error: pollsError } = await supabase
      .from('zoom_polls')
      .select(`
        *,
        zoom_poll_responses(*)
      `)
      .eq('webinar_id', webinar_id);

    if (pollsError) throw pollsError;

    const analysis = this.analyticsProcessor.analyzePollResponses(polls);
    
    await this.analyticsProcessor.updateAnalyticsCache(`poll_analysis:${webinar_id}`, analysis);

    return analysis;
  }

  private async processQnaAnalysis(task: ProcessingTask): Promise<any> {
    const { webinar_id } = task.task_data;

    const { data: qna, error: qnaError } = await supabase
      .from('zoom_qna')
      .select('*')
      .eq('webinar_id', webinar_id);

    if (qnaError) throw qnaError;

    const analysis = this.analyticsProcessor.analyzeQnaInteractions(qna);
    
    await this.analyticsProcessor.updateAnalyticsCache(`qna_analysis:${webinar_id}`, analysis);

    return analysis;
  }

  private async processEngagementAnalysis(task: ProcessingTask): Promise<any> {
    const { webinar_id } = task.task_data;

    const [participantsRes, pollsRes, qnaRes] = await Promise.all([
      supabase.from('zoom_participants').select('*').eq('webinar_id', webinar_id),
      supabase.from('zoom_polls').select('*, zoom_poll_responses(*)').eq('webinar_id', webinar_id),
      supabase.from('zoom_qna').select('*').eq('webinar_id', webinar_id),
    ]);

    if (participantsRes.error) throw participantsRes.error;
    if (pollsRes.error) throw pollsRes.error;
    if (qnaRes.error) throw qnaRes.error;

    const analysis = this.analyticsProcessor.calculateComprehensiveEngagement(
      participantsRes.data,
      pollsRes.data,
      qnaRes.data
    );

    await this.analyticsProcessor.updateAnalyticsCache(`engagement_analysis:${webinar_id}`, analysis);

    return analysis;
  }

  private async processAIInsightGeneration(task: ProcessingTask): Promise<any> {
    const { webinar_id, insight_type } = task.task_data;

    const insight = {
      webinar_id,
      insight_type,
      generated_at: new Date().toISOString(),
      status: 'generated',
    };

    return insight;
  }
}
