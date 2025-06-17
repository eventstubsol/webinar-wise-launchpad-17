
/**
 * Enhanced Webinar eligibility checker for participant sync with intelligent fallbacks
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
    console.log(`  - Duration: ${webinarData.duration}`);
    console.log(`  - Current time: ${new Date().toISOString()}`);
    console.log(`  - Available fields: [${Object.keys(webinarData).join(', ')}]`);
  }

  // Enhanced status validation with fallbacks
  const status = webinarData.status?.toLowerCase();
  const validStatuses = ['ended', 'finished', 'available'];
  
  if (status && !validStatuses.includes(status)) {
    return {
      eligible: false,
      reason: `Webinar status '${webinarData.status}' is not eligible for participant sync. Valid statuses: ${validStatuses.join(', ')}`
    };
  }

  // If status is missing or 'available', use time-based eligibility check
  if (!status || status === 'undefined' || status === 'available') {
    if (debugMode) {
      console.log(`DEBUG: Status is '${status}', using time-based eligibility check`);
    }
    
    // Check if webinar has occurred based on start time and duration
    if (webinarData.start_time) {
      const startTime = new Date(webinarData.start_time);
      const now = new Date();
      const duration = webinarData.duration || 60; // Default to 60 minutes if not specified
      const estimatedEndTime = new Date(startTime.getTime() + (duration * 60 * 1000));
      
      if (debugMode) {
        console.log(`  - Start time parsed: ${startTime.toISOString()}`);
        console.log(`  - Estimated end time: ${estimatedEndTime.toISOString()}`);
        console.log(`  - Time since start: ${now.getTime() - startTime.getTime()}ms`);
        console.log(`  - Time since estimated end: ${now.getTime() - estimatedEndTime.getTime()}ms`);
      }

      // Check if webinar hasn't started yet
      if (startTime > now) {
        return {
          eligible: false,
          reason: `Webinar has not occurred yet. Start time: ${startTime.toISOString()}, Current time: ${now.toISOString()}`
        };
      }

      // Check if webinar started but might not be finished yet
      // Allow 5 minutes buffer after estimated end time for data to be available
      const bufferTime = new Date(estimatedEndTime.getTime() + (5 * 60 * 1000));
      if (now < bufferTime) {
        return {
          eligible: false,
          reason: `Webinar may still be in progress or just ended. Estimated end: ${estimatedEndTime.toISOString()}, Current: ${now.toISOString()}. Waiting 5min buffer for participant data.`
        };
      }
      
      // Webinar should have ended - eligible for participant sync
      if (debugMode) {
        console.log(`DEBUG: Webinar appears to have ended, eligible for participant sync`);
      }
      
    } else {
      if (debugMode) {
        console.log(`DEBUG: No start_time found, allowing participant sync (assuming webinar has occurred)`);
      }
      // If no start time is available, we can't determine timing, so allow sync
      // This is a fallback for edge cases where start_time might be missing
    }
  }

  // For 'ended' and 'finished' statuses, always eligible
  if (status === 'ended' || status === 'finished') {
    if (debugMode) {
      console.log(`DEBUG: Webinar status '${status}' indicates completion, eligible for participant sync`);
    }
  }

  return { eligible: true };
}
