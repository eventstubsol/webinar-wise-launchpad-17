
import { supabase } from '@/integrations/supabase/client';

/**
 * Service to recover sync state after page refresh or remount
 */
export class SyncStateRecoveryService {
  /**
   * Check for any active syncs for a connection and restore state
   */
  static async recoverActiveSyncState(connectionId: string) {
    try {
      console.log(`🔄 [Recovery] Checking for active syncs for connection: ${connectionId}`);
      
      const { data: activeSync, error } = await supabase
        .from('zoom_sync_logs')
        .select('*')
        .eq('connection_id', connectionId)
        .in('sync_status', ['started', 'running', 'pending'])
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error('❌ [Recovery] Error checking for active syncs:', error);
        return null;
      }

      if (!activeSync) {
        console.log('✅ [Recovery] No active syncs found');
        return null;
      }

      // Calculate how long the sync has been running
      const startTime = new Date(activeSync.started_at);
      const now = new Date();
      const minutesRunning = Math.floor((now.getTime() - startTime.getTime()) / (1000 * 60));

      console.log(`🔄 [Recovery] Found active sync:`, {
        id: activeSync.id,
        status: activeSync.sync_status,
        stage: activeSync.sync_stage,
        progress: activeSync.stage_progress_percentage,
        minutesRunning
      });

      // Check if sync appears stuck (running for more than 15 minutes)
      const isStuck = minutesRunning > 15;
      
      return {
        syncId: activeSync.id,
        syncStatus: activeSync.sync_status,
        syncProgress: activeSync.stage_progress_percentage || 0,
        currentOperation: activeSync.sync_stage || 'Processing...',
        startedAt: activeSync.started_at,
        minutesRunning,
        isStuck,
        metadata: activeSync.metadata || {}
      };
    } catch (error) {
      console.error('❌ [Recovery] Error in sync state recovery:', error);
      return null;
    }
  }

  /**
   * Force cancel any active sync for a connection
   */
  static async forceCancelActiveSync(connectionId: string): Promise<{ success: boolean; message: string }> {
    try {
      console.log(`🛑 [Recovery] Force cancelling active syncs for connection: ${connectionId}`);
      
      const { data: activeSyncs, error: fetchError } = await supabase
        .from('zoom_sync_logs')
        .select('id, sync_status')
        .eq('connection_id', connectionId)
        .in('sync_status', ['started', 'running', 'pending']);

      if (fetchError) {
        console.error('❌ [Recovery] Error fetching active syncs:', fetchError);
        return { success: false, message: fetchError.message };
      }

      if (!activeSyncs || activeSyncs.length === 0) {
        console.log('✅ [Recovery] No active syncs to cancel');
        return { success: true, message: 'No active syncs found' };
      }

      // Cancel all active syncs
      const { error: updateError } = await supabase
        .from('zoom_sync_logs')
        .update({
          sync_status: 'cancelled',
          completed_at: new Date().toISOString(),
          error_message: 'Force cancelled by user after page refresh',
          updated_at: new Date().toISOString()
        })
        .eq('connection_id', connectionId)
        .in('sync_status', ['started', 'running', 'pending']);

      if (updateError) {
        console.error('❌ [Recovery] Error cancelling syncs:', updateError);
        return { success: false, message: updateError.message };
      }

      console.log(`✅ [Recovery] Successfully cancelled ${activeSyncs.length} active sync(s)`);
      return { 
        success: true, 
        message: `Cancelled ${activeSyncs.length} active sync(s)` 
      };
    } catch (error) {
      console.error('❌ [Recovery] Error in force cancel:', error);
      return { 
        success: false, 
        message: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }
}
