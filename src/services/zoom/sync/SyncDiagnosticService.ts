
import { supabase } from '@/integrations/supabase/client';

/**
 * Service for diagnosing and recovering from stuck syncs
 */
export class SyncDiagnosticService {
  private static readonly PROGRESS_STALL_TIMEOUT = 2 * 60 * 1000; // 2 minutes
  private static readonly HEARTBEAT_TIMEOUT = 3 * 60 * 1000; // 3 minutes

  /**
   * Check if a sync is a "phantom sync" - running on Render but no progress in database
   */
  static async detectPhantomSync(syncId: string, renderProgress: any, dbProgress: any): Promise<boolean> {
    const hasRenderProgress = renderProgress?.progress > 0 || renderProgress?.status === 'running';
    const hasDbProgress = dbProgress?.stage_progress_percentage > 5 || dbProgress?.sync_status !== 'started';
    
    const isPhantom = hasRenderProgress && !hasDbProgress;
    
    if (isPhantom) {
      console.warn(`🔍 Phantom sync detected: ${syncId}`, {
        renderProgress: renderProgress?.progress || 0,
        renderStatus: renderProgress?.status,
        dbProgress: dbProgress?.stage_progress_percentage || 0,
        dbStatus: dbProgress?.sync_status
      });
    }
    
    return isPhantom;
  }

  /**
   * Check if sync progress has stalled
   */
  static async detectStalledProgress(connectionId: string): Promise<{ isStalled: boolean; syncId?: string; reason?: string }> {
    try {
      const { data: currentSync, error } = await supabase
        .from('zoom_sync_logs')
        .select('id, sync_status, stage_progress_percentage, updated_at, started_at')
        .eq('connection_id', connectionId)
        .in('sync_status', ['started', 'running'])
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error || !currentSync) {
        return { isStalled: false };
      }

      const now = new Date();
      const lastUpdate = new Date(currentSync.updated_at);
      const timeSinceUpdate = now.getTime() - lastUpdate.getTime();
      const startTime = new Date(currentSync.started_at);
      const totalRuntime = now.getTime() - startTime.getTime();

      // Check for progress stalls
      if (timeSinceUpdate > this.PROGRESS_STALL_TIMEOUT && currentSync.stage_progress_percentage <= 10) {
        return {
          isStalled: true,
          syncId: currentSync.id,
          reason: `No progress for ${Math.round(timeSinceUpdate / 60000)} minutes`
        };
      }

      // Check for heartbeat timeout
      if (totalRuntime > this.HEARTBEAT_TIMEOUT && currentSync.stage_progress_percentage < 50) {
        return {
          isStalled: true,
          syncId: currentSync.id,
          reason: `Sync running for ${Math.round(totalRuntime / 60000)} minutes with minimal progress`
        };
      }

      return { isStalled: false };
    } catch (error) {
      console.error('Error detecting stalled progress:', error);
      return { isStalled: false };
    }
  }

  /**
   * Force recovery of a phantom or stalled sync
   */
  static async forceRecovery(syncId: string, reason: string): Promise<{ success: boolean; message: string }> {
    try {
      console.log(`🔧 Force recovering sync ${syncId}: ${reason}`);

      // Cancel the sync in database
      const { error } = await supabase
        .from('zoom_sync_logs')
        .update({
          sync_status: 'cancelled',
          error_message: `Auto-cancelled: ${reason}`,
          completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', syncId);

      if (error) {
        return { success: false, message: `Failed to cancel sync: ${error.message}` };
      }

      return { success: true, message: `Sync auto-cancelled due to: ${reason}` };
    } catch (error) {
      return { 
        success: false, 
        message: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Validate sync progress consistency between Render and database
   */
  static validateProgressConsistency(renderProgress: any, dbProgress: any): {
    isConsistent: boolean;
    issue?: string;
    severity: 'low' | 'medium' | 'high';
  } {
    if (!renderProgress || !dbProgress) {
      return { isConsistent: false, issue: 'Missing progress data', severity: 'high' };
    }

    const renderProg = renderProgress.progress || 0;
    const dbProg = dbProgress.stage_progress_percentage || 0;
    const progressDiff = Math.abs(renderProg - dbProg);

    if (progressDiff > 30) {
      return {
        isConsistent: false,
        issue: `Large progress mismatch: Render ${renderProg}% vs DB ${dbProg}%`,
        severity: 'high'
      };
    }

    if (progressDiff > 10) {
      return {
        isConsistent: false,
        issue: `Progress mismatch: Render ${renderProg}% vs DB ${dbProg}%`,
        severity: 'medium'
      };
    }

    return { isConsistent: true, severity: 'low' };
  }
}
