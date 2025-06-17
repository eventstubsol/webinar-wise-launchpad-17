
import { updateSyncLog } from './database-operations.ts';

export interface RetryableWebinar {
  webinarId: string;
  dbId: string;
  topic: string;
  errorMessage: string;
  errorType: 'rate_limit' | 'network' | 'api_error' | 'timeout';
  retryAttempt: number;
  nextRetryAt: string;
}

export interface RetryScheduleEntry {
  webinarId: string;
  dbId: string;
  topic: string;
  retryAttempt: number;
  scheduledFor: string;
  errorType: string;
  originalError: string;
}

export class ParticipantRetryService {
  private static readonly BASE_DELAY_MS = 1000; // 1 second
  private static readonly MAX_DELAY_MS = 8000; // 8 seconds max
  private static readonly BACKOFF_MULTIPLIER = 2;

  /**
   * Calculate exponential backoff delay
   */
  static calculateBackoffDelay(retryAttempt: number): number {
    const delay = this.BASE_DELAY_MS * Math.pow(this.BACKOFF_MULTIPLIER, retryAttempt);
    return Math.min(delay, this.MAX_DELAY_MS);
  }

  /**
   * Check if a webinar is eligible for participant retry
   */
  static isEligibleForRetry(webinar: any, errorMessage: string, retryAttempt: number, maxRetries: number): boolean {
    // Check retry limit
    if (retryAttempt >= maxRetries) {
      console.log(`Webinar ${webinar.webinar_id} exceeded max retries (${maxRetries})`);
      return false;
    }

    // Check if webinar has ended
    if (!webinar.start_time) {
      console.log(`Webinar ${webinar.webinar_id} has no start time, not eligible for retry`);
      return false;
    }

    const startTime = new Date(webinar.start_time);
    const now = new Date();
    const webinarDuration = webinar.duration || 60;
    const endTime = new Date(startTime.getTime() + (webinarDuration * 60 * 1000));

    if (endTime > now) {
      console.log(`Webinar ${webinar.webinar_id} has not ended yet, not eligible for retry`);
      return false;
    }

    // Check if error is retryable
    const errorType = this.classifyError(errorMessage);
    if (!this.isRetryableError(errorType)) {
      console.log(`Webinar ${webinar.webinar_id} has non-retryable error: ${errorType}`);
      return false;
    }

    return true;
  }

  /**
   * Classify error types for retry decisions
   */
  static classifyError(errorMessage: string): string {
    const message = errorMessage.toLowerCase();

    if (message.includes('rate limit') || message.includes('429')) {
      return 'rate_limit';
    }
    if (message.includes('timeout') || message.includes('timed out')) {
      return 'timeout';
    }
    if (message.includes('network') || message.includes('connection') || 
        message.includes('503') || message.includes('502') || message.includes('500')) {
      return 'network';
    }
    if (message.includes('unauthorized') || message.includes('401') || 
        message.includes('forbidden') || message.includes('403')) {
      return 'auth_error';
    }
    if (message.includes('not found') || message.includes('404')) {
      return 'not_found';
    }
    if (message.includes('no participants') || message.includes('empty response')) {
      return 'no_participants';
    }

    return 'api_error';
  }

  /**
   * Check if error type is retryable
   */
  static isRetryableError(errorType: string): boolean {
    const retryableErrors = ['rate_limit', 'timeout', 'network', 'api_error'];
    return retryableErrors.includes(errorType);
  }

  /**
   * Schedule retries for failed participant fetches
   */
  static async scheduleRetries(
    supabase: any,
    syncLogId: string,
    failedWebinars: RetryableWebinar[],
    maxRetries: number
  ): Promise<RetryScheduleEntry[]> {
    const now = new Date();
    const retrySchedule: RetryScheduleEntry[] = [];

    for (const webinar of failedWebinars) {
      if (!this.isEligibleForRetry(webinar, webinar.errorMessage, webinar.retryAttempt, maxRetries)) {
        continue;
      }

      const delay = this.calculateBackoffDelay(webinar.retryAttempt);
      const scheduledFor = new Date(now.getTime() + delay).toISOString();

      const scheduleEntry: RetryScheduleEntry = {
        webinarId: webinar.webinarId,
        dbId: webinar.dbId,
        topic: webinar.topic,
        retryAttempt: webinar.retryAttempt + 1,
        scheduledFor,
        errorType: webinar.errorType,
        originalError: webinar.errorMessage
      };

      retrySchedule.push(scheduleEntry);
    }

    if (retrySchedule.length > 0) {
      // Update sync log with retry schedule
      await updateSyncLog(supabase, syncLogId, {
        retry_schedule: retrySchedule,
        retry_attempts: 0 // Reset for new retry cycle
      });

      console.log(`Scheduled ${retrySchedule.length} webinars for participant retry`);
      retrySchedule.forEach(entry => {
        console.log(`  - ${entry.topic} (${entry.webinarId}): Attempt ${entry.retryAttempt} at ${entry.scheduledFor}`);
      });
    }

    return retrySchedule;
  }

  /**
   * Execute participant retries for webinars in the retry queue
   */
  static async executeRetries(
    supabase: any,
    syncLogId: string,
    retrySchedule: RetryScheduleEntry[],
    zoomApiClient: any,
    connectionId: string
  ): Promise<{successful: number, failed: number, deferred: number}> {
    const now = new Date();
    let successful = 0;
    let failed = 0;
    let deferred = 0;
    const remainingRetries: RetryScheduleEntry[] = [];

    console.log(`Executing participant retries for ${retrySchedule.length} webinars`);

    for (const entry of retrySchedule) {
      const scheduledTime = new Date(entry.scheduledFor);
      
      // Check if it's time to retry
      if (scheduledTime > now) {
        console.log(`Deferring retry for ${entry.topic} until ${entry.scheduledFor}`);
        remainingRetries.push(entry);
        deferred++;
        continue;
      }

      console.log(`Retrying participant fetch for ${entry.topic} (attempt ${entry.retryAttempt})`);

      try {
        // Attempt to fetch participants
        const participants = await this.retryParticipantFetch(zoomApiClient, entry.webinarId);
        
        if (participants && participants.length > 0) {
          // Success - save participants to database
          await this.saveParticipantsToDatabase(supabase, entry.dbId, participants);
          
          // Update webinar participant sync status
          await supabase
            .from('zoom_webinars')
            .update({
              participant_sync_status: 'synced',
              participant_sync_attempted_at: new Date().toISOString(),
              participant_sync_error: null,
              attendees_count: participants.length,
              updated_at: new Date().toISOString()
            })
            .eq('id', entry.dbId);

          console.log(`✓ Successfully retried participants for ${entry.topic}: ${participants.length} participants`);
          successful++;
        } else {
          // No participants found - mark as no_participants
          await supabase
            .from('zoom_webinars')
            .update({
              participant_sync_status: 'no_participants',
              participant_sync_attempted_at: new Date().toISOString(),
              participant_sync_error: null,
              attendees_count: 0,
              updated_at: new Date().toISOString()
            })
            .eq('id', entry.dbId);

          console.log(`✓ Retry confirmed no participants for ${entry.topic}`);
          successful++;
        }

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.log(`✗ Retry failed for ${entry.topic}: ${errorMessage}`);
        
        // Check if we should retry again
        const currentRetryAttempts = await this.getCurrentRetryAttempts(supabase, syncLogId);
        const maxRetries = await this.getMaxRetries(supabase, syncLogId);
        
        if (entry.retryAttempt < maxRetries) {
          // Schedule another retry
          const delay = this.calculateBackoffDelay(entry.retryAttempt);
          const nextRetryTime = new Date(now.getTime() + delay).toISOString();
          
          remainingRetries.push({
            ...entry,
            retryAttempt: entry.retryAttempt + 1,
            scheduledFor: nextRetryTime,
            originalError: errorMessage
          });
          
          console.log(`  Scheduling retry ${entry.retryAttempt + 1} for ${nextRetryTime}`);
          deferred++;
        } else {
          // Max retries exceeded - mark as failed
          await supabase
            .from('zoom_webinars')
            .update({
              participant_sync_status: 'failed',
              participant_sync_attempted_at: new Date().toISOString(),
              participant_sync_error: `Max retries exceeded: ${errorMessage}`,
              updated_at: new Date().toISOString()
            })
            .eq('id', entry.dbId);

          console.log(`✗ Max retries exceeded for ${entry.topic}`);
          failed++;
        }
      }
    }

    // Update retry schedule with remaining entries
    const newRetryAttempts = await this.getCurrentRetryAttempts(supabase, syncLogId) + 1;
    await updateSyncLog(supabase, syncLogId, {
      retry_schedule: remainingRetries,
      retry_attempts: newRetryAttempts
    });

    console.log(`Retry execution complete: ${successful} successful, ${failed} failed, ${deferred} deferred`);
    return { successful, failed, deferred };
  }

  /**
   * Retry participant fetch with better error handling
   */
  private static async retryParticipantFetch(zoomApiClient: any, webinarId: string): Promise<any[]> {
    try {
      const response = await zoomApiClient.makeRequest(`/report/webinars/${webinarId}/participants?page_size=300`);
      return response.participants || [];
    } catch (error) {
      // Re-throw with classified error type
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const classifiedError = new Error(errorMessage);
      (classifiedError as any).retryable = this.isRetryableError(this.classifyError(errorMessage));
      throw classifiedError;
    }
  }

  /**
   * Save participants to database
   */
  private static async saveParticipantsToDatabase(supabase: any, webinarDbId: string, participants: any[]): Promise<void> {
    // This is a simplified version - in production you'd want proper participant deduplication
    const participantInserts = participants.map(p => ({
      webinar_id: webinarDbId,
      zoom_user_id: p.user_id || p.id,
      name: p.name || `${p.first_name || ''} ${p.last_name || ''}`.trim(),
      email: p.email,
      join_time: p.join_time,
      leave_time: p.leave_time,
      duration: p.duration,
      participant_data: p,
      created_at: new Date().toISOString()
    }));

    if (participantInserts.length > 0) {
      const { error } = await supabase
        .from('zoom_participants')
        .upsert(participantInserts, { 
          onConflict: 'webinar_id,zoom_user_id',
          ignoreDuplicates: false 
        });

      if (error) {
        console.error('Error saving participants:', error);
        throw new Error(`Failed to save participants: ${error.message}`);
      }
    }
  }

  /**
   * Get current retry attempts from sync log
   */
  private static async getCurrentRetryAttempts(supabase: any, syncLogId: string): Promise<number> {
    const { data, error } = await supabase
      .from('zoom_sync_logs')
      .select('retry_attempts')
      .eq('id', syncLogId)
      .single();

    if (error || !data) return 0;
    return data.retry_attempts || 0;
  }

  /**
   * Get max retries from sync log
   */
  private static async getMaxRetries(supabase: any, syncLogId: string): Promise<number> {
    const { data, error } = await supabase
      .from('zoom_sync_logs')
      .select('max_participant_retries')
      .eq('id', syncLogId)
      .single();

    if (error || !data) return 3;
    return data.max_participant_retries || 3;
  }
}
