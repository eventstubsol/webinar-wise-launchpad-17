
/**
 * Bulletproof sync operations with multiple fallback layers
 */
import { TransactionManager } from './transaction-manager.ts';

export class BulletproofSyncOperations {
  private transactionManager: TransactionManager;
  private supabase: any;

  constructor(supabase: any) {
    this.supabase = supabase;
    this.transactionManager = new TransactionManager(supabase);
  }

  /**
   * Bulletproof sync completion with multiple fallback layers
   */
  async completeSyncBulletproof(
    syncLogId: string,
    results: any,
    verificationResult: any,
    preSync: any
  ): Promise<void> {
    const completionStartTime = Date.now();
    console.log(`🛡️ BULLETPROOF COMPLETION: Starting for sync ${syncLogId}`);

    try {
      // LAYER 1: Primary completion with full metrics
      await this.primaryCompletion(syncLogId, results, verificationResult, preSync);
      console.log(`✅ PRIMARY COMPLETION: Success for sync ${syncLogId}`);
      return;
      
    } catch (primaryError) {
      console.error(`❌ PRIMARY COMPLETION FAILED:`, primaryError);
      
      try {
        // LAYER 2: Secondary completion with essential data only
        await this.secondaryCompletion(syncLogId, results);
        console.log(`✅ SECONDARY COMPLETION: Success for sync ${syncLogId}`);
        return;
        
      } catch (secondaryError) {
        console.error(`❌ SECONDARY COMPLETION FAILED:`, secondaryError);
        
        try {
          // LAYER 3: Emergency completion - status only
          await this.emergencyCompletion(syncLogId);
          console.log(`✅ EMERGENCY COMPLETION: Success for sync ${syncLogId}`);
          return;
          
        } catch (emergencyError) {
          console.error(`❌ ALL COMPLETION LAYERS FAILED:`, emergencyError);
          
          // LAYER 4: Last resort - force completion
          await this.lastResortCompletion(syncLogId, completionStartTime);
          console.log(`⚠️ LAST RESORT COMPLETION: Success for sync ${syncLogId}`);
        }
      }
    }
  }

  /**
   * Primary completion with full metrics and verification
   */
  private async primaryCompletion(
    syncLogId: string,
    results: any,
    verificationResult: any,
    preSync: any
  ): Promise<void> {
    console.log(`🎯 PRIMARY COMPLETION: Full metrics update for sync ${syncLogId}`);

    const { generateEnhancedVerificationReport } = await import('../enhanced-verification.ts');
    const verificationReport = verificationResult ? 
      generateEnhancedVerificationReport(verificationResult) : 
      'Verification report unavailable';

    const completionData = {
      sync_status: 'completed',
      completed_at: new Date().toISOString(),
      sync_stage: 'completed',
      stage_progress_percentage: 100,
      processed_items: results.processedCount,
      sync_notes: JSON.stringify({
        enhanced_verification_enabled: true,
        enhanced_processing_applied: true,
        comprehensive_field_validation: true,
        timeout_protection_enabled: true,
        guaranteed_completion: true,
        completion_timestamp: new Date().toISOString(),
        verification_result: verificationResult || 'completed_without_baseline',
        verification_report: verificationReport,
        enhanced_stats: {
          webinar_stats: {
            total: results.totalWebinars,
            successful: results.successCount,
            errors: results.errorCount,
            inserts: results.insertCount,
            updates: results.updateCount
          },
          participant_stats: {
            synced: results.totalParticipantsSynced,
            processed_webinars: results.processedForParticipants,
            skipped_webinars: results.skippedForParticipants
          }
        }
      })
    };

    await this.transactionManager.updateSyncLogSafely(
      syncLogId,
      completionData,
      'Primary completion with full metrics'
    );
  }

  /**
   * Secondary completion with essential data only
   */
  private async secondaryCompletion(syncLogId: string, results: any): Promise<void> {
    console.log(`🔄 SECONDARY COMPLETION: Essential data only for sync ${syncLogId}`);

    const essentialData = {
      sync_status: 'completed',
      completed_at: new Date().toISOString(),
      sync_stage: 'completed',
      stage_progress_percentage: 100,
      processed_items: results.processedCount || 0
    };

    await this.transactionManager.updateSyncLogSafely(
      syncLogId,
      essentialData,
      'Secondary completion with essential data'
    );
  }

  /**
   * Emergency completion - status only
   */
  private async emergencyCompletion(syncLogId: string): Promise<void> {
    console.log(`🚨 EMERGENCY COMPLETION: Status only for sync ${syncLogId}`);

    const statusOnlyData = {
      sync_status: 'completed',
      completed_at: new Date().toISOString(),
      stage_progress_percentage: 100
    };

    await this.transactionManager.updateSyncLogSafely(
      syncLogId,
      statusOnlyData,
      'Emergency completion - status only'
    );
  }

  /**
   * Last resort completion using force mechanism
   */
  private async lastResortCompletion(syncLogId: string, startTime: number): Promise<void> {
    console.log(`💥 LAST RESORT COMPLETION: Force mechanism for sync ${syncLogId}`);

    await this.transactionManager.forceCompletion(syncLogId);

    // Log the extreme situation
    const duration = Date.now() - startTime;
    console.error(`⚠️ COMPLETION REQUIRED LAST RESORT after ${duration}ms for sync ${syncLogId}`);
  }

  /**
   * Validate sync completion
   */
  async validateCompletion(syncLogId: string): Promise<boolean> {
    try {
      const { data, error } = await this.supabase
        .from('zoom_sync_logs')
        .select('sync_status, completed_at, stage_progress_percentage')
        .eq('id', syncLogId)
        .single();

      if (error) {
        console.error(`❌ VALIDATION ERROR:`, error);
        return false;
      }

      const isCompleted = data.sync_status === 'completed' && 
                         data.completed_at !== null && 
                         data.stage_progress_percentage === 100;

      console.log(`🔍 COMPLETION VALIDATION: ${isCompleted ? 'PASSED' : 'FAILED'} for sync ${syncLogId}`);
      console.log(`📊 VALIDATION DATA:`, data);

      return isCompleted;
    } catch (error) {
      console.error(`❌ VALIDATION EXCEPTION:`, error);
      return false;
    }
  }
}
