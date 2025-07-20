
/**
 * Sync validation database operations
 */
import { updateWebinarParticipantSyncStatus } from './webinar-operations.ts';

export async function validateSyncResults(
  supabase: any,
  webinarDbId: string,
  syncResults: {
    participantCount: number;
    registrantCount: number;
    webinarStatus: string;
    webinarStartTime: Date | null;
  }
): Promise<{
  hasErrors: boolean;
  hasWarnings: boolean;
  validationMessages: string[];
}> {
  const now = new Date();
  const fiveMinutesAgo = new Date(now.getTime() - (5 * 60 * 1000));
  const isPastWebinar = syncResults.webinarStartTime && syncResults.webinarStartTime < now;
  const isRecentWebinar = syncResults.webinarStartTime && syncResults.webinarStartTime > fiveMinutesAgo;
  const isEndedWebinar = ['ended', 'finished'].includes(syncResults.webinarStatus?.toLowerCase());

  let hasErrors = false;
  let hasWarnings = false;
  const validationMessages: string[] = [];

  // Validate participant count
  if (syncResults.participantCount === 0) {
    if (isEndedWebinar && !isRecentWebinar) {
      hasErrors = true;
      validationMessages.push(`ERROR: Ended webinar has no participants - likely sync failure`);
    } else if (isPastWebinar && !isRecentWebinar) {
      hasWarnings = true;
      validationMessages.push(`WARNING: Past webinar has no participants - may indicate low attendance or sync issue`);
    }
  }

  // Validate registrant count
  if (syncResults.registrantCount === 0 && isPastWebinar) {
    hasWarnings = true;
    validationMessages.push(`WARNING: Past webinar has no registrants - may indicate registration issues`);
  }

  // Update webinar with validation status
  if (hasErrors || hasWarnings) {
    const status = hasErrors ? 'validation_error' : 'validation_warning';
    await updateWebinarParticipantSyncStatus(
      supabase,
      webinarDbId,
      status,
      validationMessages.join('; '),
      {
        participantCount: syncResults.participantCount,
        registrantCount: syncResults.registrantCount,
        validationFlags: validationMessages
      }
    );
  }

  return {
    hasErrors,
    hasWarnings,
    validationMessages
  };
}
