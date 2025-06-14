
import { supabase } from '@/integrations/supabase/client';

export interface RetryPolicy {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
  jitterMax: number;
  retryHistory?: RetryAttempt[];
}

export interface RetryAttempt {
  attempt: number;
  error: string;
  timestamp: string;
  nextRetryAt?: string;
}

export class ExportJobRetryManager {
  private static readonly DEFAULT_RETRY_POLICY: RetryPolicy = {
    maxRetries: 3,
    baseDelay: 1000,
    maxDelay: 300000, // 5 minutes
    backoffMultiplier: 2,
    jitterMax: 1000
  };

  static async scheduleRetry(jobId: string, error: string, customPolicy?: Partial<RetryPolicy>): Promise<boolean> {
    const policy = { ...this.DEFAULT_RETRY_POLICY, ...customPolicy };
    
    // Get current job details
    const { data: job, error: fetchError } = await supabase
      .from('export_queue')
      .select('*')
      .eq('id', jobId)
      .single();

    if (fetchError || !job) {
      console.error('Failed to fetch job for retry:', fetchError);
      return false;
    }

    const currentRetries = job.retry_count || 0;
    
    // Check if we've exceeded max retries
    if (currentRetries >= policy.maxRetries) {
      await this.moveToDeadLetterQueue(job, error, policy);
      return false;
    }

    // Calculate next retry time with exponential backoff and jitter
    const delay = this.calculateDelay(currentRetries, policy);
    const nextRetryAt = new Date(Date.now() + delay);

    // Update retry history - safely handle the Json type
    let existingPolicy: RetryPolicy | null = null;
    try {
      if (job.retry_policy && typeof job.retry_policy === 'object' && !Array.isArray(job.retry_policy)) {
        existingPolicy = job.retry_policy as unknown as RetryPolicy;
      }
    } catch (e) {
      console.warn('Failed to parse existing retry policy:', e);
    }

    const retryHistory = existingPolicy?.retryHistory || [];
    const newAttempt: RetryAttempt = {
      attempt: currentRetries + 1,
      error,
      timestamp: new Date().toISOString(),
      nextRetryAt: nextRetryAt.toISOString()
    };

    const updatedPolicy: RetryPolicy = {
      ...policy,
      retryHistory: [...retryHistory, newAttempt]
    };

    // Convert to Json-compatible format
    const policyForDb = JSON.parse(JSON.stringify(updatedPolicy));

    // Update job with retry information
    const { error: updateError } = await supabase
      .from('export_queue')
      .update({
        status: 'pending',
        retry_count: currentRetries + 1,
        next_retry_at: nextRetryAt.toISOString(),
        retry_policy: policyForDb,
        error_message: error
      })
      .eq('id', jobId);

    if (updateError) {
      console.error('Failed to schedule retry:', updateError);
      return false;
    }

    return true;
  }

  static async retryJob(jobId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('export_queue')
        .update({
          status: 'pending',
          next_retry_at: null,
          error_message: null,
          started_at: null,
          completed_at: null,
          progress_percentage: 0
        })
        .eq('id', jobId);

      return !error;
    } catch (error) {
      console.error('Manual retry failed:', error);
      return false;
    }
  }

  private static calculateDelay(attempt: number, policy: RetryPolicy): number {
    const exponentialDelay = policy.baseDelay * Math.pow(policy.backoffMultiplier, attempt);
    const cappedDelay = Math.min(exponentialDelay, policy.maxDelay);
    const jitter = Math.random() * policy.jitterMax;
    return cappedDelay + jitter;
  }

  private static async moveToDeadLetterQueue(job: any, finalError: string, policy: RetryPolicy): Promise<void> {
    try {
      // Convert retry history to Json-compatible format
      const retryHistoryForDb = policy.retryHistory ? JSON.parse(JSON.stringify(policy.retryHistory)) : [];

      // Insert into dead letter queue
      await supabase
        .from('export_dead_letter_queue')
        .insert({
          original_job_id: job.id,
          user_id: job.user_id,
          export_type: job.export_type,
          export_config: job.export_config,
          failure_reason: finalError,
          retry_history: retryHistoryForDb
        });

      // Mark original job as permanently failed
      await supabase
        .from('export_queue')
        .update({
          status: 'dead_letter',
          error_message: `Moved to DLQ: ${finalError}`,
          completed_at: new Date().toISOString()
        })
        .eq('id', job.id);

    } catch (error) {
      console.error('Failed to move job to dead letter queue:', error);
    }
  }

  static async getDeadLetterJobs(userId: string) {
    const { data, error } = await supabase
      .from('export_dead_letter_queue')
      .select('*')
      .eq('user_id', userId)
      .order('moved_to_dlq_at', { ascending: false });

    return { data: data || [], error };
  }

  static async requeueFromDeadLetter(dlqId: string): Promise<boolean> {
    try {
      const { data: dlqJob, error: fetchError } = await supabase
        .from('export_dead_letter_queue')
        .select('*')
        .eq('id', dlqId)
        .single();

      if (fetchError || !dlqJob) return false;

      // Create new job in export queue
      const { error: insertError } = await supabase
        .from('export_queue')
        .insert({
          user_id: dlqJob.user_id,
          export_type: dlqJob.export_type,
          export_config: dlqJob.export_config,
          status: 'pending',
          retry_count: 0,
          max_retries: 3
        });

      if (insertError) return false;

      // Remove from dead letter queue
      await supabase
        .from('export_dead_letter_queue')
        .delete()
        .eq('id', dlqId);

      return true;
    } catch (error) {
      console.error('Failed to requeue from dead letter:', error);
      return false;
    }
  }
}
