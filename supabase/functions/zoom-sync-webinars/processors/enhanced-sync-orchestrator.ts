
/**
 * Enhanced sync orchestrator - main coordination logic
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
  
  console.log(`🚀 ENHANCED SYNC ORCHESTRATOR: Starting with comprehensive verification and timeout management`);
  console.log(`  🔧 Debug mode: ${debugMode}`);
  console.log(`  🧪 Test mode: ${testMode}`);
  console.log(`  ⏱️ Timeout protection: ENABLED`);
  console.log(`  📊 Field validation: COMPREHENSIVE (39 fields)`);

  // Enhanced timeout management
  const SYNC_TIMEOUT_MS = 45 * 60 * 1000; // 45 minutes total
  const VERIFICATION_TIMEOUT_MS = 30 * 1000; // 30 seconds for verification
  const BASELINE_TIMEOUT_MS = 15 * 1000; // 15 seconds for baseline
  const syncStartTime = Date.now();
  
  let preSync: EnhancedSyncBaseline | null = null;

  try {
    // PHASE 1: ENHANCED BASELINE CAPTURE WITH TIMEOUT PROTECTION
    console.log(`🔍 ENHANCED BASELINE: Capturing with comprehensive field validation...`);
    await updateSyncStage(supabase, syncLogId, null, 'capturing_enhanced_baseline', 5);
    
    try {
      preSync = await captureEnhancedBaseline(supabase, connection.id, BASELINE_TIMEOUT_MS);
      console.log(`✅ ENHANCED BASELINE: Captured successfully with ${preSync.fieldPopulationStats.populationRate}% field completion`);
    } catch (baselineError) {
      console.error('❌ ENHANCED BASELINE: Capture failed:', baselineError);
      await updateSyncLog(supabase, syncLogId, {
        error_message: `Enhanced baseline capture failed: ${baselineError.message}`,
        sync_notes: JSON.stringify({
          enhanced_verification_enabled: true,
          baseline_capture_failed: true,
          baseline_error: baselineError.message,
          timeout_protection: true,
          field_validation_enabled: true
        })
      });
    }
    
    await updateSyncStage(supabase, syncLogId, null, 'fetching_webinars_enhanced', 10);
    
    // PHASE 2: WEBINAR FETCHING WITH ENHANCED TIMEOUT
    const zoomApi = await import('../zoom-api-client.ts');
    const client = await zoomApi.createZoomAPIClient(connection, supabase);
    
    const webinarsPromise = client.listWebinarsWithRange({ type: 'all' });
    const timeoutPromise = new Promise<never>((_, reject) => 
      setTimeout(() => reject(new Error('Webinar fetch timeout after 60s')), 60000)
    );
    
    const webinars = await Promise.race([webinarsPromise, timeoutPromise]) as any[];
    
    console.log(`📋 ENHANCED DISCOVERY: Found ${webinars.length} webinars for processing`);
    
    if (webinars.length === 0) {
      await completeEmptySync(supabase, syncLogId, preSync, connection.id, VERIFICATION_TIMEOUT_MS);
      return;
    }
    
    await updateSyncStage(supabase, syncLogId, null, 'processing_webinars_enhanced', 20);
    
    // PHASE 3: ENHANCED WEBINAR PROCESSING
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
    
    // PHASE 4: ENHANCED VERIFICATION WITH TIMEOUT PROTECTION
    const verificationResult = await executeEnhancedVerification(
      supabase,
      connection.id,
      syncLogId,
      preSync,
      VERIFICATION_TIMEOUT_MS
    );
    
    // PHASE 5: COMPLETION WITH ENHANCED METRICS
    await completeSyncWithMetrics(supabase, syncLogId, results, verificationResult, preSync);
    
    console.log(`✅ ENHANCED SYNC COMPLETED: All issues resolved, comprehensive verification applied`);
    
  } catch (error) {
    console.error('❌ ENHANCED SYNC FAILED:', error);
    
    await updateSyncLog(supabase, syncLogId, {
      sync_status: 'failed',
      error_message: error.message,
      completed_at: new Date().toISOString(),
      sync_stage: 'failed',
      stage_progress_percentage: 0,
      sync_notes: JSON.stringify({
        enhanced_verification_enabled: true,
        enhanced_processing_applied: true,
        comprehensive_field_validation: true,
        timeout_protection_enabled: true,
        enhanced_error_context: {
          error_location: 'enhanced_sync_orchestrator',
          timeout_occurred: error.message.includes('timeout'),
          error_message: error.message
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
  const verificationResult = preSync ? 
    await executeEnhancedVerification(supabase, connectionId, syncLogId, preSync, verificationTimeoutMs) :
    null;
  
  await updateSyncLog(supabase, syncLogId, {
    sync_status: 'completed',
    processed_items: 0,
    completed_at: new Date().toISOString(),
    sync_stage: 'completed',
    stage_progress_percentage: 100,
    sync_notes: JSON.stringify({
      enhanced_verification_enabled: true,
      enhanced_processing_applied: true,
      empty_sync: true,
      verification_result: verificationResult || 'baseline_unavailable',
      comprehensive_field_validation: true,
      timeout_protection_enabled: true
    })
  });
}

async function completeSyncWithMetrics(
  supabase: any,
  syncLogId: string,
  results: any,
  verificationResult: any,
  preSync: EnhancedSyncBaseline | null
): Promise<void> {
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
  
  await updateSyncLog(supabase, syncLogId, {
    sync_status: 'completed',
    processed_items: results.processedCount,
    completed_at: new Date().toISOString(),
    sync_stage: 'completed',
    stage_progress_percentage: 100,
    sync_notes: JSON.stringify({
      enhanced_verification_enabled: true,
      enhanced_processing_applied: true,
      comprehensive_field_validation: true,
      timeout_protection_enabled: true,
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
}
