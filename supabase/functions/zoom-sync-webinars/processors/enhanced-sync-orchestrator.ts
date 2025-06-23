
/**
 * Enhanced sync orchestrator with comprehensive timeout protection and guaranteed completion
 */
import { updateSyncLog, updateSyncStage } from '../database-operations.ts';
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
  
  console.log(`🚀 ENHANCED SYNC ORCHESTRATOR: Starting with guaranteed completion and timeout management`);
  console.log(`  🔧 Debug mode: ${debugMode}`);
  console.log(`  🧪 Test mode: ${testMode}`);
  console.log(`  ⏱️ Timeout protection: ENABLED with fallbacks`);
  console.log(`  📊 Field validation: COMPREHENSIVE (39 fields)`);

  // Enhanced timeout management with progressive timeouts
  const SYNC_TIMEOUT_MS = 45 * 60 * 1000; // 45 minutes total
  const VERIFICATION_TIMEOUT_MS = 60 * 1000; // 60 seconds for verification (increased)
  const BASELINE_TIMEOUT_MS = 20 * 1000; // 20 seconds for baseline (increased)
  const syncStartTime = Date.now();
  
  let preSync: EnhancedSyncBaseline | null = null;

  try {
    // PHASE 1: ENHANCED BASELINE CAPTURE WITH ROBUST TIMEOUT PROTECTION
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
      console.log(`✅ ENHANCED BASELINE: Captured successfully in ${baselineDuration}ms with ${preSync.fieldPopulationStats.populationRate}% field completion`);
      
    } catch (baselineError) {
      const baselineDuration = Date.now() - syncStartTime;
      console.error(`❌ ENHANCED BASELINE: Capture failed after ${baselineDuration}ms:`, baselineError);
      
      // Continue without baseline - sync can still complete
      await updateSyncLog(supabase, syncLogId, {
        error_message: `Enhanced baseline capture failed: ${baselineError.message}`,
        sync_notes: JSON.stringify({
          enhanced_verification_enabled: true,
          baseline_capture_failed: true,
          baseline_error: baselineError.message,
          baseline_duration_ms: baselineDuration,
          timeout_protection: true,
          field_validation_enabled: true,
          will_complete_without_baseline: true
        })
      });
    }
    
    await updateSyncStage(supabase, syncLogId, null, 'fetching_webinars_enhanced', 10);
    
    // PHASE 2: WEBINAR FETCHING WITH ENHANCED TIMEOUT AND FALLBACK
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
      await completeEmptySync(supabase, syncLogId, preSync, connection.id, VERIFICATION_TIMEOUT_MS);
      return;
    }
    
    await updateSyncStage(supabase, syncLogId, null, 'processing_webinars_enhanced', 20);
    
    // PHASE 3: ENHANCED WEBINAR PROCESSING WITH TIMEOUT MONITORING
    console.log(`🔄 WEBINAR PROCESSING: Starting batch processing with timeout monitoring...`);
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
    
    // PHASE 4: ENHANCED VERIFICATION WITH GUARANTEED COMPLETION
    console.log(`🔍 VERIFICATION PHASE: Starting with fallback protection...`);
    await updateSyncStage(supabase, syncLogId, null, 'starting_verification', 88);
    
    const verificationResult = await executeEnhancedVerification(
      supabase,
      connection.id,
      syncLogId,
      preSync,
      VERIFICATION_TIMEOUT_MS
    );
    
    console.log(`✅ VERIFICATION PHASE: Completed with result: ${verificationResult ? 'SUCCESS' : 'SKIPPED'}`);
    
    // PHASE 5: GUARANTEED COMPLETION WITH ENHANCED METRICS
    console.log(`🏁 COMPLETION PHASE: Finalizing sync with comprehensive metrics...`);
    await updateSyncStage(supabase, syncLogId, null, 'finalizing_sync', 98);
    
    await completeSyncWithMetrics(supabase, syncLogId, results, verificationResult, preSync);
    
    const totalDuration = Date.now() - syncStartTime;
    console.log(`✅ ENHANCED SYNC COMPLETED: Total duration ${totalDuration}ms - All phases completed successfully`);
    
  } catch (error) {
    const totalDuration = Date.now() - syncStartTime;
    console.error(`❌ ENHANCED SYNC FAILED after ${totalDuration}ms:`, error);
    
    // GUARANTEED COMPLETION: Even on error, mark sync as completed with error details
    await updateSyncLog(supabase, syncLogId, {
      sync_status: 'failed',
      error_message: error.message,
      completed_at: new Date().toISOString(),
      sync_stage: 'failed_but_completed',
      stage_progress_percentage: 100, // Always reach 100% to stop polling
      sync_notes: JSON.stringify({
        enhanced_verification_enabled: true,
        enhanced_processing_applied: true,
        comprehensive_field_validation: true,
        timeout_protection_enabled: true,
        guaranteed_completion: true,
        total_duration_ms: totalDuration,
        enhanced_error_context: {
          error_location: 'enhanced_sync_orchestrator',
          timeout_occurred: error.message.includes('timeout'),
          error_message: error.message,
          completion_guaranteed: true
        }
      })
    });
    
    throw error;
  }
}

async function completeEmptySync(
  supabase: any,
  syncLogId: string,
  preSync: EnhancedSyncBaseline | null,
  connectionId: string,
  verificationTimeoutMs: number
): Promise<void> {
  console.log(`📭 EMPTY SYNC: Completing sync with no webinars found...`);
  
  const verificationResult = preSync ? 
    await executeEnhancedVerification(supabase, connectionId, syncLogId, preSync, verificationTimeoutMs) :
    null;
  
  await updateSyncLog(supabase, syncLogId, {
    sync_status: 'completed',
    processed_items: 0,
    completed_at: new Date().toISOString(),
    sync_stage: 'completed',
    stage_progress_percentage: 100, // Guarantee 100% completion
    sync_notes: JSON.stringify({
      enhanced_verification_enabled: true,
      enhanced_processing_applied: true,
      empty_sync: true,
      verification_result: verificationResult || 'baseline_unavailable',
      comprehensive_field_validation: true,
      timeout_protection_enabled: true,
      guaranteed_completion: true
    })
  });
  
  console.log(`✅ EMPTY SYNC: Completed successfully - 100% reached`);
}

async function completeSyncWithMetrics(
  supabase: any,
  syncLogId: string,
  results: any,
  verificationResult: any,
  preSync: EnhancedSyncBaseline | null
): Promise<void> {
  console.log(`🏁 COMPLETION WITH METRICS: Finalizing sync with comprehensive reporting...`);
  
  const webinarSuccessRate = results.totalWebinars > 0 ? ((results.successCount / results.totalWebinars) * 100).toFixed(1) : '0';
  const fieldMappingSuccessRate = (results.processedCount > 0 ? ((results.fieldMappingSuccessCount / results.processedCount) * 100).toFixed(1) : '0');
  const errorRate = (results.processedCount > 0 ? ((results.errorCount / results.processedCount) * 100).toFixed(1) : '0');
  
  console.log(`📊 ENHANCED SYNC COMPLETION STATS:`);
  console.log(`  🎯 Webinars: ${results.successCount}/${results.totalWebinars} (${webinarSuccessRate}% success)`);
  console.log(`  📋 Field mapping: ${results.fieldMappingSuccessCount}/${results.processedCount} (${fieldMappingSuccessRate}% success)`);
  console.log(`  🔄 Operations: ${results.insertCount} inserts, ${results.updateCount} updates`);
  console.log(`  👥 Participants: ${results.totalParticipantsSynced} synced, ${results.skippedForParticipants} skipped`);
  console.log(`  📝 Registrants: ${results.totalRegistrantsSynced} synced, ${results.skippedForRegistrants} skipped`);
  console.log(`  ❌ Errors: ${results.errorCount} (${errorRate}% error rate)`);
  
  const { generateEnhancedVerificationReport } = await import('../enhanced-verification.ts');
  const verificationReport = verificationResult ? 
    generateEnhancedVerificationReport(verificationResult) : 
    'Verification report unavailable (baseline capture failed)';
  
  console.log(`📋 ENHANCED VERIFICATION REPORT:\n${verificationReport}`);
  
  // CRITICAL: Always ensure sync reaches 100% completion
  await updateSyncStage(supabase, syncLogId, null, 'completing', 99);
  
  await updateSyncLog(supabase, syncLogId, {
    sync_status: 'completed',
    processed_items: results.processedCount,
    completed_at: new Date().toISOString(),
    sync_stage: 'completed',
    stage_progress_percentage: 100, // GUARANTEE 100% completion
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
          success_rate: webinarSuccessRate + '%',
          error_rate: errorRate + '%',
          inserts: results.insertCount,
          updates: results.updateCount
        },
        field_mapping_stats: {
          successful: results.fieldMappingSuccessCount,
          failed: results.fieldMappingErrorCount,
          success_rate: fieldMappingSuccessRate + '%'
        },
        participant_stats: {
          synced: results.totalParticipantsSynced,
          processed_webinars: results.processedForParticipants,
          skipped_webinars: results.skippedForParticipants
        },
        registrant_stats: {
          synced: results.totalRegistrantsSynced,
          processed_webinars: results.processedForRegistrants,
          skipped_webinars: results.skippedForRegistrants
        },
        verification_summary: verificationResult ? {
          passed: verificationResult.passed,
          integrity_score: verificationResult.summary.integrityScore,
          field_completion_score: verificationResult.summary.fieldCompletionScore,
          issues_count: verificationResult.issues.length
        } : null
      }
    })
  });
  
  console.log(`✅ COMPLETION WITH METRICS: Sync guaranteed at 100% completion - polling will stop`);
}
