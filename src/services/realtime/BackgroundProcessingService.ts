
import { supabase } from '@/integrations/supabase/client';

export interface ProcessingTask {
  id: string;
  task_type: string;
  task_data: any;
  priority: number;
  status: string;
  retry_count: number;
  max_retries: number;
  webinar_id?: string;
  user_id?: string;
}

export class BackgroundProcessingService {
  private static instance: BackgroundProcessingService;
  private isProcessing = false;
  private processingInterval: NodeJS.Timeout | null = null;

  static getInstance(): BackgroundProcessingService {
    if (!BackgroundProcessingService.instance) {
      BackgroundProcessingService.instance = new BackgroundProcessingService();
    }
    return BackgroundProcessingService.instance;
  }

  private constructor() {
    this.startProcessing();
  }

  private startProcessing() {
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
    }

    this.processingInterval = setInterval(() => {
      this.processNextTask();
    }, 5000); // Check every 5 seconds
  }

  private async processNextTask() {
    if (this.isProcessing) return;

    try {
      this.isProcessing = true;

      // Get next pending task with highest priority
      const { data: tasks, error } = await supabase
        .from('processing_queue')
        .select('*')
        .eq('status', 'pending')
        .lte('scheduled_at', new Date().toISOString())
        .order('priority', { ascending: true })
        .order('created_at', { ascending: true })
        .limit(1);

      if (error) throw error;
      if (!tasks || tasks.length === 0) return;

      const task = tasks[0] as ProcessingTask;
      await this.executeTask(task);

    } catch (error) {
      console.error('Error processing task:', error);
    } finally {
      this.isProcessing = false;
    }
  }

  private async executeTask(task: ProcessingTask) {
    try {
      // Mark task as processing
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

      // Mark task as completed
      await this.updateTaskStatus(task.id, 'completed', null, null, new Date().toISOString());

      // Broadcast completion event
      await this.broadcastEvent('task_completed', {
        task_id: task.id,
        task_type: task.task_type,
        result,
      }, task.user_id ? [task.user_id] : null);

    } catch (error) {
      console.error(`Task ${task.id} failed:`, error);
      
      // Check if we should retry
      if (task.retry_count < task.max_retries) {
        const retryDelay = Math.pow(2, task.retry_count) * 1000; // Exponential backoff
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
        // Mark as failed
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

    // Get participant data
    const { data: participant, error: participantError } = await supabase
      .from('zoom_participants')
      .select('*')
      .eq('id', participant_id)
      .single();

    if (participantError) throw participantError;

    // Calculate engagement metrics
    const engagementScore = this.calculateEngagementScore(participant);
    
    // Update cache with new engagement data
    await this.updateAnalyticsCache(`participant_engagement:${webinar_id}`, {
      participant_id,
      engagement_score: engagementScore,
      updated_at: new Date().toISOString(),
    });

    return { participant_id, engagement_score: engagementScore };
  }

  private async processPollAnalysis(task: ProcessingTask): Promise<any> {
    const { webinar_id } = task.task_data;

    // Get poll data
    const { data: polls, error: pollsError } = await supabase
      .from('zoom_polls')
      .select(`
        *,
        zoom_poll_responses(*)
      `)
      .eq('webinar_id', webinar_id);

    if (pollsError) throw pollsError;

    // Analyze poll responses
    const analysis = this.analyzePollResponses(polls);
    
    // Update cache
    await this.updateAnalyticsCache(`poll_analysis:${webinar_id}`, analysis);

    return analysis;
  }

  private async processQnaAnalysis(task: ProcessingTask): Promise<any> {
    const { webinar_id } = task.task_data;

    // Get Q&A data
    const { data: qna, error: qnaError } = await supabase
      .from('zoom_qna')
      .select('*')
      .eq('webinar_id', webinar_id);

    if (qnaError) throw qnaError;

    // Analyze Q&A interactions
    const analysis = this.analyzeQnaInteractions(qna);
    
    // Update cache
    await this.updateAnalyticsCache(`qna_analysis:${webinar_id}`, analysis);

    return analysis;
  }

  private async processEngagementAnalysis(task: ProcessingTask): Promise<any> {
    const { webinar_id } = task.task_data;

    // Get all engagement data
    const [participantsRes, pollsRes, qnaRes] = await Promise.all([
      supabase.from('zoom_participants').select('*').eq('webinar_id', webinar_id),
      supabase.from('zoom_polls').select('*, zoom_poll_responses(*)').eq('webinar_id', webinar_id),
      supabase.from('zoom_qna').select('*').eq('webinar_id', webinar_id),
    ]);

    if (participantsRes.error) throw participantsRes.error;
    if (pollsRes.error) throw pollsRes.error;
    if (qnaRes.error) throw qnaRes.error;

    // Calculate comprehensive engagement metrics
    const analysis = this.calculateComprehensiveEngagement(
      participantsRes.data,
      pollsRes.data,
      qnaRes.data
    );

    // Update cache
    await this.updateAnalyticsCache(`engagement_analysis:${webinar_id}`, analysis);

    return analysis;
  }

  private async processAIInsightGeneration(task: ProcessingTask): Promise<any> {
    const { webinar_id, insight_type } = task.task_data;

    // This would integrate with the existing AI insights service
    // For now, return a placeholder
    const insight = {
      webinar_id,
      insight_type,
      generated_at: new Date().toISOString(),
      status: 'generated',
    };

    return insight;
  }

  private calculateEngagementScore(participant: any): number {
    let score = 0;
    
    // Duration score (0-40 points)
    if (participant.duration) {
      score += Math.min(40, (participant.duration / 60) * 10); // 10 points per minute, max 40
    }

    // Interaction score (0-60 points)
    if (participant.posted_chat) score += 15;
    if (participant.answered_polling) score += 20;
    if (participant.asked_question) score += 20;
    if (participant.raised_hand) score += 5;

    return Math.min(100, score);
  }

  private analyzePollResponses(polls: any[]): any {
    return {
      total_polls: polls.length,
      total_responses: polls.reduce((sum, poll) => sum + (poll.zoom_poll_responses?.length || 0), 0),
      response_rate: polls.length > 0 ? 
        polls.reduce((sum, poll) => sum + (poll.zoom_poll_responses?.length || 0), 0) / polls.length : 0,
      analyzed_at: new Date().toISOString(),
    };
  }

  private analyzeQnaInteractions(qna: any[]): any {
    return {
      total_questions: qna.length,
      answered_questions: qna.filter(q => q.answer).length,
      anonymous_questions: qna.filter(q => q.anonymous).length,
      avg_upvotes: qna.length > 0 ? qna.reduce((sum, q) => sum + (q.upvote_count || 0), 0) / qna.length : 0,
      analyzed_at: new Date().toISOString(),
    };
  }

  private calculateComprehensiveEngagement(participants: any[], polls: any[], qna: any[]): any {
    const totalParticipants = participants.length;
    const engagementScores = participants.map(p => this.calculateEngagementScore(p));
    
    return {
      total_participants: totalParticipants,
      avg_engagement_score: totalParticipants > 0 ? 
        engagementScores.reduce((sum, score) => sum + score, 0) / totalParticipants : 0,
      high_engagement_count: engagementScores.filter(score => score >= 70).length,
      medium_engagement_count: engagementScores.filter(score => score >= 40 && score < 70).length,
      low_engagement_count: engagementScores.filter(score => score < 40).length,
      poll_participation_rate: polls.length > 0 ? 
        polls.reduce((sum, poll) => sum + (poll.zoom_poll_responses?.length || 0), 0) / totalParticipants : 0,
      qna_participation_rate: totalParticipants > 0 ? qna.length / totalParticipants : 0,
      analyzed_at: new Date().toISOString(),
    };
  }

  private async updateAnalyticsCache(cacheKey: string, data: any): Promise<void> {
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1); // Cache for 1 hour

    const { error } = await supabase
      .from('analytics_cache')
      .upsert({
        cache_key: cacheKey,
        cache_data: data,
        expires_at: expiresAt.toISOString(),
        dependencies: [cacheKey.split(':')[0]], // Use the prefix as dependency
      });

    if (error) {
      console.error('Failed to update analytics cache:', error);
    }
  }

  private async broadcastEvent(
    eventType: string,
    eventData: any,
    targetUsers: string[] | null = null
  ): Promise<void> {
    const { error } = await supabase.rpc('broadcast_event', {
      p_event_type: eventType,
      p_event_data: eventData,
      p_target_users: targetUsers,
    });

    if (error) {
      console.error('Failed to broadcast event:', error);
    }
  }

  public stopProcessing() {
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = null;
    }
  }
}

// Initialize the background processing service
export const backgroundProcessor = BackgroundProcessingService.getInstance();
