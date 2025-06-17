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
        
        // Get detailed webinar data
        const webinarDetails = await client.getWebinar(webinar.id);
        
        // Check if webinar already exists to track INSERT vs UPDATE
        const existingCheck = await supabase
          .from('zoom_webinars')
          .select('id')
          .eq('connection_id', connection.id)
          .eq('webinar_id', webinarDetails.id?.toString())
          .maybeSingle();
        
        const isNewWebinar = !existingCheck.data;
        
        // Determine initial participant sync status
        const initialParticipantSyncStatus = await determineParticipantSyncStatus(webinarDetails);
        
        // Use enhanced sync function from webinar-processor
        const { syncBasicWebinarData } = await import('./processors/webinar-processor.ts');
        const webinarDbId = await syncBasicWebinarData(supabase, webinarDetails, connection.id);
        
        // Track operation type for statistics
        if (isNewWebinar) {
          insertCount++;
          console.log(`✅ NEW webinar inserted: ${webinar.id} -> DB ID: ${webinarDbId}`);
        } else {
          updateCount++;
          console.log(`✅ EXISTING webinar updated: ${webinar.id} -> DB ID: ${webinarDbId} (data preserved)`);
        }

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
            webinarDetails, // Pass webinar data for eligibility check
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
        validateWebinarData(webinarDetails, participantResult, validationSummary);
        
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
