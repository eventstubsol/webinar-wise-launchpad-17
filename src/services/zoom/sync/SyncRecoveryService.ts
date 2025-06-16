
import { supabase } from '@/integrations/supabase/client';
import { SyncStatus } from '@/types/zoom';
import { EnhancedSyncRecoveryService } from './EnhancedSyncRecoveryService';

/**
 * Legacy service for handling sync recovery - now delegates to enhanced service
 * @deprecated Use EnhancedSyncRecoveryService instead
 */
export class SyncRecoveryService {
  /**
   * @deprecated Use EnhancedSyncRecoveryService.enhancedCleanupStuckSyncs instead
   */
  static async cleanupStuckSyncs(connectionId: string): Promise<void> {
    console.warn('SyncRecoveryService.cleanupStuckSyncs is deprecated. Use EnhancedSyncRecoveryService.enhancedCleanupStuckSyncs instead.');
    const result = await EnhancedSyncRecoveryService.enhancedCleanupStuckSyncs(connectionId);
    if (result.errors.length > 0) {
      throw new Error(`Cleanup failed: ${result.errors.join(', ')}`);
    }
  }

  /**
   * @deprecated Use EnhancedSyncRecoveryService.getComprehensiveSyncStatus instead
   */
  static async hasActiveSyncs(connectionId: string): Promise<boolean> {
    console.warn('SyncRecoveryService.hasActiveSyncs is deprecated. Use EnhancedSyncRecoveryService.getComprehensiveSyncStatus instead.');
    const status = await EnhancedSyncRecoveryService.getComprehensiveSyncStatus(connectionId);
    return !!status?.activeSync;
  }

  /**
   * @deprecated Use EnhancedSyncRecoveryService.getComprehensiveSyncStatus instead
   */
  static async getLastFailedSync(connectionId: string) {
    console.warn('SyncRecoveryService.getLastFailedSync is deprecated. Use EnhancedSyncRecoveryService.getComprehensiveSyncStatus instead.');
    const status = await EnhancedSyncRecoveryService.getComprehensiveSyncStatus(connectionId);
    return status?.lastFailedSync || null;
  }

  /**
   * @deprecated Use EnhancedSyncRecoveryService.smartRetrySync instead
   */
  static async retryFailedSync(connectionId: string, syncType: 'initial' | 'incremental' = 'incremental'): Promise<void> {
    console.warn('SyncRecoveryService.retryFailedSync is deprecated. Use EnhancedSyncRecoveryService.smartRetrySync instead.');
    const result = await EnhancedSyncRecoveryService.smartRetrySync(connectionId, syncType);
    if (!result.success) {
      throw new Error(result.message);
    }
  }

  /**
   * @deprecated Use EnhancedSyncRecoveryService.smartRetrySync with force=true instead
   */
  static async cancelActiveSync(connectionId: string): Promise<void> {
    console.warn('SyncRecoveryService.cancelActiveSync is deprecated. Use direct database update instead.');
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
        throw error;
      }
    } catch (error) {
      console.error('Error cancelling active sync:', error);
      throw error;
    }
  }

  /**
   * @deprecated Use EnhancedSyncRecoveryService.getComprehensiveSyncStatus instead
   */
  static async getSyncStatus(connectionId: string) {
    console.warn('SyncRecoveryService.getSyncStatus is deprecated. Use EnhancedSyncRecoveryService.getComprehensiveSyncStatus instead.');
    return EnhancedSyncRecoveryService.getComprehensiveSyncStatus(connectionId);
  }
}
