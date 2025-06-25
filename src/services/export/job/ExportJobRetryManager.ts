
import { supabase } from '@/integrations/supabase/client';
import { ExportJobManager } from './ExportJobManager';

interface RetryPolicy {
  maxRetries: number;
  backoffMultiplier: number;
  baseDelaySeconds: number;
}

interface FailedJob {
  id: string;
  user_id: string;
  export_type: string;
  export_config: any;
  status: string;
  retry_count: number;
  max_retries: number;
  error_message?: string;
  created_at: string;
  updated_at: string;
}

export class ExportJobRetryManager {
  private static readonly DEFAULT_RETRY_POLICY: RetryPolicy = {
    maxRetries: 3,
    backoffMultiplier: 2,
    baseDelaySeconds: 30,
  };

  static async processRetries(): Promise<void> {
    console.log('Processing export job retries...');
    
    const failedJobs = await this.getRetryableJobs();
    
    for (const job of failedJobs) {
      try {
        await this.retryJob(job);
      } catch (error) {
        console.error(`Failed to retry job ${job.id}:`, error);
      }
    }
  }

  static async retryJob(job: FailedJob): Promise<void> {
    const retryPolicy = this.getRetryPolicy(job);
    
    if (job.retry_count >= retryPolicy.maxRetries) {
      await this.moveToDeadLetterQueue(job);
      return;
    }

    const delayMs = this.calculateBackoffDelay(job.retry_count, retryPolicy);
    
    console.log(`Retrying job ${job.id} after ${delayMs}ms delay (attempt ${job.retry_count + 1})`);
    
    // Wait for backoff delay
    await this.delay(delayMs);
    
    // Reset job to pending status with incremented retry count
    await ExportJobManager.retryFailedJob(job.id);
  }

  static async getRetryableJobs(): Promise<FailedJob[]> {
    const { data, error } = await supabase
      .from('export_queue')
      .select('*')
      .eq('status', 'failed')
      .lt('retry_count', 'max_retries')
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching retryable jobs:', error);
      return [];
    }

    // Filter jobs that haven't been retried recently
    const now = Date.now();
    const retryableJobs = (data || []).filter(job => {
      const lastUpdated = new Date(job.updated_at).getTime();
      const retryPolicy = this.getRetryPolicy(job);
      const minDelayMs = this.calculateBackoffDelay(job.retry_count, retryPolicy);
      
      return (now - lastUpdated) >= minDelayMs;
    });

    return retryableJobs as FailedJob[];
  }

  private static getRetryPolicy(job: FailedJob): RetryPolicy {
    // Extract retry policy from job config or use default
    const configPolicy = job.export_config?.retry_policy;
    
    return {
      maxRetries: configPolicy?.maxRetries || this.DEFAULT_RETRY_POLICY.maxRetries,
      backoffMultiplier: configPolicy?.backoffMultiplier || this.DEFAULT_RETRY_POLICY.backoffMultiplier,
      baseDelaySeconds: configPolicy?.baseDelaySeconds || this.DEFAULT_RETRY_POLICY.baseDelaySeconds,
    };
  }

  private static calculateBackoffDelay(retryCount: number, policy: RetryPolicy): number {
    const delaySeconds = policy.baseDelaySeconds * Math.pow(policy.backoffMultiplier, retryCount);
    return Math.min(delaySeconds * 1000, 5 * 60 * 1000); // Cap at 5 minutes
  }

  private static async moveToDeadLetterQueue(job: FailedJob): Promise<void> {
    console.warn('ExportJobRetryManager: export_dead_letter_queue table not implemented yet');
    
    // For now, just mark as permanently failed
    await supabase
      .from('export_queue')
      .update({
        status: 'permanently_failed',
        updated_at: new Date().toISOString()
      })
      .eq('id', job.id);

    console.log(`Job ${job.id} moved to dead letter queue after ${job.retry_count} retries`);
  }

  private static delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  static async getRetryStats(): Promise<any> {
    const { data, error } = await supabase
      .from('export_queue')
      .select('status, retry_count, max_retries')
      .neq('retry_count', 0);

    if (error) {
      console.error('Error fetching retry stats:', error);
      return {
        totalRetries: 0,
        jobsWithRetries: 0,
        averageRetries: 0,
        maxRetriesReached: 0,
      };
    }

    if (!data || data.length === 0) {
      return {
        totalRetries: 0,
        jobsWithRetries: 0,
        averageRetries: 0,
        maxRetriesReached: 0,
      };
    }

    const totalRetries = data.reduce((sum, job) => sum + job.retry_count, 0);
    const maxRetriesReached = data.filter(job => job.retry_count >= job.max_retries).length;

    return {
      totalRetries,
      jobsWithRetries: data.length,
      averageRetries: data.length > 0 ? totalRetries / data.length : 0,
      maxRetriesReached,
    };
  }
}
