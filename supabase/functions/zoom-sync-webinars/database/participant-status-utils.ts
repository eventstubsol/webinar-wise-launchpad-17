
/**
 * Participant sync status utilities
 */
export async function determineParticipantSyncStatus(webinarData: any): Promise<'not_applicable' | 'pending'> {
  if (!webinarData.start_time) {
    return 'not_applicable';
  }

  const startTime = new Date(webinarData.start_time);
  const now = new Date();
  const fiveMinutesAgo = new Date(now.getTime() - (5 * 60 * 1000));

  // Future webinars are not applicable
  if (startTime > now) {
    return 'not_applicable';
  }

  // Very recent webinars might not have participant data ready
  if (startTime > fiveMinutesAgo) {
    return 'not_applicable';
  }

  // Check if webinar has valid status for participant sync
  const validStatuses = ['ended', 'finished', 'available'];
  if (!validStatuses.includes(webinarData.status?.toLowerCase())) {
    return 'not_applicable';
  }

  return 'pending';
}
