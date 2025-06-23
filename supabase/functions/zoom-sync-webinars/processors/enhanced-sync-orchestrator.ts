
/**
 * Enhanced sync orchestrator with bulletproof completion guarantee
 */
import { updateSyncLog, updateSyncStage } from '../database-operations.ts';
import { BulletproofSyncOperations } from '../database/bulletproof-sync-operations.ts';
import { SyncOperation } from '../types.ts';
import { processWebinarBatch } from './enhanced-webinar-batch-processor.ts';
import { executeEnhancedVerification } from './enhanced-verification-processor.ts';
import { captureEnhancedBaseline, type EnhancedSyncBaseline } from '../enhanced-verification.ts';

export async function orchestrateEnhancedWebinarSync(
  supabase: any,
  syncOperation: SyncOperation,
  connection: any,
  syncLogId: string
): Promise<void> {
  const debugMode = syncOperation.options?.debug || false;
  const testMode = syncOperation.options?.testMode || false;
  
  console.log(`🚀 ENHANCED SYNC ORCHESTRATOR: Starting with bulletproof completion guarantee`);
  console.log(`  🔧 Debug mode: ${debugMode}`);
  console.log(`  🧪 Test mode: ${testMode}`);
  console.log(`  🛡️ Bulletproof completion: ENABLED`);

  // Initialize bulletproof operations
  const bulletproofOps = new BulletproofSyncOperations(supabase);

  // Enhanced timeout management with progressive timeouts
  const SYNC_TIMEOUT_MS = 45 * 60 * 1000; // 45 minutes total
  const VERIFICATION_TIMEOUT_MS = 60 * 1000; // 60 seconds for verification
  const BASELINE_TIMEOUT_MS = 20 * 1000; // 20 seconds for baseline
  const syncStartTime = Date.now();
  
  let preSync: EnhancedSyncBaseline | null = null;

  try {
    // PHASE 1: ENHANCED BASELINE CAPTURE
    console.log(`🔍 ENHANCED BASELINE: Starting capture with ${BASELINE_TIMEOUT_MS}ms timeout...`);
    await updateSyncStage(supabase, syncLogId, null, 'capturing_enhanced_baseline', 5);
    
    try {
      const baselineStartTime = Date.now();
      preSync = await Promise.race([
        captureEnhancedBaseline(supabase, connection.id, BASELINE_TIMEOUT_MS),
        new Promise<never>((_, reject) => 
          setTimeout(() => {
            console.error(`❌ BASELINE TIMEOUT: Exceeded ${BASELINE_TIMEOUT_MS}ms`);
            reject(new Error(`Baseline capture timeout after ${BASELINE_TIMEOUT_MS}ms`));
          }, BASELINE_TIMEOUT_MS)
        )
      ]);
      
      const baselineDuration = Date.now() - baselineStartTime;
      console.log(`✅ ENHANCED BASELINE: Captured successfully in ${baselineDuration}ms`);
      
    } catch (baselineError) {
      const baselineDuration = Date.now() - syncStartTime;
      console.error(`❌ ENHANCED BASELINE: Capture failed after ${baselineDuration}ms:`, baselineError);
      
      await updateSyncLog(supabase, syncLogId, {
        error_message: `Enhanced baseline capture failed: ${baselineError.message}`,
        sync_notes: JSON.stringify({
          enhanced_verification_enabled: true,
          baseline_capture_failed: true,
          baseline_error: baselineError.message,
          will_complete_with_bulletproof_mechanism: true
        })
      });
    }
    
    await updateSyncStage(supabase, syncLogId, null, 'fetching_webinars_enhanced', 10);
    
    // PHASE 2: WEBINAR FETCHING
    console.log(`📋 WEBINAR FETCHING: Starting with timeout protection...`);
    const zoomApi = await import('../zoom-api-client.ts');
    const client = await zoomApi.createZoomAPIClient(connection, supabase);
    
    const webinarsPromise = client.listWebinarsWithRange({ type: 'all' });
    const webinarTimeoutPromise = new Promise<never>((_, reject) => 
      setTimeout(() => {
        console.error('❌ WEBINAR FETCH TIMEOUT: Exceeded 60s limit');
        reject(new Error('Webinar fetch timeout after 60s'));
      }, 60000)
    );
    
    const webinars = await Promise.race([webinarsPromise, webinarTimeoutPromise]) as any[];
    
    console.log(`📋 ENHANCED DISCOVERY: Found ${webinars.length} webinars for processing`);
    
    if (webinars.length === 0) {
      await completeEmptySync(supabase, syncLogId, preSync, connection.id, VERIFICATION_TIMEOUT_MS, bulletproofOps);
      return;
    }
    
    await updateSyncStage(supabase, syncLogId, null, 'processing_webinars_enhanced', 20);
    
    // PHASE 3: ENHANCED WEBINAR PROCESSING
    console.log(`🔄 WEBINAR PROCESSING: Starting batch processing...`);
    const processingStartTime = Date.now();
    
    const results = await processWebinarBatch(
      supabase,
      client,
      webinars,
      connection,
      syncLogId,
      syncStartTime,
      SYNC_TIMEOUT_MS,
      debugMode
    );
    
    const processingDuration = Date.now() - processingStartTime;
    console.log(`✅ WEBINAR PROCESSING: Completed in ${processingDuration}ms`);
    
    // PHASE 4: ENHANCED VERIFICATION
    console.log(`🔍 VERIFICATION PHASE: Starting with fallback protection...`);
    await updateSyncStage(supabase, syncLogId, null, 'starting_verification', 88);
    
    const verificationResult = await executeEnhancedVerification(
      supabase,
      connection.id,
      syncLogId,
      preSync,
      VERIFICATION_TIMEOUT_MS
    );
    
    console.log(`✅ VERIFICATION PHASE: Completed`);
    
    // PHASE 5: BULLETPROOF COMPLETION GUARANTEE
    console.log(`🛡️ BULLETPROOF COMPLETION: Starting guaranteed completion...`);
    await updateSyncStage(supabase, syncLogId, null, 'bulletproof_completing', 95);
    
    await bulletproofOps.completeSyncBulletproof(syncLogId, results, verificationResult, preSync);
    
    // Validate completion was successful
    const completionValidated = await bulletproofOps.validateCompletion(syncLogId);
    if (!completionValidated) {
      throw new Error('Completion validation failed - sync may not be properly completed');
    }
    
    const totalDuration = Date.now() - syncStartTime;
    console.log(`🎯 BULLETPROOF SYNC COMPLETED: Total duration ${totalDuration}ms - GUARANTEED 100% completion`);
    
  } catch (error) {
    const totalDuration = Date.now() - syncStartTime;
    console.error(`❌ ENHANCED SYNC FAILED after ${totalDuration}ms:`, error);
    
    // EMERGENCY COMPLETION: Even on error, use bulletproof completion
    console.log(`🚨 EMERGENCY BULLETPROOF COMPLETION: Activating for sync ${syncLogId}`);
    
    try {
      const bulletproofOps = new BulletproofSyncOperations(supabase);
      await bulletproofOps.emergencyCompletion(syncLogId);
      console.log(`✅ EMERGENCY COMPLETION: Sync ${syncLogId} completed despite errors`);
    } catch (emergencyError) {
      console.error(`💥 EMERGENCY COMPLETION FAILED:`, emergencyError);
      
      // Final fallback - mark as failed but completed
      await updateSyncLog(supabase, syncLogId, {
        sync_status: 'failed',
        error_message: error.message,
        completed_at: new Date().toISOString(),
        sync_stage: 'failed_but_completed',
        stage_progress_percentage: 100,
        sync_notes: JSON.stringify({
          emergency_completion_attempted: true,
          emergency_completion_failed: true,
          final_fallback_applied: true,
          guaranteed_completion: true,
          total_duration_ms: totalDuration
        })
      });
    }
    
    throw error;
  }
}

async function completeEmptySync(
  supabase: any,
  syncLogId: string,
  preSync: EnhancedSyncBaseline | null,
  connectionId: string,
  verificationTimeoutMs: number,
  bulletproofOps: BulletproofSyncOperations
): Promise<void> {
  console.log(`📭 EMPTY SYNC: Completing with bulletproof mechanism...`);
  
  const verificationResult = preSync ? 
    await executeEnhancedVerification(supabase, connectionId, syncLogId, preSync, verificationTimeoutMs) :
    null;
  
  // Use bulletproof completion for empty sync too
  const emptyResults = {
    totalWebinars: 0,
    successCount: 0,
    errorCount: 0,
    processedCount: 0,
    insertCount: 0,
    updateCount: 0,
    totalParticipantsSynced: 0,
    processedForParticipants: 0,
    skippedForParticipants: 0
  };
  
  await bulletproofOps.completeSyncBulletproof(syncLogId, emptyResults, verificationResult, preSync);
  
  console.log(`✅ EMPTY SYNC: Completed with bulletproof guarantee`);
}
