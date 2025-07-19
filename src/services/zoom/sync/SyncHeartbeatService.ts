
import { supabase } from '@/integrations/supabase/client';
import { SyncDiagnosticService } from './SyncDiagnosticService';
import { RenderZoomService } from '@/services/zoom/RenderZoomService';

/**
 * Service for monitoring sync heartbeat and health
 */
export class SyncHeartbeatService {
  private static heartbeatIntervals: Map<string, NodeJS.Timeout> = new Map();

  /**
   * Start heartbeat monitoring for a sync
   */
  static startHeartbeat(syncId: string, connectionId: string): void {
    // Clear existing heartbeat if any
    this.stopHeartbeat(syncId);

    const interval = setInterval(async () => {
      await this.checkSyncHealth(syncId, connectionId);
    }, 30000); // Check every 30 seconds

    this.heartbeatIntervals.set(syncId, interval);
    console.log(`💓 Started heartbeat monitoring for sync: ${syncId}`);
  }

  /**
   * Stop heartbeat monitoring for a sync
   */
  static stopHeartbeat(syncId: string): void {
    const interval = this.heartbeatIntervals.get(syncId);
    if (interval) {
      clearInterval(interval);
      this.heartbeatIntervals.delete(syncId);
      console.log(`💓 Stopped heartbeat monitoring for sync: ${syncId}`);
    }
  }

  /**
   * Check sync health and trigger recovery if needed
   */
  private static async checkSyncHealth(syncId: string, connectionId: string): Promise<void> {
    try {
      // Get current sync status from database
      const { data: dbSync, error: dbError } = await supabase
        .from('zoom_sync_logs')
        .select('*')
        .eq('id', syncId)
        .maybeSingle();

      if (dbError || !dbSync) {
        console.warn(`💓 Heartbeat: Sync ${syncId} not found in database`);
        this.stopHeartbeat(syncId);
        return;
      }

      // If sync is completed or failed, stop heartbeat
      if (['completed', 'failed', 'cancelled'].includes(dbSync.sync_status)) {
        this.stopHeartbeat(syncId);
        return;
      }

      // Get progress from Render service
      let renderProgress = null;
      try {
        const renderResult = await RenderZoomService.getSyncProgress(syncId);
        renderProgress = renderResult.success ? renderResult : null;
      } catch (error) {
        console.warn(`💓 Heartbeat: Failed to get Render progress for ${syncId}`);
      }

      // Check for phantom sync
      const isPhantom = await SyncDiagnosticService.detectPhantomSync(syncId, renderProgress, dbSync);
      if (isPhantom) {
        console.warn(`💓 Heartbeat: Phantom sync detected, triggering recovery`);
        await SyncDiagnosticService.forceRecovery(syncId, 'Phantom sync detected');
        this.stopHeartbeat(syncId);
        return;
      }

      // Check for stalled progress
      const stalledCheck = await SyncDiagnosticService.detectStalledProgress(connectionId);
      if (stalledCheck.isStalled && stalledCheck.syncId === syncId) {
        console.warn(`💓 Heartbeat: Stalled sync detected, triggering recovery`);
        await SyncDiagnosticService.forceRecovery(syncId, stalledCheck.reason || 'Stalled progress');
        this.stopHeartbeat(syncId);
        return;
      }

      // Validate progress consistency
      if (renderProgress) {
        const validation = SyncDiagnosticService.validateProgressConsistency(renderProgress, dbSync);
        if (!validation.isConsistent && validation.severity === 'high') {
          console.warn(`💓 Heartbeat: Progress inconsistency detected: ${validation.issue}`);
          // Don't auto-cancel for inconsistency, but log it for monitoring
        }
      }

    } catch (error) {
      console.error(`💓 Heartbeat error for sync ${syncId}:`, error);
    }
  }

  /**
   * Stop all heartbeat monitoring (cleanup)
   */
  static stopAllHeartbeats(): void {
    this.heartbeatIntervals.forEach((interval, syncId) => {
      clearInterval(interval);
      console.log(`💓 Stopped heartbeat for sync: ${syncId}`);
    });
    this.heartbeatIntervals.clear();
  }
}
