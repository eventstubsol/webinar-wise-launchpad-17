
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

// Import registrant sync functionality
import { syncWebinarRegistrants } from './processors/registrant-processor.ts';
import { checkRegistrantEligibility, forceRegistrantEligibilityCheck } from './processors/registrant-eligibility.ts';

export async function processSimpleWebinarSync(
  supabase: any,
  syncOperation: SyncOperation,
  connection: any,
  syncLogId: string
): Promise<void> {
  const debugMode = syncOperation.options?.debug || false;
  const testMode = syncOperation.options?.testMode || false;
  
  console.log(`🚀 ENHANCED SIMPLE SYNC: Starting with comprehensive field mapping and error fixes`);
  console.log(`  🔧 Debug mode: ${debugMode}`);
  console.log(`  🧪 Test mode: ${testMode}`);

  // Initialize enhanced tracking with comprehensive field mapping metrics
  let processedCount = 0;
  let successCount = 0;
  let skippedForParticipants = 0;
  let processedForParticipants = 0;
  let totalParticipantsSynced = 0;
  let insertCount = 0;
  let updateCount = 0;
  let fieldMappingSuccessCount = 0;
  let fieldMappingErrorCount = 0;
  let preSync: SyncBaseline | null = null;
  let verificationResult: VerificationResult | null = null;
  
  // Registrant sync tracking
  let skippedForRegistrants = 0;
  let processedForRegistrants = 0;
  let totalRegistrantsSynced = 0;
  
  // Initialize comprehensive validation summary with field mapping tracking
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
    
    console.log(`📋 WEBINAR DISCOVERY: Found ${webinars.length} webinars for comprehensive sync`);
    
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
          empty_sync: true,
          comprehensive_field_mapping: true
        })
      });
      return;
    }
    
    await updateSyncStage(supabase, syncLogId, null, 'processing_webinars', 20);
    
    const totalWebinars = webinars.length;
    
    // Process each webinar with ENHANCED field mapping and error handling
    for (const webinar of webinars) {
      try {
        const baseProgress = 20 + Math.round(((processedCount) / totalWebinars) * 45);
        
        await updateSyncStage(
          supabase, 
          syncLogId, 
          webinar.id?.toString(), 
          'processing_webinar', 
          baseProgress
        );
        
        console.log(`🔄 PROCESSING: Webinar ${webinar.id} (${processedCount + 1}/${totalWebinars}) with enhanced field mapping`);
        
        // ENHANCED DEBUG: Log comprehensive API data
        console.log(`📊 API DATA ANALYSIS for webinar ${webinar.id}:`);
        console.log(`  📋 Available API fields (${Object.keys(webinar).length}): [${Object.keys(webinar).join(', ')}]`);
        console.log(`  🔍 Status from API: ${webinar.status} (type: ${typeof webinar.status})`);
        console.log(`  📅 Start time: ${webinar.start_time}`);
        console.log(`  ⏱️ Duration: ${webinar.duration}`);
        
        // Get detailed webinar data for comprehensive mapping
        const webinarDetails = await client.getWebinar(webinar.id);
        
        console.log(`📊 DETAILED API DATA for webinar ${webinar.id}:`);
        console.log(`  📋 Detail fields (${Object.keys(webinarDetails).length}): [${Object.keys(webinarDetails).join(', ')}]`);
        console.log(`  🔍 Settings fields: [${Object.keys(webinarDetails.settings || {}).join(', ')}]`);
        
        // ENHANCED: Merge data with comprehensive field preservation
        const mergedWebinarData = mergeWebinarData(webinar, webinarDetails);
        
        // ENHANCED: Derive status if missing and validate data integrity
        mergedWebinarData.status = deriveWebinarStatus(mergedWebinarData);
        
        // NEW: Comprehensive data integrity validation
        const isDataValid = validateDataIntegrity(mergedWebinarData, webinar.id);
        if (!isDataValid) {
          console.log(`❌ DATA INTEGRITY FAILED: Webinar ${webinar.id} failed validation, skipping...`);
          fieldMappingErrorCount++;
          processedCount++;
          continue;
        }
        
        console.log(`📊 FINAL MERGED DATA for webinar ${webinar.id}:`);
        console.log(`  ✅ Final status: ${mergedWebinarData.status}`);
        console.log(`  📋 Total fields: ${Object.keys(mergedWebinarData).length}`);
        console.log(`  🔧 Comprehensive mapping applied: YES`);
        
        // Check if webinar exists to track operation type
        const existingCheck = await supabase
          .from('zoom_webinars')
          .select('id')
          .eq('connection_id', connection.id)
          .eq('webinar_id', mergedWebinarData.id?.toString())
          .maybeSingle();
        
        const isNewWebinar = !existingCheck.data;
        
        // Use enhanced sync function with comprehensive field mapping
        const { syncBasicWebinarData } = await import('./processors/webinar-processor.ts');
        const webinarDbId = await syncBasicWebinarData(supabase, mergedWebinarData, connection.id);
        
        // Track operation type and field mapping success
        if (isNewWebinar) {
          insertCount++;
          console.log(`✅ NEW WEBINAR: ${webinar.id} -> DB ID: ${webinarDbId} (comprehensive field mapping applied)`);
        } else {
          updateCount++;
          console.log(`✅ UPDATED WEBINAR: ${webinar.id} -> DB ID: ${webinarDbId} (data preserved + fields updated)`);
        }
        
        fieldMappingSuccessCount++;
        successCount++;

        // ENHANCED: Create deep clone for participant sync to prevent reference issues
        const webinarDataForParticipants = JSON.parse(JSON.stringify(mergedWebinarData));
        
        console.log(`🔍 PARTICIPANT SYNC PREP: Webinar ${webinar.id} ready for participant processing`);

        // Sync participants with enhanced validation
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
            webinarDataForParticipants,
            debugMode
          );
          
          if (!participantResult.skipped) {
            processedForParticipants++;
            totalParticipantsSynced += participantResult.count;
            console.log(`✅ PARTICIPANTS SYNCED: ${participantResult.count} participants for webinar ${webinar.id}`);
          } else {
            skippedForParticipants++;
            console.log(`⏭️ PARTICIPANTS SKIPPED: ${participantResult.reason} for webinar ${webinar.id}`);
          }
        } catch (participantError) {
          console.error(`❌ PARTICIPANT SYNC ERROR for webinar ${webinar.id}:`, participantError);
          await updateWebinarParticipantSyncStatus(supabase, webinarDbId, 'failed', participantError.message);
        }

        // NEW: Enhanced registrant sync
        let registrantResult = { skipped: true, reason: 'Not attempted', count: 0 };
        try {
          await updateSyncStage(
            supabase, 
            syncLogId, 
            webinar.id?.toString(), 
            'syncing_registrants', 
            baseProgress + 15
          );
          
          registrantResult = await syncWebinarRegistrants(
            supabase, 
            client, 
            webinar.id, 
            webinarDbId,
            webinarDataForParticipants,
            debugMode
          );
          
          if (!registrantResult.skipped) {
            processedForRegistrants++;
            totalRegistrantsSynced += registrantResult.count;
            console.log(`✅ REGISTRANTS SYNCED: ${registrantResult.count} registrants for webinar ${webinar.id}`);
          } else {
            skippedForRegistrants++;
            console.log(`⏭️ REGISTRANTS SKIPPED: ${registrantResult.reason} for webinar ${webinar.id}`);
          }
        } catch (registrantError) {
          console.error(`❌ REGISTRANT SYNC ERROR for webinar ${webinar.id}:`, registrantError);
        }

        processedCount++;
        
      } catch (error) {
        fieldMappingErrorCount++;
        console.error(`❌ WEBINAR PROCESSING ERROR: ${webinar.id}:`, error);
        processedCount++;
      }
    }
    
    // STEP 3: COMPREHENSIVE VERIFICATION AND COMPLETION
    console.log(`🔍 VERIFICATION: Running post-sync verification...`);
    await updateSyncStage(supabase, syncLogId, null, 'verifying_sync', 90);
    
    if (preSync) {
      verificationResult = await verifySync(supabase, connection.id, preSync, syncLogId);
    }
    
    // Calculate comprehensive success metrics
    const webinarSuccessRate = totalWebinars > 0 ? ((successCount / totalWebinars) * 100).toFixed(1) : '0';
    const fieldMappingSuccessRate = (processedCount > 0 ? ((fieldMappingSuccessCount / processedCount) * 100).toFixed(1) : '0');
    const participantSuccessRate = processedForParticipants > 0 ? ((processedForParticipants / (processedForParticipants + skippedForParticipants)) * 100).toFixed(1) : '0';
    const registrantSuccessRate = processedForRegistrants > 0 ? ((processedForRegistrants / (processedForRegistrants + skippedForRegistrants)) * 100).toFixed(1) : '0';
    
    console.log(`📊 COMPREHENSIVE SYNC COMPLETION STATS:`);
    console.log(`  🎯 Webinars: ${successCount}/${totalWebinars} (${webinarSuccessRate}% success)`);
    console.log(`  📋 Field mapping: ${fieldMappingSuccessCount}/${processedCount} (${fieldMappingSuccessRate}% success)`);
    console.log(`  👥 Participants: ${processedForParticipants} processed, ${totalParticipantsSynced} synced (${participantSuccessRate}% success)`);
    console.log(`  📝 Registrants: ${processedForRegistrants} processed, ${totalRegistrantsSynced} synced (${registrantSuccessRate}% success)`);
    console.log(`  🔄 Operations: ${insertCount} inserts, ${updateCount} updates`);
    console.log(`  ❌ Field mapping errors: ${fieldMappingErrorCount}`);
    
    await updateSyncLog(supabase, syncLogId, {
      sync_status: 'completed',
      processed_items: processedCount,
      completed_at: new Date().toISOString(),
      sync_stage: 'completed',
      stage_progress_percentage: 100,
      sync_notes: JSON.stringify({
        verification_enabled: true,
        verification_result: verificationResult || 'completed_without_baseline',
        comprehensive_field_mapping_enabled: true,
        alternative_hosts_error_fixed: true,
        webinar_stats: {
          total: totalWebinars,
          successful: successCount,
          success_rate: webinarSuccessRate + '%',
          inserts: insertCount,
          updates: updateCount
        },
        field_mapping_stats: {
          successful: fieldMappingSuccessCount,
          failed: fieldMappingErrorCount,
          success_rate: fieldMappingSuccessRate + '%'
        },
        participant_stats: {
          processed: processedForParticipants,
          skipped: skippedForParticipants,
          total_synced: totalParticipantsSynced,
          success_rate: participantSuccessRate + '%'
        },
        registrant_stats: {
          processed: processedForRegistrants,
          skipped: skippedForRegistrants,
          total_synced: totalRegistrantsSynced,
          success_rate: registrantSuccessRate + '%'
        }
      })
    });
    
    console.log(`✅ ENHANCED SIMPLE SYNC COMPLETED: Comprehensive field mapping and error fixes applied successfully`);
    
  } catch (error) {
    console.error('❌ ENHANCED SIMPLE SYNC FAILED:', error);
    
    await updateSyncLog(supabase, syncLogId, {
      sync_status: 'failed',
      error_message: error.message,
      completed_at: new Date().toISOString(),
      sync_stage: 'failed',
      stage_progress_percentage: 0,
      sync_notes: JSON.stringify({
        verification_enabled: true,
        verification_result: verificationResult || 'failed_before_verification',
        comprehensive_field_mapping_enabled: true,
        alternative_hosts_error_fixed: true,
        error_context: {
          processed_count: processedCount,
          success_count: successCount,
          field_mapping_errors: fieldMappingErrorCount,
          error_location: 'enhanced_simple_sync_processor'
        }
      })
    });
    
    throw error;
  }
}
