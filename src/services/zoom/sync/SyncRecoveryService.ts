
import { supabase } from '@/integrations/supabase/client';
import { SyncStatus } from '@/types/zoom';

/**
 * Service to handle stuck sync recovery and cleanup
 */
export class SyncRecoveryService {
  private static readonly STUCK_SYNC_TIMEOUT_MINUTES = 15;

  /**
   * Cancel a specific stuck sync
   */
  static async cancelStuckSync(syncLogId: string): Promise<{ success: boolean; message: string }> {
    try {
      console.log(`Cancelling stuck sync: ${syncLogId}`);

      const { error } = await supabase
        .from('zoom_sync_logs')
        .update({
          sync_status: 'cancelled',
          status: 'cancelled',
          completed_at: new Date().toISOString(),
          error_message: 'Sync cancelled by user due to being stuck',
          updated_at: new Date().toISOString()
        })
        .eq('id', syncLogId);

      if (error) {
        console.error('Failed to cancel stuck sync:', error);
        return { success: false, message: `Failed to cancel sync: ${error.message}` };
      }

      return { success: true, message: 'Sync cancelled successfully' };
    } catch (error) {
      console.error('Error cancelling stuck sync:', error);
      return { 
        success: false, 
        message: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Detect and automatically recover stuck syncs
   */
  static async detectAndRecoverStuckSyncs(connectionId: string): Promise<number> {
    try {
      const stuckSyncCutoff = new Date();
      stuckSyncCutoff.setMinutes(stuckSyncCutoff.getMinutes() - this.STUCK_SYNC_TIMEOUT_MINUTES);

      // Find syncs that are stuck in initializing or running state for too long
      const { data: stuckSyncs, error } = await supabase
        .from('zoom_sync_logs')
        .select('id, sync_stage, started_at')
        .eq('connection_id', connectionId)
        .in('sync_status', ['started', 'running'])
        .lt('started_at', stuckSyncCutoff.toISOString());

      if (error) {
        console.error('Failed to detect stuck syncs:', error);
        return 0;
      }

      if (!stuckSyncs || stuckSyncs.length === 0) {
        return 0;
      }

      console.log(`Found ${stuckSyncs.length} stuck syncs to recover`);

      // Cancel all stuck syncs
      let recoveredCount = 0;
      for (const sync of stuckSyncs) {
        const result = await this.cancelStuckSync(sync.id);
        if (result.success) {
          recoveredCount++;
        }
      }

      return recoveredCount;
    } catch (error) {
      console.error('Error detecting stuck syncs:', error);
      return 0;
    }
  }

  /**
   * Reset all active syncs for a connection
   */
  static async resetAllActiveSyncs(connectionId: string): Promise<{ success: boolean; message: string; count: number }> {
    try {
      // Find all active syncs
      const { data: activeSyncs, error: fetchError } = await supabase
        .from('zoom_sync_logs')
        .select('id')
        .eq('connection_id', connectionId)
        .in('sync_status', ['started', 'running', 'pending']);

      if (fetchError) {
        return { success: false, message: fetchError.message, count: 0 };
      }

      const syncCount = activeSyncs?.length || 0;
      if (syncCount === 0) {
        return { success: true, message: 'No active syncs to reset', count: 0 };
      }

      // Cancel all active syncs
      const { error: updateError } = await supabase
        .from('zoom_sync_logs')
        .update({
          sync_status: 'cancelled',
          status: 'cancelled',
          completed_at: new Date().toISOString(),
          error_message: 'Sync reset by user',
          updated_at: new Date().toISOString()
        })
        .eq('connection_id', connectionId)
        .in('sync_status', ['started', 'running', 'pending']);

      if (updateError) {
        return { success: false, message: updateError.message, count: 0 };
      }

      return { 
        success: true, 
        message: `Successfully reset ${syncCount} active sync(s)`, 
        count: syncCount 
      };
    } catch (error) {
      return { 
        success: false, 
        message: error instanceof Error ? error.message : 'Unknown error',
        count: 0 
      };
    }
  }

  /**
   * Get current sync status with enhanced details
   */
  static async getCurrentSyncStatus(connectionId: string) {
    try {
      const { data, error } = await supabase
        .from('zoom_sync_logs')
        .select('*')
        .eq('connection_id', connectionId)
        .in('sync_status', ['started', 'running', 'pending'])
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error('Failed to get sync status:', error);
        return null;
      }

      if (!data) {
        return null;
      }

      // Check if sync is stuck
      const now = new Date();
      const startTime = new Date(data.started_at);
      const minutesRunning = Math.floor((now.getTime() - startTime.getTime()) / (1000 * 60));
      const isStuck = minutesRunning > this.STUCK_SYNC_TIMEOUT_MINUTES;

      return {
        ...data,
        minutesRunning,
        isStuck,
        canReset: isStuck || data.sync_stage === 'initializing'
      };
    } catch (error) {
      console.error('Error getting sync status:', error);
      return null;
    }
  }
}
