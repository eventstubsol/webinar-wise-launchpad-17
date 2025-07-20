
/**
 * Validation summary tracking interface and functions
 */

export interface SyncValidationSummary {
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

export interface WebinarValidationContext {
  webinarId: string;
  title: string;
  status: string;
  startTime: Date | null;
  registrationRequired: boolean;
  registrantCount: number;
  attendeeCount: number;
}

export function createValidationSummary(): SyncValidationSummary {
  return {
    webinarsWithRegistrants: 0,
    webinarsWithParticipants: 0,
    webinarsWithZeroRegistrants: [],
    webinarsWithZeroParticipants: [],
    failedRegistrantSyncs: [],
    failedParticipantSyncs: [],
    validationWarnings: [],
    validationErrors: []
  };
}

export function validateWebinarData(
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

export function generateValidationReport(summary: SyncValidationSummary): string {
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
