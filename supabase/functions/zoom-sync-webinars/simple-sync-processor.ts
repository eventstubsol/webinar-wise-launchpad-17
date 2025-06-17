
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

// Enhanced validation and summary tracking interface
interface SyncValidationSummary {
  webinarsWithRegistrants: number;
  webinarsWithParticipants: number;
  webinarsWithZeroRegistrants: string[];
  webinarsWithZeroParticipants: string[];
  failedRegistrantSyncs: string[];
  failedParticipantSyncs: string[];
  validationWarnings: Array<{
    webinarId: string;
    type: string;
    message: string;
    severity: 'warning' | 'error';
  }>;
  validationErrors: Array<{
    webinarId: string;
    type: string;
    message: string;
    severity: 'warning' | 'error';
  }>;
}

interface WebinarValidationContext {
  webinarId: string;
  title: string;
  status: string;
  startTime: Date | null;
  registrationRequired: boolean;
  registrantCount: number;
  attendeeCount: number;
}

function validateWebinarData(
  webinarData: any,
  participantResult: any,
  summary: SyncValidationSummary
): void {
  const context: WebinarValidationContext = {
    webinarId: webinarData.id?.toString() || 'unknown',
    title: webinarData.topic || 'Unknown Webinar',
    status: webinarData.status?.toLowerCase() || 'unknown',
    startTime: webinarData.start_time ? new Date(webinarData.start_time) : null,
    registrationRequired: !!webinarData.registration_url,
    registrantCount: 0, // Will be updated after registrant sync
    attendeeCount: participantResult?.count || 0
  };

  const now = new Date();
  const fiveMinutesAgo = new Date(now.getTime() - (5 * 60 * 1000));
  const isPastWebinar = context.startTime && context.startTime < now;
  const isEndedWebinar = ['ended', 'finished'].includes(context.status);
  const isRecentWebinar = context.startTime && context.startTime > fiveMinutesAgo;

  console.log(`🔍 Validating webinar ${context.webinarId}: ${context.title}`);
  console.log(`  - Status: ${context.status}`);
  console.log(`  - Start time: ${context.startTime?.toISOString() || 'N/A'}`);
  console.log(`  - Past webinar: ${isPastWebinar}`);
  console.log(`  - Ended webinar: ${isEndedWebinar}`);
  console.log(`  - Registration required: ${context.registrationRequired}`);
  console.log(`  - Attendee count: ${context.attendeeCount}`);

  // Validate participant data
  if (participantResult?.count > 0) {
    summary.webinarsWithParticipants++;
    console.log(`✅ Webinar ${context.webinarId} has ${participantResult.count} participants`);
  } else {
    summary.webinarsWithZeroParticipants.push(context.webinarId);
    
    if (isEndedWebinar && !isRecentWebinar) {
      const error = {
        webinarId: context.webinarId,
        type: 'zero_participants_ended_webinar',
        message: `Ended webinar "${context.title}" has no participants - likely sync failure`,
        severity: 'error' as const
      };
      summary.validationErrors.push(error);
      console.log(`❌ VALIDATION ERROR: ${error.message}`);
    } else if (isPastWebinar && !isRecentWebinar) {
      const warning = {
        webinarId: context.webinarId,
        type: 'zero_participants_past_webinar',
        message: `Past webinar "${context.title}" has no participants - may indicate low attendance or sync issue`,
        severity: 'warning' as const
      };
      summary.validationWarnings.push(warning);
      console.log(`⚠️ VALIDATION WARNING: ${warning.message}`);
    }
  }

  // Track failed participant syncs
  if (participantResult?.skipped && participantResult.reason?.includes('error')) {
    summary.failedParticipantSyncs.push(context.webinarId);
    const error = {
      webinarId: context.webinarId,
      type: 'participant_sync_failed',
      message: `Participant sync failed for "${context.title}": ${participantResult.reason}`,
      severity: 'error' as const
    };
    summary.validationErrors.push(error);
    console.log(`❌ PARTICIPANT SYNC FAILED: ${error.message}`);
  }

  // Validate registration data (placeholder for future registrant sync)
  if (context.registrationRequired && isPastWebinar) {
    const warning = {
      webinarId: context.webinarId,
      type: 'registration_data_missing',
      message: `Webinar "${context.title}" required registration but registrant data not yet synced`,
      severity: 'warning' as const
    };
    summary.validationWarnings.push(warning);
    console.log(`⚠️ REGISTRATION WARNING: ${warning.message}`);
  }
}

function determineFinalSyncStatus(
  summary: SyncValidationSummary,
  processedCount: number,
  successCount: number
): string {
  const hasFailures = processedCount !== successCount;
  const hasValidationErrors = summary.validationErrors.length > 0;
  const hasValidationWarnings = summary.validationWarnings.length > 0;
  const hasFailedSyncs = summary.failedParticipantSyncs.length > 0 || summary.failedRegistrantSyncs.length > 0;

  if (hasFailures || hasValidationErrors || hasFailedSyncs) {
    return 'completed_with_errors';
  } else if (hasValidationWarnings) {
    return 'completed_with_warnings';
  } else {
    return 'completed';
  }
}

function generateValidationReport(summary: SyncValidationSummary): string {
  const report = [
    '=== ENHANCED SYNC VALIDATION REPORT ===',
    '',
    'DATA QUALITY SUMMARY:',
    `  - Webinars with participants: ${summary.webinarsWithParticipants}`,
    `  - Webinars with registrants: ${summary.webinarsWithRegistrants}`,
    `  - Webinars with zero participants: ${summary.webinarsWithZeroParticipants.length}`,
    `  - Webinars with zero registrants: ${summary.webinarsWithZeroRegistrants.length}`,
    '',
    'SYNC FAILURES:',
    `  - Failed participant syncs: ${summary.failedParticipantSyncs.length}`,
    `  - Failed registrant syncs: ${summary.failedRegistrantSyncs.length}`,
    '',
    'VALIDATION RESULTS:',
    `  - Validation errors: ${summary.validationErrors.length}`,
    `  - Validation warnings: ${summary.validationWarnings.length}`,
    ''
  ];

  if (summary.validationErrors.length > 0) {
    report.push('VALIDATION ERRORS:');
    summary.validationErrors.forEach(error => {
      report.push(`  - ${error.type}: ${error.message}`);
    });
    report.push('');
  }

  if (summary.validationWarnings.length > 0) {
    report.push('VALIDATION WARNINGS:');
    summary.validationWarnings.forEach(warning => {
      report.push(`  - ${warning.type}: ${warning.message}`);
    });
    report.push('');
  }

  if (summary.failedParticipantSyncs.length > 0) {
    report.push('FAILED PARTICIPANT SYNCS:');
    report.push(`  - Webinar IDs: ${summary.failedParticipantSyncs.join(', ')}`);
    report.push('');
  }

  if (summary.webinarsWithZeroParticipants.length > 0) {
    report.push('WEBINARS WITH ZERO PARTICIPANTS:');
    report.push(`  - Webinar IDs: ${summary.webinarsWithZeroParticipants.join(', ')}`);
    report.push('');
  }

  report.push('=== END VALIDATION REPORT ===');
  return report.join('\n');
}

/**
 * Enhanced webinar data merger that preserves status from list data
 */
function mergeWebinarData(originalListData: any, detailedData: any): any {
  // Start with detailed data as base
  const mergedData = { ...detailedData };
  
  // Preserve critical fields from the original list data that might be missing in detailed data
  if (originalListData.status !== undefined && (detailedData.status === undefined || detailedData.status === null)) {
    mergedData.status = originalListData.status;
    console.log(`🔄 STATUS MERGE: Preserved status '${originalListData.status}' from list data for webinar ${detailedData.id}`);
  }
  
  // Preserve other potentially missing fields
  if (originalListData.type !== undefined && !detailedData.type) {
    mergedData.type = originalListData.type;
  }
  
  return mergedData;
}

/**
 * FIXED: Derive status from available data when status is missing
 * This function had a bug comparing to string 'undefined' instead of actual undefined
 */
function deriveWebinarStatus(webinarData: any): string {
  console.log(`🔧 STATUS DERIVATION DEBUG for webinar ${webinarData.id}:`);
  console.log(`  - Original status: ${webinarData.status} (type: ${typeof webinarData.status})`);
  console.log(`  - Status === undefined: ${webinarData.status === undefined}`);
  console.log(`  - Status === null: ${webinarData.status === null}`);
  console.log(`  - Status === '': ${webinarData.status === ''}`);
  
  // FIXED BUG: Check for actual undefined/null/empty, not string 'undefined'
  if (webinarData.status && 
      webinarData.status !== undefined && 
      webinarData.status !== null && 
      webinarData.status !== '' && 
      webinarData.status.toString().toLowerCase() !== 'undefined') {
    console.log(`  - Using existing status: ${webinarData.status}`);
    return webinarData.status;
  }
  
  console.log(`  - Status invalid or missing, deriving from start_time...`);
  
  // Derive status from start_time if available
  if (webinarData.start_time) {
    const startTime = new Date(webinarData.start_time);
    const now = new Date();
    const duration = webinarData.duration || 60; // Default 60 minutes if not specified
    const endTime = new Date(startTime.getTime() + (duration * 60 * 1000));
    
    console.log(`  - Start time: ${startTime.toISOString()}`);
    console.log(`  - Current time: ${now.toISOString()}`);
    console.log(`  - Estimated end time: ${endTime.toISOString()}`);
    
    if (now < startTime) {
      console.log(`  - Derived status: 'available' (future webinar)`);
      return 'available'; // Future webinar
    } else if (now > endTime) {
      console.log(`  - Derived status: 'ended' (past webinar)`);
      return 'ended'; // Past webinar that should have ended
    } else {
      console.log(`  - Derived status: 'started' (in progress)`);
      return 'started'; // Currently in progress
    }
  }
  
  // Last resort: return available as default
  console.log(`  - WARNING: Could not determine status, defaulting to 'available'`);
  return 'available';
}

/**
 * Enhanced data flow validation to ensure integrity before participant sync
 */
function validateDataIntegrity(webinarData: any, webinarId: string): boolean {
  console.log(`🔍 DATA INTEGRITY CHECK for webinar ${webinarId}:`);
  
  const requiredFields = ['id', 'status', 'start_time'];
  const missingFields = [];
  
  for (const field of requiredFields) {
    if (webinarData[field] === undefined || webinarData[field] === null) {
      missingFields.push(field);
    }
  }
  
  if (missingFields.length > 0) {
    console.log(`❌ MISSING REQUIRED FIELDS: ${missingFields.join(', ')}`);
    return false;
  }
  
  // Validate status field specifically
  const status = webinarData.status;
  if (typeof status !== 'string' || status.trim() === '' || status === 'undefined') {
    console.log(`❌ INVALID STATUS: '${status}' (type: ${typeof status})`);
    return false;
  }
  
  console.log(`✅ Data integrity check passed`);
  return true;
}

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
  const validationSummary: SyncValidationSummary = {
    webinarsWithRegistrants: 0,
    webinarsWithParticipants: 0,
    webinarsWithZeroRegistrants: [],
    webinarsWithZeroParticipants: [],
    failedRegistrantSyncs: [],
    failedParticipantSyncs: [],
    validationWarnings: [],
    validationErrors: []
  };

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
    console.log(`\n🎉 Enhanced simple webinar sync completed with comprehensive verification:`);
    console.log(`  - Total webinars found: ${totalWebinars}`);
    console.log(`  - Webinars processed successfully: ${successCount}`);
    console.log(`  - Webinars failed: ${processedCount - successCount}`);
    console.log(`  - NEW webinars inserted: ${insertCount}`);
    console.log(`  - EXISTING webinars updated: ${updateCount}`);
    console.log(`  - Data preservation: ${updateCount > 0 ? 'ENABLED (calculated fields preserved)' : 'N/A'}`);
    console.log(`  - Webinars processed for participants: ${processedForParticipants}`);
    console.log(`  - Webinars skipped for participants: ${skippedForParticipants}`);
    console.log(`  - Total participants synced: ${totalParticipantsSynced}`);
    console.log(`  - Final sync status: ${finalStatus}`);
    console.log(`  - Validation errors: ${validationSummary.validationErrors.length}`);
    console.log(`  - Validation warnings: ${validationSummary.validationWarnings.length}`);
    if (verificationResult) {
      console.log(`  - Verification passed: ${verificationResult.passed}`);
      console.log(`  - Data loss detected: ${verificationResult.hasDataLoss}`);
      console.log(`  - Integrity score: ${verificationResult.summary.integrityScore}/100`);
    }
    
    // Enhanced sync log with comprehensive verification data
    await updateSyncLog(supabase, syncLogId, {
      sync_status: finalStatus,
      processed_items: processedCount,
      total_participants: totalParticipantsSynced,
      completed_at: new Date().toISOString(),
      sync_stage: 'completed',
      stage_progress_percentage: 100,
      // Store enhanced verification summary in sync_notes
      sync_notes: JSON.stringify({
        webinars_inserted: insertCount,
        webinars_updated: updateCount,
        data_preservation_enabled: true,
        webinars_for_participants_processed: processedForParticipants,
        webinars_for_participants_skipped: skippedForParticipants,
        participant_sync_skip_reasons: 'Webinars not yet occurred or invalid status',
        verification_enabled: true,
        verification_baseline: preSync,
        verification_result: verificationResult,
        status_field_fixes: 'FIXED: Status derivation bug and enhanced data flow validation',
        debug_logging: 'Comprehensive data integrity checks and deep cloning implemented',
        validation_summary: {
          webinars_with_participants: validationSummary.webinarsWithParticipants,
          webinars_with_registrants: validationSummary.webinarsWithRegistrants,
          webinars_with_zero_participants: validationSummary.webinarsWithZeroParticipants,
          webinars_with_zero_registrants: validationSummary.webinarsWithZeroRegistrants,
          failed_participant_syncs: validationSummary.failedParticipantSyncs,
          failed_registrant_syncs: validationSummary.failedRegistrantSyncs,
          validation_errors_count: validationSummary.validationErrors.length,
          validation_warnings_count: validationSummary.validationWarnings.length,
          validation_errors: validationSummary.validationErrors,
          validation_warnings: validationSummary.validationWarnings
        }
      })
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
      sync_notes: JSON.stringify({
        webinars_inserted: insertCount,
        webinars_updated: updateCount,
        data_preservation_enabled: true,
        webinars_for_participants_processed: processedForParticipants,
        webinars_for_participants_skipped: skippedForParticipants,
        error_type: error.constructor.name,
        verification_enabled: true,
        verification_baseline: preSync,
        verification_result: verificationResult,
        status_field_fixes: 'FIXED: Status derivation bug and enhanced data flow validation',
        debug_logging: 'Comprehensive data integrity checks and deep cloning implemented',
        validation_summary: {
          webinars_with_participants: validationSummary.webinarsWithParticipants,
          webinars_with_registrants: validationSummary.webinarsWithRegistrants,
          webinars_with_zero_participants: validationSummary.webinarsWithZeroParticipants,
          webinars_with_zero_registrants: validationSummary.webinarsWithZeroRegistrants,
          failed_participant_syncs: validationSummary.failedParticipantSyncs,
          failed_registrant_syncs: validationSummary.failedRegistrantSyncs,
          validation_errors_count: validationSummary.validationErrors.length,
          validation_warnings_count: validationSummary.validationWarnings.length,
          validation_errors: validationSummary.validationErrors,
          validation_warnings: validationSummary.validationWarnings
        }
      })
    });
    
    throw error;
  }
}
