
/**
 * SIMPLIFIED: Webinar eligibility checker for participant sync with clear logic
 */

/**
 * SIMPLIFIED: Check if webinar is eligible for participant sync
 */
export function isWebinarEligibleForParticipantSync(
  webinarData: any, 
  debugMode = false
): { eligible: boolean; reason?: string; diagnostics?: any } {
  
  console.log(`🔍 SIMPLIFIED ELIGIBILITY CHECK for webinar ${webinarData.id || 'UNKNOWN'}:`);
  
  if (!webinarData.start_time) {
    console.log(`❌ ELIGIBILITY: No start_time available`);
    return {
      eligible: false,
      reason: `No start time available for webinar ${webinarData.id} - cannot determine eligibility`,
      diagnostics: { hasStartTime: false }
    };
  }

  const startTime = new Date(webinarData.start_time);
  const now = new Date();
  const duration = webinarData.duration || 60; // Default to 60 minutes
  const estimatedEndTime = new Date(startTime.getTime() + (duration * 60 * 1000));
  
  // Add 10 minute buffer after webinar ends for data to be available
  const dataAvailableTime = new Date(estimatedEndTime.getTime() + (10 * 60 * 1000));
  
  console.log(`⏰ TIME ANALYSIS:`);
  console.log(`  - Start time: ${startTime.toISOString()}`);
  console.log(`  - Current time: ${now.toISOString()}`);
  console.log(`  - Estimated end: ${estimatedEndTime.toISOString()}`);
  console.log(`  - Data available after: ${dataAvailableTime.toISOString()}`);
  
  // Simple logic: webinar must have ended + 10 minute buffer
  if (now < dataAvailableTime) {
    const minutesUntilAvailable = Math.round((dataAvailableTime.getTime() - now.getTime()) / (1000 * 60));
    
    if (now < startTime) {
      console.log(`❌ FUTURE WEBINAR: Starts in ${Math.round((startTime.getTime() - now.getTime()) / (1000 * 60))} minutes`);
      return {
        eligible: false,
        reason: `Webinar has not started yet. Start time: ${startTime.toISOString()}`,
        diagnostics: { 
          isFutureWebinar: true,
          minutesUntilStart: Math.round((startTime.getTime() - now.getTime()) / (1000 * 60))
        }
      };
    } else {
      console.log(`❌ RECENT WEBINAR: Ended recently, data available in ${minutesUntilAvailable} minutes`);
      return {
        eligible: false,
        reason: `Webinar ended recently. Participant data will be available in ${minutesUntilAvailable} minutes.`,
        diagnostics: { 
          isRecentWebinar: true,
          minutesUntilDataAvailable: minutesUntilAvailable
        }
      };
    }
  }
  
  // Webinar ended + buffer time passed - eligible for participant sync
  const minutesSinceDataAvailable = Math.round((now.getTime() - dataAvailableTime.getTime()) / (1000 * 60));
  console.log(`✅ WEBINAR ELIGIBLE: Data available for ${minutesSinceDataAvailable} minutes`);
  
  return {
    eligible: true,
    diagnostics: { 
      minutesSinceDataAvailable,
      webinarEndedAt: estimatedEndTime.toISOString()
    }
  };
}

/**
 * SIMPLIFIED: Check registrant eligibility (for future/current webinars)
 */
export function isWebinarEligibleForRegistrantSync(
  webinarData: any, 
  debugMode = false
): { eligible: boolean; reason?: string; diagnostics?: any } {
  
  console.log(`🔍 REGISTRANT ELIGIBILITY CHECK for webinar ${webinarData.id || 'UNKNOWN'}:`);
  
  // Check if webinar requires registration
  const hasRegistrationUrl = !!webinarData.registration_url;
  const approvalType = webinarData.settings?.approval_type;
  
  console.log(`📝 REGISTRATION ANALYSIS:`);
  console.log(`  - Has registration URL: ${hasRegistrationUrl}`);
  console.log(`  - Approval type: ${approvalType}`);
  console.log(`  - Registration URL: ${webinarData.registration_url || 'None'}`);
  
  if (!hasRegistrationUrl) {
    console.log(`❌ NO REGISTRATION: Webinar does not require registration`);
    return {
      eligible: false,
      reason: `Webinar does not require registration - no registrant data available`,
      diagnostics: { 
        requiresRegistration: false,
        hasRegistrationUrl: false
      }
    };
  }
  
  // If webinar requires registration, we can attempt to fetch registrants
  console.log(`✅ REGISTRANT ELIGIBLE: Webinar requires registration`);
  return {
    eligible: true,
    reason: `Webinar requires registration - attempting registrant sync`,
    diagnostics: { 
      requiresRegistration: true,
      hasRegistrationUrl: true,
      approvalType: approvalType
    }
  };
}
