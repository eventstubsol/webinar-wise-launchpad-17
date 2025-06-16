
import { supabase } from '@/integrations/supabase/client';
import { SyncStatus } from '@/types/zoom';

/**
 * Service for handling sync recovery, cleanup, and retry operations
 */
export class SyncRecoveryService {
  /**
   * Clean up stuck sync operations for a connection
   */
  static async cleanupStuckSyncs(connectionId: string): Promise<void> {
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    
    try {
      const { error } = await supabase
        .from('zoom_sync_logs')
        .update({
          sync_status: SyncStatus.FAILED,
          error_message: 'Sync timed out - marked as failed by cleanup process',
          completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('connection_id', connectionId)
        .eq('sync_status', SyncStatus.STARTED)
        .lt('created_at', tenMinutesAgo);

      if (error) {
        console.error('Failed to cleanup stuck syncs:', error);
        throw error;
      }

      console.log('Successfully cleaned up stuck syncs');
    } catch (error) {
      console.error('Error in cleanupStuckSyncs:', error);
      throw error;
    }
  }

  /**
   * Check if there are any active syncs for a connection
   */
  static async hasActiveSyncs(connectionId: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('zoom_sync_logs')
        .select('id')
        .eq('connection_id', connectionId)
        .in('sync_status', [SyncStatus.STARTED, SyncStatus.IN_PROGRESS])
        .limit(1);

      if (error) {
        console.error('Failed to check for active syncs:', error);
        return false;
      }

      return (data && data.length > 0);
    } catch (error) {
      console.error('Error checking for active syncs:', error);
      return false;
    }
  }

  /**
   * Get the last failed sync for retry
   */
  static async getLastFailedSync(connectionId: string) {
    try {
      const { data, error } = await supabase
        .from('zoom_sync_logs')
        .select('*')
        .eq('connection_id', connectionId)
        .eq('sync_status', SyncStatus.FAILED)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        console.error('Failed to get last failed sync:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error getting last failed sync:', error);
      return null;
    }
  }

  /**
   * Retry a failed sync operation
   */
  static async retryFailedSync(connectionId: string, syncType: 'initial' | 'incremental' = 'incremental'): Promise<void> {
    try {
      // First cleanup any stuck syncs
      await this.cleanupStuckSyncs(connectionId);

      // Check if there are any active syncs
      const hasActive = await this.hasActiveSyncs(connectionId);
      if (hasActive) {
        throw new Error('Cannot retry: there is already an active sync in progress');
      }

      // Start a new sync
      const { error } = await supabase.functions.invoke('zoom-sync-webinars', {
        body: {
          connectionId,
          syncType,
          retryAttempt: true
        }
      });

      if (error) {
        throw error;
      }

      console.log('Retry sync started successfully');
    } catch (error) {
      console.error('Failed to retry sync:', error);
      throw error;
    }
  }

  /**
   * Force cancel an active sync (mark as cancelled)
   */
  static async cancelActiveSync(connectionId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('zoom_sync_logs')
        .update({
          sync_status: SyncStatus.CANCELLED,
          error_message: 'Sync cancelled by user',
          completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('connection_id', connectionId)
        .in('sync_status', [SyncStatus.STARTED, SyncStatus.IN_PROGRESS]);

      if (error) {
        console.error('Failed to cancel active sync:', error);
        throw error;
      }

      console.log('Active sync cancelled successfully');
    } catch (error) {
      console.error('Error cancelling active sync:', error);
      throw error;
    }
  }

  /**
   * Get comprehensive sync status for a connection
   */
  static async getSyncStatus(connectionId: string) {
    try {
      const { data, error } = await supabase
        .from('zoom_sync_logs')
        .select('*')
        .eq('connection_id', connectionId)
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) {
        console.error('Failed to get sync status:', error);
        return null;
      }

      const activeSync = data?.find(log => 
        log.sync_status === SyncStatus.STARTED || 
        log.sync_status === SyncStatus.IN_PROGRESS
      );

      const lastCompletedSync = data?.find(log => 
        log.sync_status === SyncStatus.COMPLETED
      );

      const lastFailedSync = data?.find(log => 
        log.sync_status === SyncStatus.FAILED
      );

      return {
        activeSync,
        lastCompletedSync,
        lastFailedSync,
        recentSyncs: data || []
      };
    } catch (error) {
      console.error('Error getting sync status:', error);
      return null;
    }
  }
}
