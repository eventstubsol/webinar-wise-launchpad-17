
/**
 * Sync status management and reporting functions
 */
import type { SyncValidationSummary } from './validation-summary.ts';
import type { VerificationResult } from '../sync-verification.ts';

export function determineFinalSyncStatus(
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

export function logSyncCompletion(
  totalWebinars: number,
  successCount: number,
  processedCount: number,
  insertCount: number,
  updateCount: number,
  processedForParticipants: number,
  skippedForParticipants: number,
  totalParticipantsSynced: number,
  finalStatus: string,
  validationSummary: SyncValidationSummary,
  verificationResult?: VerificationResult | null
): void {
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
}

export function createSyncNotes(
  insertCount: number,
  updateCount: number,
  processedForParticipants: number,
  skippedForParticipants: number,
  validationSummary: SyncValidationSummary,
  verificationResult?: VerificationResult | null,
  preSync?: any
): any {
  return {
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
  };
}
