
import { supabase } from '@/integrations/supabase/client';
import { SyncStatus } from '@/types/zoom';

/**
 * Enhanced service for handling sync recovery, cleanup, and persistence
 */
export class EnhancedSyncRecoveryService {
  /**
   * Detect and resume any interrupted syncs on page load
   */
  static async detectAndResumeInterruptedSyncs(connectionId: string): Promise<void> {
    console.log('Checking for interrupted syncs...');
    
    try {
      const { data: interruptedSyncs, error } = await supabase
        .from('zoom_sync_logs')
        .select('*')
        .eq('connection_id', connectionId)
        .in('sync_status', [SyncStatus.STARTED, SyncStatus.IN_PROGRESS])
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Failed to check for interrupted syncs:', error);
        return;
      }

      if (interruptedSyncs && interruptedSyncs.length > 0) {
        console.log(`Found ${interruptedSyncs.length} interrupted syncs`);
        
        for (const sync of interruptedSyncs) {
          const syncAge = new Date().getTime() - new Date(sync.created_at).getTime();
          const ageMinutes = Math.round(syncAge / (1000 * 60));
          
          console.log(`Interrupted sync ${sync.id}: age ${ageMinutes} minutes, status: ${sync.sync_status}`);
          
          // If sync is recent (< 5 minutes), assume it's still running in background
          if (ageMinutes < 5) {
            console.log(`Sync ${sync.id} is recent, likely still running in background`);
            continue;
          }
          
          // If sync is old (> 30 minutes), mark as failed
          if (ageMinutes > 30) {
            console.log(`Cleaning up old interrupted sync ${sync.id}`);
            await this.markSyncAsFailed(sync.id, `Cleaned up after ${ageMinutes} minutes`);
            continue;
          }
          
          // For syncs between 5-30 minutes, check if we should resume or clean up
          console.log(`Sync ${sync.id} may need attention - age: ${ageMinutes} minutes`);
        }
      } else {
        console.log('No interrupted syncs found');
      }
    } catch (error) {
      console.error('Error detecting interrupted syncs:', error);
    }
  }

  /**
   * Mark a sync as failed
   */
  private static async markSyncAsFailed(syncId: string, reason: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('zoom_sync_logs')
        .update({
          sync_status: SyncStatus.FAILED,
          error_message: reason,
          completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', syncId);

      if (error) {
        console.error(`Failed to mark sync ${syncId} as failed:`, error);
      } else {
        console.log(`Marked sync ${syncId} as failed: ${reason}`);
      }
    } catch (error) {
      console.error(`Error marking sync ${syncId} as failed:`, error);
    }
  }

  /**
   * Enhanced cleanup with better logging and error handling
   */
  static async enhancedCleanupStuckSyncs(connectionId: string): Promise<{ cleaned: number; errors: string[] }> {
    console.log('Starting enhanced cleanup of stuck syncs...');
    const errors: string[] = [];
    let cleaned = 0;
    
    try {
      const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();
      
      // First, get all stuck syncs for debugging
      const { data: stuckSyncs, error: fetchError } = await supabase
        .from('zoom_sync_logs')
        .select('*')
        .eq('connection_id', connectionId)
        .in('sync_status', [SyncStatus.STARTED, SyncStatus.IN_PROGRESS])
        .lt('created_at', thirtyMinutesAgo);

      if (fetchError) {
        errors.push(`Failed to fetch stuck syncs: ${fetchError.message}`);
        return { cleaned, errors };
      }

      if (stuckSyncs && stuckSyncs.length > 0) {
        console.log(`Found ${stuckSyncs.length} stuck syncs to clean:`, stuckSyncs.map(s => ({
          id: s.id,
          status: s.sync_status,
          created: s.created_at,
          age: Math.round((new Date().getTime() - new Date(s.created_at).getTime()) / (1000 * 60))
        })));

        // Clean them one by one for better error handling
        for (const sync of stuckSyncs) {
          try {
            const { error: updateError } = await supabase
              .from('zoom_sync_logs')
              .update({
                sync_status: SyncStatus.FAILED,
                error_message: 'Enhanced cleanup - sync was stuck for >30 minutes',
                completed_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              })
              .eq('id', sync.id);

            if (updateError) {
              errors.push(`Failed to clean sync ${sync.id}: ${updateError.message}`);
            } else {
              cleaned++;
              console.log(`Cleaned stuck sync ${sync.id}`);
            }
          } catch (error) {
            errors.push(`Exception cleaning sync ${sync.id}: ${error.message}`);
          }
        }
      } else {
        console.log('No stuck syncs found to clean');
      }

    } catch (error) {
      errors.push(`Enhanced cleanup exception: ${error.message}`);
    }

    console.log(`Enhanced cleanup completed: cleaned ${cleaned} syncs, ${errors.length} errors`);
    return { cleaned, errors };
  }

  /**
   * Get comprehensive sync status with health check
   */
  static async getComprehensiveSyncStatus(connectionId: string) {
    try {
      const { data: recentSyncs, error } = await supabase
        .from('zoom_sync_logs')
        .select('*')
        .eq('connection_id', connectionId)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) {
        console.error('Failed to get comprehensive sync status:', error);
        return null;
      }

      const activeSync = recentSyncs?.find(log => 
        log.sync_status === SyncStatus.STARTED || 
        log.sync_status === SyncStatus.IN_PROGRESS
      );

      const lastCompletedSync = recentSyncs?.find(log => 
        log.sync_status === SyncStatus.COMPLETED
      );

      const lastFailedSync = recentSyncs?.find(log => 
        log.sync_status === SyncStatus.FAILED
      );

      // Health check for active sync
      let activeSyncHealth = null;
      if (activeSync) {
        const syncAge = new Date().getTime() - new Date(activeSync.created_at).getTime();
        const ageMinutes = Math.round(syncAge / (1000 * 60));
        
        activeSyncHealth = {
          isHealthy: ageMinutes < 30,
          ageMinutes,
          status: activeSync.sync_status,
          stage: activeSync.sync_stage,
          progress: activeSync.stage_progress_percentage || 0
        };
      }

      return {
        activeSync,
        activeSyncHealth,
        lastCompletedSync,
        lastFailedSync,
        recentSyncs: recentSyncs || [],
        totalSyncs: recentSyncs?.length || 0,
        hasHealthIssues: activeSyncHealth && !activeSyncHealth.isHealthy
      };
    } catch (error) {
      console.error('Error getting comprehensive sync status:', error);
      return null;
    }
  }

  /**
   * Smart retry with enhanced logic
   */
  static async smartRetrySync(
    connectionId: string, 
    syncType: 'initial' | 'incremental' = 'incremental',
    force: boolean = false
  ): Promise<{ success: boolean; message: string; syncId?: string }> {
    try {
      // Get current status
      const status = await this.getComprehensiveSyncStatus(connectionId);
      
      if (!force && status?.activeSync && status?.activeSyncHealth?.isHealthy) {
        return {
          success: false,
          message: `Healthy sync already in progress (${status.activeSyncHealth.ageMinutes} minutes old)`
        };
      }

      // Clean up any stuck syncs
      const cleanup = await this.enhancedCleanupStuckSyncs(connectionId);
      console.log(`Cleanup results: cleaned ${cleanup.cleaned} syncs, ${cleanup.errors.length} errors`);

      // Start new sync
      const { error } = await supabase.functions.invoke('zoom-sync-webinars', {
        body: {
          connectionId,
          syncType,
          smartRetry: true,
          force
        }
      });

      if (error) {
        return {
          success: false,
          message: `Failed to start retry sync: ${error.message}`
        };
      }

      return {
        success: true,
        message: `Smart retry sync started successfully (${syncType})`
      };

    } catch (error) {
      return {
        success: false,
        message: `Smart retry failed: ${error.message}`
      };
    }
  }
}
