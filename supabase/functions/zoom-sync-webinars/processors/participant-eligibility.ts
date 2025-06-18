
/**
 * FIXED: Status-aware webinar eligibility checker for participant sync
 */

/**
 * FIXED: Priority-based eligibility check - status takes precedence over time calculations
 */
export function isWebinarEligibleForParticipantSync(
  webinarData: any, 
  debugMode = false
): { eligible: boolean; reason?: string; diagnostics?: any } {
  
  console.log(`🔍 FIXED ELIGIBILITY CHECK for webinar ${webinarData.id || 'UNKNOWN'}:`);
  
  if (!webinarData) {
    console.log(`❌ ELIGIBILITY: No webinar data provided`);
    return {
      eligible: false,
      reason: `No webinar data provided`,
      diagnostics: { hasWebinarData: false }
    };
  }

  // PRIORITY 1: Status-based eligibility (most reliable)
  const status = webinarData.status?.toLowerCase();
  console.log(`📊 STATUS CHECK: webinar status = '${status}'`);
  
  if (status) {
    // Finished/ended webinars are ALWAYS eligible for participant sync
    if (['finished', 'ended', 'completed'].includes(status)) {
      console.log(`✅ STATUS-BASED ELIGIBILITY: Webinar is ${status} - ELIGIBLE for participant sync`);
      return {
        eligible: true,
        reason: `Webinar status '${status}' indicates completion - participant data available`,
        diagnostics: { 
          eligibilitySource: 'status',
          webinarStatus: status,
          isFinished: true
        }
      };
    }
    
    // Available/scheduled webinars are not eligible (future events)
    if (['available', 'scheduled', 'waiting'].includes(status)) {
      console.log(`❌ STATUS-BASED ELIGIBILITY: Webinar is ${status} - NOT ELIGIBLE (future event)`);
      return {
        eligible: false,
        reason: `Webinar status '${status}' indicates future event - no participant data yet`,
        diagnostics: { 
          eligibilitySource: 'status',
          webinarStatus: status,
          isFutureEvent: true
        }
      };
    }
  }

  // PRIORITY 2: Time-based eligibility (fallback when status is unclear)
  if (!webinarData.start_time) {
    console.log(`❌ ELIGIBILITY: No start_time available for time-based check`);
    return {
      eligible: false,
      reason: `No start time available for webinar ${webinarData.id} - cannot determine eligibility`,
      diagnostics: { hasStartTime: false, statusUnclear: true }
    };
  }

  const startTime = new Date(webinarData.start_time);
  const now = new Date();
  const duration = webinarData.duration || 60; // Default to 60 minutes
  const estimatedEndTime = new Date(startTime.getTime() + (duration * 60 * 1000));
  
  // Add 10 minute buffer after webinar ends for data to be available
  const dataAvailableTime = new Date(estimatedEndTime.getTime() + (10 * 60 * 1000));
  
  console.log(`⏰ TIME-BASED ANALYSIS (fallback):`);
  console.log(`  - Start time: ${startTime.toISOString()}`);
  console.log(`  - Current time: ${now.toISOString()}`);
  console.log(`  - Estimated end: ${estimatedEndTime.toISOString()}`);
  console.log(`  - Data available after: ${dataAvailableTime.toISOString()}`);
  
  // Future webinar
  if (now < startTime) {
    const minutesUntilStart = Math.round((startTime.getTime() - now.getTime()) / (1000 * 60));
    console.log(`❌ TIME-BASED ELIGIBILITY: Future webinar - starts in ${minutesUntilStart} minutes`);
    return {
      eligible: false,
      reason: `Webinar has not started yet. Start time: ${startTime.toISOString()}`,
      diagnostics: { 
        eligibilitySource: 'time',
        isFutureWebinar: true,
        minutesUntilStart: minutesUntilStart
      }
    };
  }
  
  // Recently ended webinar (within buffer period)
  if (now < dataAvailableTime) {
    const minutesUntilAvailable = Math.round((dataAvailableTime.getTime() - now.getTime()) / (1000 * 60));
    console.log(`❌ TIME-BASED ELIGIBILITY: Recent webinar - data available in ${minutesUntilAvailable} minutes`);
    return {
      eligible: false,
      reason: `Webinar ended recently. Participant data will be available in ${minutesUntilAvailable} minutes.`,
      diagnostics: { 
        eligibilitySource: 'time',
        isRecentWebinar: true,
        minutesUntilDataAvailable: minutesUntilAvailable
      }
    };
  }
  
  // Webinar ended + buffer time passed - eligible for participant sync
  const minutesSinceDataAvailable = Math.round((now.getTime() - dataAvailableTime.getTime()) / (1000 * 60));
  console.log(`✅ TIME-BASED ELIGIBILITY: Webinar ended sufficiently ago - data available for ${minutesSinceDataAvailable} minutes`);
  
  return {
    eligible: true,
    reason: `Webinar ended ${minutesSinceDataAvailable} minutes ago - participant data should be available`,
    diagnostics: { 
      eligibilitySource: 'time',
      minutesSinceDataAvailable,
      webinarEndedAt: estimatedEndTime.toISOString()
    }
  };
}

/**
 * ENHANCED: Check registrant eligibility with better status awareness
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
  
  if (!hasRegistrationUrl && approvalType === 2) {
    console.log(`❌ NO REGISTRATION: Webinar does not require registration (approval_type = 2)`);
    return {
      eligible: false,
      reason: `Webinar does not require registration - no registrant data available`,
      diagnostics: { 
        requiresRegistration: false,
        hasRegistrationUrl: false,
        approvalType: approvalType
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
      hasRegistrationUrl: hasRegistrationUrl,
      approvalType: approvalType
    }
  };
}
