import { supabase } from '@/integrations/supabase/client';
import { SyncStatus } from '@/types/zoom';

/**
 * Service to handle stuck sync recovery and cleanup
 */
export class SyncRecoveryService {
  private static readonly STUCK_SYNC_TIMEOUT_MINUTES = 10; // Reduced from 15 to 10
  private static readonly INITIALIZING_TIMEOUT_MINUTES = 5; // New: timeout for initializing stage

  /**
   * Cancel a specific stuck sync - Fixed column reference
   */
  static async cancelStuckSync(syncLogId: string): Promise<{ success: boolean; message: string }> {
    try {
      console.log(`Cancelling stuck sync: ${syncLogId}`);

      const { error } = await supabase
        .from('zoom_sync_logs')
        .update({
          sync_status: 'cancelled',
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
   * Detect and automatically recover stuck syncs - Enhanced version
   */
  static async detectAndRecoverStuckSyncs(connectionId: string): Promise<number> {
    try {
      const stuckSyncCutoff = new Date();
      stuckSyncCutoff.setMinutes(stuckSyncCutoff.getMinutes() - this.STUCK_SYNC_TIMEOUT_MINUTES);

      // Find syncs that are stuck in any active state for too long
      const { data: stuckSyncs, error } = await supabase
        .from('zoom_sync_logs')
        .select('id, sync_stage, started_at, sync_status')
        .eq('connection_id', connectionId)
        .in('sync_status', ['started', 'running', 'pending'])
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
   * Force cleanup of all stuck syncs for a connection - Nuclear option
   */
  static async forceCleanupStuckSyncs(connectionId: string): Promise<{ success: boolean; message: string; count: number }> {
    try {
      console.log(`Force cleaning up stuck syncs for connection: ${connectionId}`);

      // Find ALL active syncs (not just old ones)
      const { data: activeSyncs, error: fetchError } = await supabase
        .from('zoom_sync_logs')
        .select('id, sync_status, started_at')
        .eq('connection_id', connectionId)
        .in('sync_status', ['started', 'running', 'pending']);

      if (fetchError) {
        return { success: false, message: fetchError.message, count: 0 };
      }

      const syncCount = activeSyncs?.length || 0;
      if (syncCount === 0) {
        return { success: true, message: 'No active syncs to cleanup', count: 0 };
      }

      // Cancel ALL active syncs immediately
      const { error: updateError } = await supabase
        .from('zoom_sync_logs')
        .update({
          sync_status: 'cancelled',
          completed_at: new Date().toISOString(),
          error_message: 'Force cancelled - stuck sync cleanup',
          updated_at: new Date().toISOString()
        })
        .eq('connection_id', connectionId)
        .in('sync_status', ['started', 'running', 'pending']);

      if (updateError) {
        return { success: false, message: updateError.message, count: 0 };
      }

      console.log(`✅ Force cleaned up ${syncCount} stuck sync(s)`);
      
      return { 
        success: true, 
        message: `Successfully cleaned up ${syncCount} stuck sync(s)`, 
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
      
      // Different thresholds for different stages
      const isStuckInInitializing = data.sync_stage === 'initializing' && minutesRunning > this.INITIALIZING_TIMEOUT_MINUTES;
      const isStuckOverall = minutesRunning > this.STUCK_SYNC_TIMEOUT_MINUTES;
      const isStuck = isStuckInInitializing || isStuckOverall;
      
      // Show reset option for initializing syncs after 5 minutes, others after 10 minutes
      const canReset = isStuckInInitializing || isStuckOverall || data.sync_stage === 'initializing';

      return {
        ...data,
        minutesRunning,
        isStuck,
        canReset,
        isStuckInInitializing,
        timeoutThreshold: data.sync_stage === 'initializing' ? this.INITIALIZING_TIMEOUT_MINUTES : this.STUCK_SYNC_TIMEOUT_MINUTES
      };
    } catch (error) {
      console.error('Error getting sync status:', error);
      return null;
    }
  }

  /**
   * Force cancel current sync (immediate action)
   */
  static async forceCancelCurrentSync(connectionId: string): Promise<{ success: boolean; message: string }> {
    try {
      const currentSync = await this.getCurrentSyncStatus(connectionId);
      if (!currentSync) {
        return { success: false, message: 'No active sync found to cancel' };
      }

      return await this.cancelStuckSync(currentSync.id);
    } catch (error) {
      console.error('Error force cancelling sync:', error);
      return { 
        success: false, 
        message: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }
}
