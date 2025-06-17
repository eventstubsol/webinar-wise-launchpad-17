
/**
 * Enhanced Webinar eligibility checker for participant sync with intelligent fallbacks
 */

/**
 * Check if a webinar has occurred and is eligible for participant sync
 * ENHANCED: Now includes robust status validation and comprehensive debugging
 */
export function isWebinarEligibleForParticipantSync(webinarData: any, debugMode = false): { eligible: boolean; reason?: string } {
  if (debugMode) {
    console.log(`DEBUG: Checking webinar eligibility for participant sync:`);
    console.log(`  - Webinar ID: ${webinarData.id || webinarData.webinar_id}`);
    console.log(`  - Status: ${webinarData.status} (type: ${typeof webinarData.status})`);
    console.log(`  - Start time: ${webinarData.start_time}`);
    console.log(`  - Duration: ${webinarData.duration}`);
    console.log(`  - Current time: ${new Date().toISOString()}`);
    console.log(`  - Available fields: [${Object.keys(webinarData).join(', ')}]`);
  }

  // ENHANCED: More robust status validation with comprehensive checks
  const status = webinarData.status;
  const statusString = status ? status.toString().toLowerCase() : 'unknown';
  
  console.log(`🔍 ELIGIBILITY STATUS CHECK for webinar ${webinarData.id}:`);
  console.log(`  - Raw status: ${status} (type: ${typeof status})`);
  console.log(`  - Status string: '${statusString}'`);
  console.log(`  - Status is truthy: ${!!status}`);
  console.log(`  - Status is undefined: ${status === undefined}`);
  console.log(`  - Status is null: ${status === null}`);
  console.log(`  - Status is empty string: ${status === ''}`);
  
  // Valid statuses for participant sync
  const validStatuses = ['ended', 'finished', 'available'];
  
  // ENHANCED: Check for completely invalid status values
  if (status === undefined || status === null || status === '' || statusString === 'undefined' || statusString === 'null') {
    console.log(`❌ ELIGIBILITY CHECK: Invalid status detected - ${status}`);
    
    // FALLBACK: If status is invalid, use time-based eligibility check
    console.log(`🔄 FALLBACK: Using time-based eligibility check due to invalid status`);
    return checkTimeBasedEligibility(webinarData, debugMode);
  }
  
  // Check if status is in valid list
  if (!validStatuses.includes(statusString)) {
    console.log(`❌ ELIGIBILITY CHECK: Status '${statusString}' not in valid list: ${validStatuses.join(', ')}`);
    return {
      eligible: false,
      reason: `Webinar status '${webinarData.status}' is not eligible for participant sync. Valid statuses: ${validStatuses.join(', ')}`
    };
  }

  // ENHANCED: For 'available' status, always do time-based check
  if (statusString === 'available') {
    console.log(`🔄 AVAILABLE STATUS: Performing time-based eligibility check for available webinar`);
    return checkTimeBasedEligibility(webinarData, debugMode);
  }

  // For 'ended' and 'finished' statuses, always eligible
  if (statusString === 'ended' || statusString === 'finished') {
    console.log(`✅ ELIGIBILITY CHECK: Webinar status '${statusString}' indicates completion, eligible for participant sync`);
    return { eligible: true };
  }

  // Default case
  console.log(`✅ ELIGIBILITY CHECK: Status '${statusString}' passed validation, eligible for participant sync`);
  return { eligible: true };
}

/**
 * ENHANCED: Time-based eligibility checking with comprehensive validation
 */
function checkTimeBasedEligibility(webinarData: any, debugMode = false): { eligible: boolean; reason?: string } {
  console.log(`⏰ TIME-BASED ELIGIBILITY CHECK for webinar ${webinarData.id}:`);
  
  // Check if webinar has occurred based on start time and duration
  if (!webinarData.start_time) {
    console.log(`❌ No start_time available, cannot determine eligibility`);
    return {
      eligible: false,
      reason: `No start time available for webinar ${webinarData.id} - cannot determine eligibility`
    };
  }

  const startTime = new Date(webinarData.start_time);
  const now = new Date();
  const duration = webinarData.duration || 60; // Default to 60 minutes if not specified
  const estimatedEndTime = new Date(startTime.getTime() + (duration * 60 * 1000));
  
  console.log(`  - Start time parsed: ${startTime.toISOString()}`);
  console.log(`  - Current time: ${now.toISOString()}`);
  console.log(`  - Duration: ${duration} minutes`);
  console.log(`  - Estimated end time: ${estimatedEndTime.toISOString()}`);
  console.log(`  - Time since start: ${Math.round((now.getTime() - startTime.getTime()) / (1000 * 60))} minutes`);
  console.log(`  - Time since estimated end: ${Math.round((now.getTime() - estimatedEndTime.getTime()) / (1000 * 60))} minutes`);

  // Check if webinar hasn't started yet
  if (startTime > now) {
    const timeUntilStart = Math.round((startTime.getTime() - now.getTime()) / (1000 * 60));
    console.log(`❌ FUTURE WEBINAR: Starts in ${timeUntilStart} minutes`);
    return {
      eligible: false,
      reason: `Webinar has not occurred yet. Start time: ${startTime.toISOString()}, Current time: ${now.toISOString()}`
    };
  }

  // Check if webinar started but might not be finished yet
  // Allow 5 minutes buffer after estimated end time for data to be available
  const bufferTime = new Date(estimatedEndTime.getTime() + (5 * 60 * 1000));
  if (now < bufferTime) {
    const timeUntilBuffer = Math.round((bufferTime.getTime() - now.getTime()) / (1000 * 60));
    console.log(`❌ WEBINAR TOO RECENT: Need to wait ${timeUntilBuffer} more minutes for data availability`);
    return {
      eligible: false,
      reason: `Webinar may still be in progress or just ended. Estimated end: ${estimatedEndTime.toISOString()}, Current: ${now.toISOString()}. Waiting 5min buffer for participant data.`
    };
  }
  
  // Webinar should have ended - eligible for participant sync
  const timeSinceEnd = Math.round((now.getTime() - estimatedEndTime.getTime()) / (1000 * 60));
  console.log(`✅ WEBINAR ELIGIBLE: Ended ${timeSinceEnd} minutes ago, participant data should be available`);
  
  return { eligible: true };
}
