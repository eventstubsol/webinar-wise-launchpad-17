
/**
 * Enhanced registrant sync eligibility checker with relaxed rules and comprehensive logging
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
    approvalType: number;
    forceSync: boolean;
  };
}

/**
 * ENHANCED: Much more lenient registrant eligibility check with comprehensive debugging
 */
export function checkRegistrantEligibility(webinarData: any, forceSync: boolean = false): RegistrantEligibilityResult {
  console.log(`🔍 ENHANCED REGISTRANT ELIGIBILITY CHECK for webinar ${webinarData.id}:`);
  
  const now = new Date();
  const fiveMinutesAgo = new Date(now.getTime() - (5 * 60 * 1000));
  
  // Enhanced field analysis
  const requiredFields = ['id', 'start_time'];
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

  // Registration analysis - MUCH MORE LENIENT
  const hasRegistrationUrl = !!(webinarData.registration_url && webinarData.registration_url.trim());
  const approvalType = webinarData.approval_type ?? webinarData.settings?.approval_type ?? 0;
  
  // FIXED: Much more lenient registration detection
  const registrationRequired = hasRegistrationUrl || approvalType !== 0;

  console.log(`📝 ENHANCED REGISTRATION ANALYSIS:`);
  console.log(`  - Has registration URL: ${hasRegistrationUrl}`);
  console.log(`  - Registration URL: ${webinarData.registration_url || 'N/A'}`);
  console.log(`  - Approval type: ${approvalType}`);
  console.log(`  - Registration required: ${registrationRequired}`);
  console.log(`  - Force sync mode: ${forceSync}`);

  const debugInfo = {
    hasRegistrationUrl,
    registrationRequired,
    webinarStatus: finalStatus,
    startTime,
    isPastWebinar,
    isEndedWebinar,
    isRecentWebinar,
    fieldCompleteness,
    approvalType,
    forceSync
  };

  // ENHANCED: Much more lenient eligibility determination
  let eligible = false;
  let reason = '';

  if (forceSync) {
    eligible = true;
    reason = 'Force sync mode enabled - bypassing all checks';
    console.log(`🚀 FORCE SYNC: ${reason}`);
  } else if (fieldCompleteness < 50) {
    eligible = false;
    reason = 'Insufficient webinar data for registrant sync';
    console.log(`❌ INSUFFICIENT DATA: ${reason}`);
  } else if (!registrationRequired) {
    // CHANGED: Still try to sync even if registration not obviously required
    eligible = true;
    reason = 'No clear registration requirement, but attempting sync anyway';
    console.log(`⚠️ ATTEMPTING ANYWAY: ${reason}`);
    warnings.push('Registration requirement unclear, attempting sync');
  } else {
    // CHANGED: Much more permissive - try to sync almost all webinars
    eligible = true;
    if (isEndedWebinar) {
      reason = 'Ended webinar with registration - registrants should be available';
      console.log(`✅ ENDED WEBINAR: ${reason}`);
    } else if (isPastWebinar) {
      reason = 'Past webinar with registration - registrants likely available';
      console.log(`✅ PAST WEBINAR: ${reason}`);
    } else {
      reason = 'Future/current webinar with registration - attempting registrant sync';
      console.log(`✅ FUTURE/CURRENT WEBINAR: ${reason}`);
    }
  }

  const result: RegistrantEligibilityResult = {
    eligible,
    reason,
    confidence,
    source,
    warnings,
    debugInfo
  };

  console.log(`🏁 ENHANCED REGISTRANT ELIGIBILITY RESULT:`);
  console.log(`  - Eligible: ${eligible}`);
  console.log(`  - Reason: ${reason}`);
  console.log(`  - Confidence: ${confidence}`);
  console.log(`  - Source: ${source}`);
  console.log(`  - Warnings: ${warnings.length}`);
  console.log(`  - Force sync: ${forceSync}`);

  return result;
}

/**
 * NEW: Test registrant eligibility with force sync for debugging
 */
export function forceRegistrantEligibilityCheck(webinarData: any): RegistrantEligibilityResult {
  console.log(`🧪 FORCE TESTING registrant eligibility for webinar ${webinarData.id}`);
  return checkRegistrantEligibility(webinarData, true);
}
