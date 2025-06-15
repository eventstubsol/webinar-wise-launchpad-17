
import { supabase } from '@/integrations/supabase/client';

interface SyncProgressUpdate {
  sync_id: string;
  total_webinars: number;
  completed_webinars: number;
  current_webinar_name?: string;
  current_webinar_index: number;
  current_stage?: string;
  estimated_completion?: string;
}

export class RealTimeSyncProgressService {
  /**
   * Create or update sync progress record
   */
  static async updateSyncProgress(update: SyncProgressUpdate): Promise<void> {
    try {
      const { error } = await supabase
        .from('sync_progress')
        .upsert({
          sync_id: update.sync_id,
          total_webinars: update.total_webinars,
          completed_webinars: update.completed_webinars,
          current_webinar_name: update.current_webinar_name || null,
          current_webinar_index: update.current_webinar_index,
          current_stage: update.current_stage || null,
          estimated_completion: update.estimated_completion || null,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'sync_id'
        });

      if (error) {
        console.error('Failed to update sync progress:', error);
      }
    } catch (err) {
      console.error('Error updating sync progress:', err);
    }
  }

  /**
   * Initialize sync progress when sync starts
   */
  static async initializeSyncProgress(
    syncId: string, 
    totalWebinars: number
  ): Promise<void> {
    const estimatedCompletion = this.calculateEstimatedCompletion(totalWebinars);
    
    await this.updateSyncProgress({
      sync_id: syncId,
      total_webinars: totalWebinars,
      completed_webinars: 0,
      current_webinar_index: 0,
      current_stage: 'Initializing sync...',
      estimated_completion: estimatedCompletion
    });
  }

  /**
   * Update progress for current webinar
   */
  static async updateWebinarProgress(
    syncId: string,
    webinarIndex: number,
    webinarName: string,
    stage: string,
    totalWebinars: number
  ): Promise<void> {
    const remainingWebinars = totalWebinars - webinarIndex;
    const estimatedCompletion = this.calculateEstimatedCompletion(remainingWebinars);

    await this.updateSyncProgress({
      sync_id: syncId,
      total_webinars: totalWebinars,
      completed_webinars: webinarIndex - 1, // Previous webinars completed
      current_webinar_name: webinarName,
      current_webinar_index: webinarIndex,
      current_stage: stage,
      estimated_completion: estimatedCompletion
    });
  }

  /**
   * Mark webinar as completed
   */
  static async completeWebinar(
    syncId: string,
    completedIndex: number,
    totalWebinars: number
  ): Promise<void> {
    const remainingWebinars = totalWebinars - completedIndex;
    const estimatedCompletion = remainingWebinars > 0 
      ? this.calculateEstimatedCompletion(remainingWebinars)
      : new Date().toISOString();

    await this.updateSyncProgress({
      sync_id: syncId,
      total_webinars: totalWebinars,
      completed_webinars: completedIndex,
      current_webinar_index: completedIndex + 1,
      current_stage: remainingWebinars > 0 ? 'Moving to next webinar...' : 'Finalizing sync...',
      estimated_completion: estimatedCompletion
    });
  }

  /**
   * Clean up progress when sync completes
   */
  static async completeSyncProgress(syncId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('sync_progress')
        .delete()
        .eq('sync_id', syncId);

      if (error) {
        console.error('Failed to clean up sync progress:', error);
      }
    } catch (err) {
      console.error('Error cleaning up sync progress:', err);
    }
  }

  /**
   * Calculate estimated completion time based on average webinar sync time
   */
  private static calculateEstimatedCompletion(remainingWebinars: number): string {
    // Estimate 2 minutes per webinar on average
    const avgMinutesPerWebinar = 2;
    const estimatedMinutes = remainingWebinars * avgMinutesPerWebinar;
    
    const now = new Date();
    const completion = new Date(now.getTime() + (estimatedMinutes * 60 * 1000));
    
    return completion.toISOString();
  }

  /**
   * Get historical average sync time for better estimates
   */
  static async getHistoricalAverageTime(): Promise<number> {
    try {
      const { data, error } = await supabase
        .from('zoom_sync_logs')
        .select('started_at, completed_at, total_items')
        .eq('sync_status', 'completed')
        .not('completed_at', 'is', null)
        .not('total_items', 'is', null)
        .gte('total_items', 1)
        .order('completed_at', { ascending: false })
        .limit(10);

      if (error || !data || data.length === 0) {
        return 2; // Default 2 minutes per webinar
      }

      let totalMinutesPerWebinar = 0;
      let validSamples = 0;

      for (const log of data) {
        const started = new Date(log.started_at);
        const completed = new Date(log.completed_at!);
        const durationMinutes = (completed.getTime() - started.getTime()) / (1000 * 60);
        const minutesPerWebinar = durationMinutes / log.total_items!;

        if (minutesPerWebinar > 0 && minutesPerWebinar < 10) { // Reasonable bounds
          totalMinutesPerWebinar += minutesPerWebinar;
          validSamples++;
        }
      }

      return validSamples > 0 ? totalMinutesPerWebinar / validSamples : 2;
    } catch (err) {
      console.error('Error calculating historical average:', err);
      return 2;
    }
  }
}
