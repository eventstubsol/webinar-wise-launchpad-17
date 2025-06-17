
import { updateSyncLog, updateSyncStage, updateWebinarParticipantSyncStatus, determineParticipantSyncStatus } from './database-operations.ts';
import { SyncOperation } from './types.ts';
import { syncWebinarParticipants } from './processors/participant-processor.ts';
import { 
  capturePreSyncBaseline, 
  verifySync, 
  determineEnhancedSyncStatus, 
  generateVerificationReport,
  type SyncBaseline,
  type VerificationResult 
} from './sync-verification.ts';

// Import refactored modules
import { 
  createValidationSummary, 
  validateWebinarData, 
  generateValidationReport,
  type SyncValidationSummary 
} from './processors/validation-summary.ts';
import { 
  mergeWebinarData, 
  deriveWebinarStatus, 
  validateDataIntegrity 
} from './processors/status-derivation.ts';
import { 
  determineFinalSyncStatus, 
  logSyncCompletion, 
  createSyncNotes 
} from './processors/sync-status-manager.ts';

export async function processSimpleWebinarSync(
  supabase: any,
  syncOperation: SyncOperation,
  connection: any,
  syncLogId: string
): Promise<void> {
  const debugMode = syncOperation.options?.debug || false;
  console.log(`Starting enhanced simple webinar sync with comprehensive verification for connection: ${connection.id}${debugMode ? ' (DEBUG MODE)' : ''}`);

  // Initialize enhanced tracking with verification capability
  let processedCount = 0;
  let successCount = 0;
  let skippedForParticipants = 0;
  let processedForParticipants = 0;
  let totalParticipantsSynced = 0;
  let insertCount = 0;
  let updateCount = 0;
  let preSync: SyncBaseline | null = null;
  let verificationResult: VerificationResult | null = null;
  
  // Initialize comprehensive validation summary
  const validationSummary: SyncValidationSummary = createValidationSummary();

  try {
    const zoomApi = await import('./zoom-api-client.ts');
    const client = await zoomApi.createZoomAPIClient(connection, supabase);
    
    // STEP 1: CAPTURE PRE-SYNC BASELINE FOR VERIFICATION
    console.log(`🔍 VERIFICATION: Capturing pre-sync baseline...`);
    await updateSyncStage(supabase, syncLogId, null, 'capturing_baseline', 5);
    
    try {
      preSync = await capturePreSyncBaseline(supabase, connection.id);
      console.log(`✅ VERIFICATION: Pre-sync baseline captured successfully`);
    } catch (baselineError) {
      console.error('Failed to capture pre-sync baseline:', baselineError);
      // Continue with sync but log the issue
      await updateSyncLog(supabase, syncLogId, {
        error_message: `Baseline capture failed: ${baselineError.message}`,
        sync_notes: JSON.stringify({
          verification_enabled: true,
          baseline_capture_failed: true,
          baseline_error: baselineError.message
        })
      });
    }
    
    await updateSyncStage(supabase, syncLogId, null, 'fetching_webinars', 10);
    
    const webinars = await client.listWebinarsWithRange({
      type: 'all'
    });
    
    console.log(`Found ${webinars.length} webinars to sync with enhanced verification`);
    
    if (webinars.length === 0) {
      // Run verification even for empty sync
      if (preSync) {
        await updateSyncStage(supabase, syncLogId, null, 'verifying_sync', 95);
        verificationResult = await verifySync(supabase, connection.id, preSync, syncLogId);
      }
      
      await updateSyncLog(supabase, syncLogId, {
        sync_status: 'completed',
        processed_items: 0,
        completed_at: new Date().toISOString(),
        sync_stage: 'completed',
        stage_progress_percentage: 100,
        sync_notes: JSON.stringify({
          verification_enabled: true,
          verification_result: verificationResult || 'baseline_unavailable',
          empty_sync: true
        })
      });
      return;
    }
    
    await updateSyncStage(supabase, syncLogId, null, 'processing_webinars', 20);
    
    const totalWebinars = webinars.length;
    
    // Process each webinar with enhanced validation
    for (const webinar of webinars) {
      try {
        const baseProgress = 20 + Math.round(((processedCount) / totalWebinars) * 60);
        
        await updateSyncStage(
          supabase, 
          syncLogId, 
          webinar.id?.toString(), 
          'processing_webinar', 
          baseProgress
        );
        
        console.log(`Processing webinar ${webinar.id} (${processedCount + 1}/${totalWebinars}) with enhanced validation`);
        
        // ENHANCED DEBUG: Log original webinar data from list
        console.log(`📊 ORIGINAL LIST DATA for webinar ${webinar.id}:`);
        console.log(`  - Status from list: ${webinar.status} (type: ${typeof webinar.status})`);
        console.log(`  - Type from list: ${webinar.type}`);
        console.log(`  - Start time from list: ${webinar.start_time}`);
        console.log(`  - Duration from list: ${webinar.duration}`);
        console.log(`  - Available fields: [${Object.keys(webinar).join(', ')}]`);
        
        // Get detailed webinar data
        const webinarDetails = await client.getWebinar(webinar.id);
        
        // ENHANCED DEBUG: Log detailed API response
        console.log(`📊 DETAILED API DATA for webinar ${webinar.id}:`);
        console.log(`  - Status from details: ${webinarDetails.status} (type: ${typeof webinarDetails.status})`);
        console.log(`  - Type from details: ${webinarDetails.type}`);
        console.log(`  - Start time from details: ${webinarDetails.start_time}`);
        console.log(`  - Duration from details: ${webinarDetails.duration}`);
        console.log(`  - Available fields: [${Object.keys(webinarDetails).join(', ')}]`);
        
        // ENHANCED: Merge original list data with detailed data to preserve status
        const mergedWebinarData = mergeWebinarData(webinar, webinarDetails);
        
        // ENHANCED: Derive status if still missing or invalid
        mergedWebinarData.status = deriveWebinarStatus(mergedWebinarData);
        
        // NEW: Data integrity validation before proceeding
        const isDataValid = validateDataIntegrity(mergedWebinarData, webinar.id);
        if (!isDataValid) {
          console.log(`❌ Data integrity check failed for webinar ${webinar.id}, skipping...`);
          processedCount++;
          continue;
        }
        
        // ENHANCED DEBUG: Log final merged data with detailed analysis
        console.log(`📊 FINAL MERGED DATA for webinar ${webinar.id}:`);
        console.log(`  - Final status: ${mergedWebinarData.status} (type: ${typeof mergedWebinarData.status})`);
        console.log(`  - Final type: ${mergedWebinarData.type}`);
        console.log(`  - Final start_time: ${mergedWebinarData.start_time}`);
        console.log(`  - Final duration: ${mergedWebinarData.duration}`);
        console.log(`  - Status derivation path: ${webinar.status} → ${webinarDetails.status} → ${mergedWebinarData.status}`);
        console.log(`  - Object keys: [${Object.keys(mergedWebinarData).join(', ')}]`);
        
        // Check if webinar already exists to track INSERT vs UPDATE
        const existingCheck = await supabase
          .from('zoom_webinars')
          .select('id')
          .eq('connection_id', connection.id)
          .eq('webinar_id', mergedWebinarData.id?.toString())
          .maybeSingle();
        
        const isNewWebinar = !existingCheck.data;
        
        // Determine initial participant sync status
        const initialParticipantSyncStatus = await determineParticipantSyncStatus(mergedWebinarData);
        
        // Use enhanced sync function from webinar-processor
        const { syncBasicWebinarData } = await import('./processors/webinar-processor.ts');
        const webinarDbId = await syncBasicWebinarData(supabase, mergedWebinarData, connection.id);
        
        // Track operation type for statistics
        if (isNewWebinar) {
          insertCount++;
          console.log(`✅ NEW webinar inserted: ${webinar.id} -> DB ID: ${webinarDbId}`);
        } else {
          updateCount++;
          console.log(`✅ EXISTING webinar updated: ${webinar.id} -> DB ID: ${webinarDbId} (data preserved)`);
        }

        // CRITICAL FIX: Enhanced debug logging RIGHT BEFORE participant sync
        console.log(`🚨 CRITICAL DEBUG: PRE-PARTICIPANT-SYNC VERIFICATION for webinar ${webinar.id}:`);
        console.log(`  - webinarDbId: ${webinarDbId}`);
        console.log(`  - mergedWebinarData is object: ${typeof mergedWebinarData === 'object'}`);
        console.log(`  - mergedWebinarData.status FINAL CHECK: '${mergedWebinarData.status}' (type: ${typeof mergedWebinarData.status})`);
        console.log(`  - mergedWebinarData.start_time: ${mergedWebinarData.start_time}`);
        console.log(`  - mergedWebinarData.id: ${mergedWebinarData.id}`);
        console.log(`  - mergedWebinarData.duration: ${mergedWebinarData.duration}`);
        console.log(`  - mergedWebinarData.registration_url: ${mergedWebinarData.registration_url}`);
        console.log(`  - mergedWebinarData stringified: ${JSON.stringify({ status: mergedWebinarData.status, id: mergedWebinarData.id, start_time: mergedWebinarData.start_time }, null, 2)}`);
        console.log(`  - debugMode: ${debugMode}`);

        // Create a deep clone to ensure no reference issues
        const webinarDataForParticipants = JSON.parse(JSON.stringify(mergedWebinarData));
        
        console.log(`🔍 CLONED DATA CHECK: status = '${webinarDataForParticipants.status}' (type: ${typeof webinarDataForParticipants.status})`);

        // Sync participants with eligibility check and enhanced validation
        let participantResult = { skipped: true, reason: 'Not attempted', count: 0 };
        try {
          await updateSyncStage(
            supabase, 
            syncLogId, 
            webinar.id?.toString(), 
            'syncing_participants', 
            baseProgress + 10
          );
          
          participantResult = await syncWebinarParticipants(
            supabase, 
            client, 
            webinar.id, 
            webinarDbId,
            webinarDataForParticipants, // Pass cloned data with preserved status
            debugMode
          );
          
          if (participantResult.skipped) {
            skippedForParticipants++;
            console.log(`Skipped participant sync for webinar ${webinar.id}: ${participantResult.reason}`);
          } else {
            processedForParticipants++;
            totalParticipantsSynced += participantResult.count;
            console.log(`Successfully synced ${participantResult.count} participants for webinar ${webinar.id}`);
          }
          
        } catch (participantError) {
          console.error(`Error syncing participants for webinar ${webinar.id}:`, participantError);
          participantResult = { 
            skipped: true, 
            reason: `Sync error: ${participantError.message}`, 
            count: 0 
          };
          // Continue with next webinar even if participant sync fails
        }

        // ENHANCED VALIDATION: Validate webinar data after sync
        validateWebinarData(webinarDataForParticipants, participantResult, validationSummary);
        
        successCount++;
        processedCount++;
        
      } catch (webinarError) {
        console.error(`Error processing webinar ${webinar.id}:`, webinarError);
        
        // Add validation error for failed webinar processing
        validationSummary.validationErrors.push({
          webinarId: webinar.id?.toString() || 'unknown',
          type: 'webinar_processing_failed',
          message: `Failed to process webinar: ${webinarError.message}`,
          severity: 'error'
        });
        
        processedCount++;
        // Continue with next webinar
      }
    }
    
    await updateSyncStage(supabase, syncLogId, null, 'completing', 80);
    
    // STEP 2: RUN COMPREHENSIVE VERIFICATION
    console.log(`🔍 VERIFICATION: Running comprehensive sync verification...`);
    await updateSyncStage(supabase, syncLogId, null, 'verifying_sync', 90);
    
    if (preSync) {
      try {
        verificationResult = await verifySync(supabase, connection.id, preSync, syncLogId);
        console.log(`✅ VERIFICATION: Sync verification completed`);
      } catch (verificationError) {
        console.error('Sync verification failed:', verificationError);
        // Continue with sync completion but log verification failure
      }
    } else {
      console.warn('⚠️ VERIFICATION: Skipping verification due to missing baseline');
    }
    
    // STEP 3: DETERMINE ENHANCED STATUS BASED ON VERIFICATION
    const preliminaryStatus = determineFinalSyncStatus(validationSummary, processedCount, successCount);
    const finalStatus = verificationResult 
      ? determineEnhancedSyncStatus(preliminaryStatus, verificationResult, processedCount, successCount)
      : preliminaryStatus;
    
    // STEP 4: GENERATE COMPREHENSIVE REPORTS
    const validationReport = generateValidationReport(validationSummary);
    const verificationReport = verificationResult 
      ? generateVerificationReport(verificationResult)
      : 'Verification report unavailable - baseline capture failed';
    
    console.log(validationReport);
    console.log(verificationReport);
    
    // Enhanced completion logging with verification summary
    logSyncCompletion(
      totalWebinars,
      successCount,
      processedCount,
      insertCount,
      updateCount,
      processedForParticipants,
      skippedForParticipants,
      totalParticipantsSynced,
      finalStatus,
      validationSummary,
      verificationResult
    );
    
    // Enhanced sync log with comprehensive verification data
    await updateSyncLog(supabase, syncLogId, {
      sync_status: finalStatus,
      processed_items: processedCount,
      total_participants: totalParticipantsSynced,
      completed_at: new Date().toISOString(),
      sync_stage: 'completed',
      stage_progress_percentage: 100,
      // Store enhanced verification summary in sync_notes
      sync_notes: JSON.stringify(createSyncNotes(
        insertCount,
        updateCount,
        processedForParticipants,
        skippedForParticipants,
        validationSummary,
        verificationResult,
        preSync
      ))
    });
    
    console.log(`✅ Enhanced sync with verification completed. Status: ${finalStatus}`);
    console.log(`📊 ${insertCount} new webinars inserted, ${updateCount} existing webinars updated (with data preservation), ${totalParticipantsSynced} participants synced.`);
    
    if (finalStatus !== 'completed') {
      console.log(`⚠️ Sync completed with issues. Check verification and validation reports above for details.`);
    }
    
    if (verificationResult && !verificationResult.passed) {
      console.log(`🚨 VERIFICATION FAILED: Data integrity issues detected!`);
      if (verificationResult.hasDataLoss) {
        console.log(`💥 CRITICAL: Data loss detected during sync - immediate investigation required!`);
      }
    }
    
  } catch (error) {
    console.error('Enhanced simple webinar sync with verification failed:', error);
    
    // Add critical error to validation summary
    validationSummary.validationErrors.push({
      webinarId: 'sync_process',
      type: 'critical_sync_failure',
      message: `Critical sync failure: ${error.message}`,
      severity: 'error'
    });
    
    await updateSyncLog(supabase, syncLogId, {
      sync_status: 'failed',
      processed_items: processedCount,
      total_participants: totalParticipantsSynced,
      error_message: error.message,
      completed_at: new Date().toISOString(),
      sync_stage: 'failed',
      stage_progress_percentage: 0,
      sync_notes: JSON.stringify(createSyncNotes(
        insertCount,
        updateCount,
        processedForParticipants,
        skippedForParticipants,
        validationSummary,
        verificationResult,
        preSync
      ))
    });
    
    throw error;
  }
}
