
/**
 * Webinar eligibility checker for participant sync
 */

/**
 * Check if a webinar has occurred and is eligible for participant sync
 */
export function isWebinarEligibleForParticipantSync(webinarData: any, debugMode = false): { eligible: boolean; reason?: string } {
  if (debugMode) {
    console.log(`DEBUG: Checking webinar eligibility for participant sync:`);
    console.log(`  - Webinar ID: ${webinarData.id || webinarData.webinar_id}`);
    console.log(`  - Status: ${webinarData.status}`);
    console.log(`  - Start time: ${webinarData.start_time}`);
    console.log(`  - Current time: ${new Date().toISOString()}`);
  }

  // Check if webinar has a valid status for participant data
  const validStatuses = ['ended', 'finished', 'available']; // 'available' might contain past webinars
  if (!validStatuses.includes(webinarData.status?.toLowerCase())) {
    return {
      eligible: false,
      reason: `Webinar status '${webinarData.status}' is not eligible for participant sync. Valid statuses: ${validStatuses.join(', ')}`
    };
  }

  // Check if webinar has occurred (start time is in the past)
  if (webinarData.start_time) {
    const startTime = new Date(webinarData.start_time);
    const now = new Date();
    
    if (debugMode) {
      console.log(`  - Start time parsed: ${startTime.toISOString()}`);
      console.log(`  - Time difference: ${now.getTime() - startTime.getTime()}ms`);
    }

    if (startTime > now) {
      return {
        eligible: false,
        reason: `Webinar has not occurred yet. Start time: ${startTime.toISOString()}, Current time: ${now.toISOString()}`
      };
    }

    // Check if webinar started at least 5 minutes ago to ensure it had time to complete
    const fiveMinutesAgo = new Date(now.getTime() - (5 * 60 * 1000));
    if (startTime > fiveMinutesAgo) {
      return {
        eligible: false,
        reason: `Webinar started too recently (less than 5 minutes ago). Participants might not be available yet.`
      };
    }
  } else {
    if (debugMode) {
      console.log(`  - No start_time found, assuming webinar is eligible`);
    }
  }

  return { eligible: true };
}
