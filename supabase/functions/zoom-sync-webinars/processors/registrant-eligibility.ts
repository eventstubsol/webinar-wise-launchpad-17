
/**
 * Enhanced registrant sync eligibility checker with comprehensive logging
 */

export interface RegistrantEligibilityResult {
  eligible: boolean;
  reason: string;
  confidence: number;
  source: 'api_primary' | 'derived' | 'database_fallback';
  warnings: string[];
  debugInfo: {
    hasRegistrationUrl: boolean;
    registrationRequired: boolean;
    webinarStatus: string;
    startTime: Date | null;
    isPastWebinar: boolean;
    isEndedWebinar: boolean;
    isRecentWebinar: boolean;
    fieldCompleteness: number;
  };
}

/**
 * ENHANCED: Multi-source registrant eligibility check with fallback mechanisms
 */
export function checkRegistrantEligibility(webinarData: any): RegistrantEligibilityResult {
  console.log(`🔍 ENHANCED REGISTRANT ELIGIBILITY CHECK for webinar ${webinarData.id}:`);
  
  const now = new Date();
  const fiveMinutesAgo = new Date(now.getTime() - (5 * 60 * 1000));
  
  // Enhanced field analysis
  const requiredFields = ['id', 'status', 'start_time', 'registration_url'];
  const availableFields = Object.keys(webinarData || {});
  const missingFields = requiredFields.filter(field => 
    webinarData[field] === undefined || webinarData[field] === null
  );
  const fieldCompleteness = ((requiredFields.length - missingFields.length) / requiredFields.length) * 100;
  
  console.log(`📊 REGISTRANT FIELD ANALYSIS:`);
  console.log(`  - Total fields available: ${availableFields.length}`);
  console.log(`  - Required fields present: ${requiredFields.length - missingFields.length}/${requiredFields.length}`);
  console.log(`  - Field completeness: ${fieldCompleteness.toFixed(1)}%`);
  console.log(`  - Missing required fields: [${missingFields.join(', ')}]`);
  console.log(`  - Available fields: [${availableFields.join(', ')}]`);

  // Multi-source status resolution
  const statusSources = {
    api_primary: webinarData.status,
    api_fallback: webinarData.webinar_status || webinarData.state,
    derived: null as string | null
  };

  console.log(`🔄 MULTI-SOURCE STATUS RESOLUTION for registrant eligibility:`);
  console.log(`  - API Primary: ${statusSources.api_primary}`);
  console.log(`  - API Fallback: ${statusSources.api_fallback}`);

  let finalStatus = statusSources.api_primary;
  let source: 'api_primary' | 'derived' | 'database_fallback' = 'api_primary';
  let confidence = 1.0;
  const warnings: string[] = [];

  // Status derivation fallback
  if (!finalStatus || finalStatus === 'undefined' || typeof finalStatus !== 'string') {
    if (statusSources.api_fallback) {
      finalStatus = statusSources.api_fallback;
      source = 'database_fallback';
      confidence = 0.8;
      warnings.push('Using fallback status source');
    } else if (webinarData.start_time) {
      // Derive status from timing
      const startTime = new Date(webinarData.start_time);
      const duration = webinarData.duration || 60;
      const endTime = new Date(startTime.getTime() + (duration * 60 * 1000));
      
      if (now < startTime) {
        finalStatus = 'available';
      } else if (now > endTime) {
        finalStatus = 'ended';
      } else {
        finalStatus = 'started';
      }
      
      source = 'derived';
      confidence = 0.7;
      warnings.push('Status derived from timing analysis');
    } else {
      finalStatus = 'unknown';
      confidence = 0.3;
      warnings.push('Status could not be determined');
    }
  }

  console.log(`📋 REGISTRANT STATUS RESOLUTION RESULT:`);
  console.log(`  - Final status: '${finalStatus}'`);
  console.log(`  - Source: ${source}`);
  console.log(`  - Confidence: ${confidence}`);
  console.log(`  - Warnings: ${warnings.length}`);

  // Time analysis
  const startTime = webinarData.start_time ? new Date(webinarData.start_time) : null;
  const isPastWebinar = startTime ? startTime < now : false;
  const isRecentWebinar = startTime ? startTime > fiveMinutesAgo : false;
  const isEndedWebinar = ['ended', 'finished'].includes(finalStatus?.toLowerCase());

  console.log(`⏰ REGISTRANT TIME-BASED ELIGIBILITY CHECK:`);
  console.log(`📊 TIME ANALYSIS:`);
  console.log(`  - Start time: ${startTime?.toISOString() || 'N/A'}`);
  console.log(`  - Current time: ${now.toISOString()}`);
  console.log(`  - Is past webinar: ${isPastWebinar}`);
  console.log(`  - Is recent webinar: ${isRecentWebinar}`);
  console.log(`  - Is ended webinar: ${isEndedWebinar}`);

  // Registration analysis
  const hasRegistrationUrl = !!(webinarData.registration_url && webinarData.registration_url.trim());
  const registrationRequired = hasRegistrationUrl || webinarData.approval_type !== 0;

  console.log(`📝 REGISTRATION ANALYSIS:`);
  console.log(`  - Has registration URL: ${hasRegistrationUrl}`);
  console.log(`  - Registration URL: ${webinarData.registration_url || 'N/A'}`);
  console.log(`  - Approval type: ${webinarData.approval_type}`);
  console.log(`  - Registration required: ${registrationRequired}`);

  const debugInfo = {
    hasRegistrationUrl,
    registrationRequired,
    webinarStatus: finalStatus,
    startTime,
    isPastWebinar,
    isEndedWebinar,
    isRecentWebinar,
    fieldCompleteness
  };

  // Eligibility determination logic
  let eligible = false;
  let reason = '';

  if (!registrationRequired) {
    eligible = false;
    reason = 'No registration required for this webinar';
    console.log(`❌ NO REGISTRATION: ${reason}`);
  } else if (!isPastWebinar) {
    eligible = true; // Future webinars can have registrants
    reason = 'Future webinar with registration - registrants may be available';
    console.log(`✅ FUTURE WEBINAR: ${reason}`);
  } else if (isEndedWebinar) {
    eligible = true;
    reason = 'Ended webinar with registration - registrants should be available';
    console.log(`✅ ENDED WEBINAR: ${reason}`);
  } else if (isPastWebinar && !isRecentWebinar) {
    eligible = true;
    reason = 'Past webinar with registration - registrants should be available';
    console.log(`✅ PAST WEBINAR: ${reason}`);
  } else {
    eligible = false;
    reason = 'Recent webinar - registrant data may not be ready yet';
    console.log(`⏳ RECENT WEBINAR: ${reason}`);
  }

  const result: RegistrantEligibilityResult = {
    eligible,
    reason,
    confidence,
    source,
    warnings,
    debugInfo
  };

  console.log(`🏁 REGISTRANT ELIGIBILITY RESULT:`);
  console.log(`  - Eligible: ${eligible}`);
  console.log(`  - Reason: ${reason}`);
  console.log(`  - Confidence: ${confidence}`);
  console.log(`  - Source: ${source}`);
  console.log(`  - Warnings: ${warnings.length}`);

  return result;
}
