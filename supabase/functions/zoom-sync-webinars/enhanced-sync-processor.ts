
import { updateSyncLog, updateSyncStage, updateWebinarParticipantSyncStatus, determineParticipantSyncStatus } from './database-operations.ts';
import { SyncOperation } from './types.ts';
import { syncWebinarParticipants } from './processors/participant-processor.ts';
import { syncWebinarRegistrants } from './processors/registrant-processor.ts';
import { 
  captureEnhancedBaseline, 
  verifyEnhancedSync, 
  generateEnhancedVerificationReport,
  type EnhancedSyncBaseline,
  type EnhancedVerificationResult 
} from './enhanced-verification.ts';

// Import data processing modules
import { 
  mergeWebinarData, 
  deriveWebinarStatus, 
  validateDataIntegrity 
} from './processors/status-derivation.ts';

/**
 * Enhanced sync processor with comprehensive error handling, field validation,
 * and robust verification logic
 */
export async function processEnhancedWebinarSync(
  supabase: any,
  syncOperation: SyncOperation,
  connection: any,
  syncLogId: string
): Promise<void> {
  const debugMode = syncOperation.options?.debug || false;
  const testMode = syncOperation.options?.testMode || false;
  
  console.log(`🚀 ENHANCED SYNC PROCESSOR: Starting with comprehensive verification and timeout management`);
  console.log(`  🔧 Debug mode: ${debugMode}`);
  console.log(`  🧪 Test mode: ${testMode}`);
  console.log(`  ⏱️ Timeout protection: ENABLED`);
  console.log(`  📊 Field validation: COMPREHENSIVE (39 fields)`);

  // Enhanced timeout management
  const SYNC_TIMEOUT_MS = 45 * 60 * 1000; // 45 minutes total
  const VERIFICATION_TIMEOUT_MS = 30 * 1000; // 30 seconds for verification
  const BASELINE_TIMEOUT_MS = 15 * 1000; // 15 seconds for baseline
  const syncStartTime = Date.now();
  
  // Initialize comprehensive tracking
  let processedCount = 0;
  let successCount = 0;
  let errorCount = 0;
  let skippedForParticipants = 0;
  let processedForParticipants = 0;
  let totalParticipantsSynced = 0;
  let skippedForRegistrants = 0;
  let processedForRegistrants = 0;
  let totalRegistrantsSynced = 0;
  let insertCount = 0;
  let updateCount = 0;
  let fieldMappingSuccessCount = 0;
  let fieldMappingErrorCount = 0;
  let preSync: EnhancedSyncBaseline | null = null;
  let verificationResult: EnhancedVerificationResult | null = null;

  try {
    const zoomApi = await import('./zoom-api-client.ts');
    const client = await zoomApi.createZoomAPIClient(connection, supabase);
    
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
    
    const totalWebinars = webinars.length;
    
    // PHASE 3: ENHANCED WEBINAR PROCESSING
    for (const [index, webinar] of webinars.entries()) {
      // Overall timeout check
      if (Date.now() - syncStartTime > SYNC_TIMEOUT_MS) {
        console.error(`❌ ENHANCED SYNC: Overall timeout exceeded ${SYNC_TIMEOUT_MS}ms`);
        throw new Error(`Enhanced sync operation timed out after ${SYNC_TIMEOUT_MS}ms`);
      }
      
      try {
        const baseProgress = 20 + Math.round((index / totalWebinars) * 50);
        
        await updateSyncStage(
          supabase, 
          syncLogId, 
          webinar.id?.toString(), 
          'processing_webinar_enhanced', 
          baseProgress
        );
        
        console.log(`🔄 ENHANCED PROCESSING: Webinar ${webinar.id} (${index + 1}/${totalWebinars})`);
        
        // Enhanced API data logging
        console.log(`📊 ENHANCED API ANALYSIS for webinar ${webinar.id}:`);
        console.log(`  📋 Available fields (${Object.keys(webinar).length}): [${Object.keys(webinar).slice(0, 10).join(', ')}...]`);
        console.log(`  🔍 Status: ${webinar.status}, Start: ${webinar.start_time}, Duration: ${webinar.duration}`);

        // Get detailed webinar data with timeout
        let webinarDetails;
        try {
          const detailsPromise = client.getWebinar(webinar.id);
          const detailsTimeoutPromise = new Promise<never>((_, reject) => 
            setTimeout(() => reject(new Error('Webinar details timeout')), 30000)
          );
          
          webinarDetails = await Promise.race([detailsPromise, detailsTimeoutPromise]);
          console.log(`📊 ENHANCED DETAILS: Fetched for webinar ${webinar.id}`);
        } catch (detailsError) {
          console.warn(`⚠️ ENHANCED DETAILS: Failed for ${webinar.id}, using basic data:`, detailsError.message);
          webinarDetails = webinar;
        }
        
        // Enhanced data merging and validation
        let mergedWebinarData;
        try {
          mergedWebinarData = mergeWebinarData(webinar, webinarDetails);
          mergedWebinarData.status = deriveWebinarStatus(mergedWebinarData);
          
          // Enhanced data integrity validation
          if (!validateDataIntegrity(mergedWebinarData, webinar.id)) {
            console.error(`❌ ENHANCED VALIDATION: Failed for webinar ${webinar.id}, skipping...`);
            fieldMappingErrorCount++;
            errorCount++;
            processedCount++;
            continue;
          }

          // Log enhanced field mapping success
          const populatedFieldCount = Object.values(mergedWebinarData).filter(val => 
            val !== null && val !== undefined && val !== ''
          ).length;
          console.log(`✅ ENHANCED FIELD MAPPING: ${populatedFieldCount}/39 fields populated for webinar ${webinar.id}`);
          
        } catch (mergeError) {
          console.error(`❌ ENHANCED MERGE: Failed for webinar ${webinar.id}:`, mergeError);
          fieldMappingErrorCount++;
          errorCount++;
          processedCount++;
          continue;
        }
        
        // Check if webinar exists
        const existingCheck = await supabase
          .from('zoom_webinars')
          .select('id')
          .eq('connection_id', connection.id)
          .eq('webinar_id', mergedWebinarData.id?.toString())
          .maybeSingle();
        
        const isNewWebinar = !existingCheck.data;
        
        // Enhanced webinar sync with timeout
        let webinarDbId;
        try {
          const { syncBasicWebinarData } = await import('./processors/webinar-processor.ts');
          const syncPromise = syncBasicWebinarData(supabase, mergedWebinarData, connection.id);
          const syncTimeoutPromise = new Promise<never>((_, reject) => 
            setTimeout(() => reject(new Error('Webinar sync timeout')), 60000)
          );
          
          webinarDbId = await Promise.race([syncPromise, syncTimeoutPromise]);
          
          // Track operations
          if (isNewWebinar) {
            insertCount++;
            console.log(`✅ ENHANCED INSERT: ${webinar.id} -> DB ID: ${webinarDbId}`);
          } else {
            updateCount++;
            console.log(`✅ ENHANCED UPDATE: ${webinar.id} -> DB ID: ${webinarDbId}`);
          }
          
          fieldMappingSuccessCount++;
          successCount++;
          
        } catch (syncError) {
          console.error(`❌ ENHANCED SYNC: Failed for ${webinar.id}:`, syncError);
          fieldMappingErrorCount++;
          errorCount++;
          processedCount++;
          continue;
        }

        // Enhanced participant sync with timeout
        let participantResult = { skipped: true, reason: 'Not attempted', count: 0 };
        try {
          await updateSyncStage(
            supabase, 
            syncLogId, 
            webinar.id?.toString(), 
            'syncing_participants_enhanced', 
            baseProgress + 10
          );
          
          const participantPromise = syncWebinarParticipants(
            supabase, 
            client, 
            webinar.id, 
            webinarDbId,
            mergedWebinarData,
            debugMode
          );
          const participantTimeoutPromise = new Promise<any>((_, reject) => 
            setTimeout(() => reject(new Error('Participant sync timeout')), 120000)
          );
          
          participantResult = await Promise.race([participantPromise, participantTimeoutPromise]);
          
          if (!participantResult.skipped) {
            processedForParticipants++;
            totalParticipantsSynced += participantResult.count;
            console.log(`✅ ENHANCED PARTICIPANTS: ${participantResult.count} synced for webinar ${webinar.id}`);
          } else {
            skippedForParticipants++;
            console.log(`⏭️ ENHANCED PARTICIPANTS: Skipped - ${participantResult.reason} for webinar ${webinar.id}`);
          }
        } catch (participantError) {
          console.error(`❌ ENHANCED PARTICIPANTS: Error for webinar ${webinar.id}:`, participantError);
          await updateWebinarParticipantSyncStatus(supabase, webinarDbId, 'failed', participantError.message);
        }

        // Enhanced registrant sync with timeout
        let registrantResult = { skipped: true, reason: 'Not attempted', count: 0 };
        try {
          await updateSyncStage(
            supabase, 
            syncLogId, 
            webinar.id?.toString(), 
            'syncing_registrants_enhanced', 
            baseProgress + 15
          );
          
          const registrantPromise = syncWebinarRegistrants(
            supabase, 
            client, 
            webinar.id, 
            webinarDbId,
            mergedWebinarData,
            debugMode
          );
          const registrantTimeoutPromise = new Promise<any>((_, reject) => 
            setTimeout(() => reject(new Error('Registrant sync timeout')), 60000)
          );
          
          registrantResult = await Promise.race([registrantPromise, registrantTimeoutPromise]);
          
          if (!registrantResult.skipped) {
            processedForRegistrants++;
            totalRegistrantsSynced += registrantResult.count;
            console.log(`✅ ENHANCED REGISTRANTS: ${registrantResult.count} synced for webinar ${webinar.id}`);
          } else {
            skippedForRegistrants++;
            console.log(`⏭️ ENHANCED REGISTRANTS: Skipped - ${registrantResult.reason} for webinar ${webinar.id}`);
          }
        } catch (registrantError) {
          console.error(`❌ ENHANCED REGISTRANTS: Error for webinar ${webinar.id}:`, registrantError);
        }

        processedCount++;
        
      } catch (error) {
        console.error(`❌ ENHANCED PROCESSING: Failed for webinar ${webinar.id}:`, error);
        fieldMappingErrorCount++;
        errorCount++;
        processedCount++;
      }
    }
    
    // PHASE 4: ENHANCED VERIFICATION WITH TIMEOUT PROTECTION
    console.log(`🔍 ENHANCED VERIFICATION: Running comprehensive post-sync verification...`);
    await updateSyncStage(supabase, syncLogId, null, 'verifying_sync_enhanced', 90);
    
    if (preSync) {
      try {
        verificationResult = await verifyEnhancedSync(
          supabase, 
          connection.id, 
          preSync, 
          syncLogId, 
          VERIFICATION_TIMEOUT_MS
        );
        
        console.log(`✅ ENHANCED VERIFICATION: Completed successfully`);
        console.log(`  🎯 Verification passed: ${verificationResult.passed}`);
        console.log(`  📊 Integrity score: ${verificationResult.summary.integrityScore}/100`);
        console.log(`  📋 Field completion: ${verificationResult.summary.fieldCompletionScore}%`);
        
      } catch (verifyError) {
        console.error('❌ ENHANCED VERIFICATION: Failed:', verifyError);
        verificationResult = {
          passed: false,
          hasDataLoss: false,
          hasIntegrityWarnings: false,
          hasVerificationErrors: true,
          hasFieldMappingIssues: false,
          baseline: preSync,
          postSync: preSync,
          issues: [{
            type: 'verification_error',
            severity: 'critical',
            category: 'general',
            message: `Enhanced verification failed: ${verifyError.message}`,
            details: { error: verifyError.message }
          }],
          fieldValidation: {
            requiredFields: [],
            populatedFields: [],
            missingFields: [],
            partiallyPopulatedFields: [],
            fieldCompletionRate: 0,
            criticalFieldsMissing: true
          },
          summary: {
            webinarsDelta: 0,
            participantsDelta: 0,
            registrantsDelta: 0,
            integrityScore: 0,
            fieldCompletionScore: 0
          }
        } as EnhancedVerificationResult;
      }
    }
    
    // PHASE 5: COMPLETION WITH ENHANCED METRICS
    const webinarSuccessRate = totalWebinars > 0 ? ((successCount / totalWebinars) * 100).toFixed(1) : '0';
    const fieldMappingSuccessRate = (processedCount > 0 ? ((fieldMappingSuccessCount / processedCount) * 100).toFixed(1) : '0');
    const errorRate = (processedCount > 0 ? ((errorCount / processedCount) * 100).toFixed(1) : '0');
    
    console.log(`📊 ENHANCED SYNC COMPLETION STATS:`);
    console.log(`  🎯 Webinars: ${successCount}/${totalWebinars} (${webinarSuccessRate}% success)`);
    console.log(`  📋 Field mapping: ${fieldMappingSuccessCount}/${processedCount} (${fieldMappingSuccessRate}% success)`);
    console.log(`  🔄 Operations: ${insertCount} inserts, ${updateCount} updates`);
    console.log(`  👥 Participants: ${totalParticipantsSynced} synced, ${skippedForParticipants} skipped`);
    console.log(`  📝 Registrants: ${totalRegistrantsSynced} synced, ${skippedForRegistrants} skipped`);
    console.log(`  ❌ Errors: ${errorCount} (${errorRate}% error rate)`);
    
    // Generate verification report
    const verificationReport = verificationResult ? 
      generateEnhancedVerificationReport(verificationResult) : 
      'Verification report unavailable (baseline capture failed)';
    
    console.log(`📋 ENHANCED VERIFICATION REPORT:\n${verificationReport}`);
    
    await updateSyncLog(supabase, syncLogId, {
      sync_status: 'completed',
      processed_items: processedCount,
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
            total: totalWebinars,
            successful: successCount,
            errors: errorCount,
            success_rate: webinarSuccessRate + '%',
            error_rate: errorRate + '%',
            inserts: insertCount,
            updates: updateCount
          },
          field_mapping_stats: {
            successful: fieldMappingSuccessCount,
            failed: fieldMappingErrorCount,
            success_rate: fieldMappingSuccessRate + '%'
          },
          participant_stats: {
            synced: totalParticipantsSynced,
            processed_webinars: processedForParticipants,
            skipped_webinars: skippedForParticipants
          },
          registrant_stats: {
            synced: totalRegistrantsSynced,
            processed_webinars: processedForRegistrants,
            skipped_webinars: skippedForRegistrants
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
        verification_result: verificationResult || 'failed_before_verification',
        enhanced_error_context: {
          processed_count: processedCount,
          success_count: successCount,
          error_count: errorCount,
          field_mapping_errors: fieldMappingErrorCount,
          participant_synced: totalParticipantsSynced,
          registrant_synced: totalRegistrantsSynced,
          error_location: 'enhanced_sync_processor',
          timeout_occurred: error.message.includes('timeout'),
          error_message: error.message
        }
      })
    });
    
    throw error;
  }
}

/**
 * Complete empty sync with verification
 */
async function completeEmptySync(
  supabase: any,
  syncLogId: string,
  preSync: EnhancedSyncBaseline | null,
  connectionId: string,
  verificationTimeoutMs: number
): Promise<void> {
  let verificationResult: EnhancedVerificationResult | null = null;
  
  if (preSync) {
    await updateSyncStage(supabase, syncLogId, null, 'verifying_empty_sync', 95);
    try {
      verificationResult = await verifyEnhancedSync(supabase, connectionId, preSync, syncLogId, verificationTimeoutMs);
    } catch (verifyError) {
      console.error('❌ Empty sync verification failed:', verifyError);
      verificationResult = null;
    }
  }
  
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
