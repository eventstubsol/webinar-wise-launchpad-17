
/**
 * Enhanced Webinar eligibility checker for participant sync with comprehensive fallback mechanisms
 */

// Database fallback function to get status from stored webinar data
async function getWebinarStatusFromDatabase(supabase: any, webinarDbId: string): Promise<string | null> {
  console.log(`🔍 DATABASE FALLBACK: Querying status for webinar DB ID: ${webinarDbId}`);
  
  try {
    const { data, error } = await supabase
      .from('zoom_webinars')
      .select('status, start_time, duration')
      .eq('id', webinarDbId)
      .single();
    
    if (error) {
      console.log(`❌ DATABASE FALLBACK ERROR: ${error.message}`);
      return null;
    }
    
    if (data && data.status) {
      console.log(`✅ DATABASE FALLBACK SUCCESS: Found status '${data.status}' in database`);
      return data.status;
    }
    
    console.log(`⚠️ DATABASE FALLBACK: No status found in database record`);
    return null;
  } catch (error) {
    console.log(`❌ DATABASE FALLBACK EXCEPTION: ${error.message}`);
    return null;
  }
}

// Enhanced field availability analysis
function analyzeWebinarDataFields(webinarData: any): {
  availableFields: string[];
  missingCriticalFields: string[];
  fieldCompleteness: number;
  diagnostics: string[];
} {
  const criticalFields = ['id', 'status', 'start_time', 'duration', 'type'];
  const allFields = Object.keys(webinarData || {});
  const missingCriticalFields = criticalFields.filter(field => 
    webinarData[field] === undefined || webinarData[field] === null || webinarData[field] === ''
  );
  
  const fieldCompleteness = ((criticalFields.length - missingCriticalFields.length) / criticalFields.length) * 100;
  
  const diagnostics = [
    `Total fields available: ${allFields.length}`,
    `Critical fields present: ${criticalFields.length - missingCriticalFields.length}/${criticalFields.length}`,
    `Field completeness: ${fieldCompleteness.toFixed(1)}%`,
    `Available fields: [${allFields.join(', ')}]`,
    `Missing critical fields: [${missingCriticalFields.join(', ')}]`
  ];
  
  return {
    availableFields: allFields,
    missingCriticalFields,
    fieldCompleteness,
    diagnostics
  };
}

// Intelligent status derivation with enhanced logic
function deriveStatusFromData(webinarData: any): { status: string; source: string; confidence: number } {
  console.log(`🧠 INTELLIGENT STATUS DERIVATION for webinar ${webinarData.id}:`);
  
  // Check if we have start_time to work with
  if (!webinarData.start_time) {
    console.log(`  - No start_time available, defaulting to 'available' with low confidence`);
    return { status: 'available', source: 'default_no_time', confidence: 0.3 };
  }
  
  const now = new Date();
  const startTime = new Date(webinarData.start_time);
  const duration = webinarData.duration || 60; // Default 60 minutes
  const estimatedEndTime = new Date(startTime.getTime() + (duration * 60 * 1000));
  
  console.log(`  - Start time: ${startTime.toISOString()}`);
  console.log(`  - Current time: ${now.toISOString()}`);
  console.log(`  - Duration: ${duration} minutes`);
  console.log(`  - Estimated end time: ${estimatedEndTime.toISOString()}`);
  
  // Apply business logic for status derivation
  if (now < startTime) {
    // Future webinar
    const timeUntilStart = Math.round((startTime.getTime() - now.getTime()) / (1000 * 60));
    console.log(`  - Future webinar: starts in ${timeUntilStart} minutes`);
    return { status: 'available', source: 'time_based_future', confidence: 0.9 };
  } else if (now >= startTime && now <= estimatedEndTime) {
    // Currently in progress
    const timeInProgress = Math.round((now.getTime() - startTime.getTime()) / (1000 * 60));
    console.log(`  - Webinar in progress: ${timeInProgress} minutes elapsed`);
    return { status: 'started', source: 'time_based_active', confidence: 0.8 };
  } else {
    // Past webinar (should have ended)
    const timeSinceEnd = Math.round((now.getTime() - estimatedEndTime.getTime()) / (1000 * 60));
    console.log(`  - Past webinar: ended ${timeSinceEnd} minutes ago`);
    return { status: 'ended', source: 'time_based_past', confidence: 0.9 };
  }
}

// Multi-source status resolution with comprehensive fallback
async function resolveWebinarStatus(
  webinarData: any, 
  webinarDbId?: string, 
  supabase?: any
): Promise<{ status: string; source: string; confidence: number; warnings: string[] }> {
  console.log(`🔄 MULTI-SOURCE STATUS RESOLUTION for webinar ${webinarData.id}:`);
  
  const warnings: string[] = [];
  
  // PRIMARY: Use webinarData.status if available and valid
  const primaryStatus = webinarData.status;
  if (primaryStatus && 
      primaryStatus !== undefined && 
      primaryStatus !== null && 
      primaryStatus !== '' && 
      primaryStatus.toString().toLowerCase() !== 'undefined' &&
      primaryStatus.toString().toLowerCase() !== 'null') {
    console.log(`✅ PRIMARY SOURCE: Using API status '${primaryStatus}'`);
    return { status: primaryStatus, source: 'api_primary', confidence: 1.0, warnings };
  } else {
    warnings.push(`Primary status invalid or missing: '${primaryStatus}' (type: ${typeof primaryStatus})`);
    console.log(`❌ PRIMARY SOURCE FAILED: ${warnings[warnings.length - 1]}`);
  }
  
  // SECONDARY: Derive status from time-based logic
  console.log(`🔄 SECONDARY SOURCE: Attempting time-based derivation...`);
  try {
    const derivedResult = deriveStatusFromData(webinarData);
    if (derivedResult.confidence > 0.5) {
      console.log(`✅ SECONDARY SOURCE: Derived status '${derivedResult.status}' (confidence: ${derivedResult.confidence})`);
      return { 
        status: derivedResult.status, 
        source: derivedResult.source, 
        confidence: derivedResult.confidence, 
        warnings 
      };
    } else {
      warnings.push(`Time-based derivation low confidence: ${derivedResult.confidence}`);
      console.log(`⚠️ SECONDARY SOURCE LOW CONFIDENCE: ${warnings[warnings.length - 1]}`);
    }
  } catch (error) {
    warnings.push(`Time-based derivation failed: ${error.message}`);
    console.log(`❌ SECONDARY SOURCE FAILED: ${warnings[warnings.length - 1]}`);
  }
  
  // TERTIARY: Query database for stored status
  if (webinarDbId && supabase) {
    console.log(`🔄 TERTIARY SOURCE: Attempting database fallback...`);
    try {
      const dbStatus = await getWebinarStatusFromDatabase(supabase, webinarDbId);
      if (dbStatus) {
        console.log(`✅ TERTIARY SOURCE: Using database status '${dbStatus}'`);
        return { status: dbStatus, source: 'database_fallback', confidence: 0.8, warnings };
      } else {
        warnings.push(`Database fallback returned no status`);
        console.log(`❌ TERTIARY SOURCE FAILED: ${warnings[warnings.length - 1]}`);
      }
    } catch (error) {
      warnings.push(`Database fallback error: ${error.message}`);
      console.log(`❌ TERTIARY SOURCE ERROR: ${warnings[warnings.length - 1]}`);
    }
  } else {
    warnings.push(`Database fallback not available (webinarDbId: ${!!webinarDbId}, supabase: ${!!supabase})`);
    console.log(`⚠️ TERTIARY SOURCE UNAVAILABLE: ${warnings[warnings.length - 1]}`);
  }
  
  // FALLBACK: Conservative default with warning
  console.log(`🚨 FALLBACK SOURCE: Using conservative default 'available'`);
  warnings.push(`All status sources failed, using conservative fallback`);
  return { status: 'available', source: 'conservative_fallback', confidence: 0.1, warnings };
}

/**
 * Enhanced webinar eligibility checker with comprehensive fallback mechanisms
 */
export async function isWebinarEligibleForParticipantSync(
  webinarData: any, 
  debugMode = false,
  webinarDbId?: string,
  supabase?: any
): Promise<{ eligible: boolean; reason?: string; diagnostics?: any }> {
  
  console.log(`🔍 ENHANCED ELIGIBILITY CHECK for webinar ${webinarData.id || 'UNKNOWN'}:`);
  
  // Enhanced field availability analysis
  const fieldAnalysis = analyzeWebinarDataFields(webinarData);
  console.log(`📊 FIELD ANALYSIS:`);
  fieldAnalysis.diagnostics.forEach(diagnostic => console.log(`  - ${diagnostic}`));
  
  // Multi-source status resolution
  const statusResult = await resolveWebinarStatus(webinarData, webinarDbId, supabase);
  console.log(`📋 STATUS RESOLUTION RESULT:`);
  console.log(`  - Final status: '${statusResult.status}'`);
  console.log(`  - Source: ${statusResult.source}`);
  console.log(`  - Confidence: ${statusResult.confidence}`);
  console.log(`  - Warnings: ${statusResult.warnings.length}`);
  statusResult.warnings.forEach(warning => console.log(`    ⚠️ ${warning}`));
  
  // Apply the resolved status to webinar data for consistency
  webinarData.status = statusResult.status;
  
  // Valid statuses for participant sync
  const validStatuses = ['ended', 'finished', 'available'];
  const statusString = statusResult.status.toLowerCase();
  
  // Enhanced status validation
  if (!validStatuses.includes(statusString)) {
    console.log(`❌ ELIGIBILITY: Status '${statusResult.status}' not in valid list: ${validStatuses.join(', ')}`);
    return {
      eligible: false,
      reason: `Webinar status '${statusResult.status}' is not eligible for participant sync. Valid statuses: ${validStatuses.join(', ')}`,
      diagnostics: {
        fieldAnalysis,
        statusResolution: statusResult,
        eligibilityDecision: 'invalid_status'
      }
    };
  }
  
  // For 'available' status, perform time-based eligibility check
  if (statusString === 'available') {
    console.log(`🔄 AVAILABLE STATUS: Performing time-based eligibility check...`);
    const timeBasedResult = checkTimeBasedEligibility(webinarData, debugMode);
    
    return {
      eligible: timeBasedResult.eligible,
      reason: timeBasedResult.reason,
      diagnostics: {
        fieldAnalysis,
        statusResolution: statusResult,
        timeBasedCheck: timeBasedResult,
        eligibilityDecision: timeBasedResult.eligible ? 'time_based_eligible' : 'time_based_not_eligible'
      }
    };
  }
  
  // For 'ended' and 'finished' statuses, always eligible
  if (statusString === 'ended' || statusString === 'finished') {
    console.log(`✅ ELIGIBILITY: Status '${statusResult.status}' indicates completion, eligible for participant sync`);
    return {
      eligible: true,
      diagnostics: {
        fieldAnalysis,
        statusResolution: statusResult,
        eligibilityDecision: 'status_based_eligible'
      }
    };
  }
  
  // Default case (should not reach here due to validation above)
  console.log(`✅ ELIGIBILITY: Status '${statusResult.status}' passed validation, eligible for participant sync`);
  return {
    eligible: true,
    diagnostics: {
      fieldAnalysis,
      statusResolution: statusResult,
      eligibilityDecision: 'default_eligible'
    }
  };
}

/**
 * Enhanced time-based eligibility checking with comprehensive validation
 */
function checkTimeBasedEligibility(webinarData: any, debugMode = false): { eligible: boolean; reason?: string; timeAnalysis?: any } {
  console.log(`⏰ ENHANCED TIME-BASED ELIGIBILITY CHECK for webinar ${webinarData.id}:`);
  
  // Check if webinar has occurred based on start time and duration
  if (!webinarData.start_time) {
    console.log(`❌ No start_time available, cannot determine time-based eligibility`);
    return {
      eligible: false,
      reason: `No start time available for webinar ${webinarData.id} - cannot determine time-based eligibility`,
      timeAnalysis: { hasStartTime: false }
    };
  }

  const startTime = new Date(webinarData.start_time);
  const now = new Date();
  const duration = webinarData.duration || 60; // Default to 60 minutes if not specified
  const estimatedEndTime = new Date(startTime.getTime() + (duration * 60 * 1000));
  
  // Enhanced time analysis
  const timeAnalysis = {
    hasStartTime: true,
    startTime: startTime.toISOString(),
    currentTime: now.toISOString(),
    duration: duration,
    estimatedEndTime: estimatedEndTime.toISOString(),
    minutesSinceStart: Math.round((now.getTime() - startTime.getTime()) / (1000 * 60)),
    minutesSinceEstimatedEnd: Math.round((now.getTime() - estimatedEndTime.getTime()) / (1000 * 60)),
    isFutureWebinar: startTime > now,
    hasStarted: now >= startTime,
    hasEstimatedEnded: now > estimatedEndTime
  };
  
  console.log(`📊 TIME ANALYSIS:`);
  console.log(`  - Start time: ${timeAnalysis.startTime}`);
  console.log(`  - Current time: ${timeAnalysis.currentTime}`);
  console.log(`  - Duration: ${timeAnalysis.duration} minutes`);
  console.log(`  - Estimated end: ${timeAnalysis.estimatedEndTime}`);
  console.log(`  - Minutes since start: ${timeAnalysis.minutesSinceStart}`);
  console.log(`  - Minutes since estimated end: ${timeAnalysis.minutesSinceEstimatedEnd}`);
  console.log(`  - Is future webinar: ${timeAnalysis.isFutureWebinar}`);
  console.log(`  - Has started: ${timeAnalysis.hasStarted}`);
  console.log(`  - Has estimated ended: ${timeAnalysis.hasEstimatedEnded}`);

  // Check if webinar hasn't started yet
  if (timeAnalysis.isFutureWebinar) {
    const timeUntilStart = Math.round((startTime.getTime() - now.getTime()) / (1000 * 60));
    console.log(`❌ FUTURE WEBINAR: Starts in ${timeUntilStart} minutes`);
    return {
      eligible: false,
      reason: `Webinar has not occurred yet. Start time: ${startTime.toISOString()}, Current time: ${now.toISOString()}`,
      timeAnalysis
    };
  }

  // Check if webinar started but might not be finished yet
  // Allow 5 minutes buffer after estimated end time for data to be available
  const bufferTime = new Date(estimatedEndTime.getTime() + (5 * 60 * 1000));
  const minutesUntilBuffer = Math.round((bufferTime.getTime() - now.getTime()) / (1000 * 60));
  
  if (now < bufferTime) {
    console.log(`❌ WEBINAR TOO RECENT: Need to wait ${minutesUntilBuffer} more minutes for data availability`);
    return {
      eligible: false,
      reason: `Webinar may still be in progress or just ended. Estimated end: ${estimatedEndTime.toISOString()}, Current: ${now.toISOString()}. Waiting 5min buffer for participant data.`,
      timeAnalysis: { ...timeAnalysis, bufferTime: bufferTime.toISOString(), minutesUntilBuffer }
    };
  }
  
  // Webinar should have ended - eligible for participant sync
  const timeSinceEnd = Math.round((now.getTime() - estimatedEndTime.getTime()) / (1000 * 60));
  console.log(`✅ WEBINAR ELIGIBLE: Ended ${timeSinceEnd} minutes ago, participant data should be available`);
  
  return {
    eligible: true,
    timeAnalysis: { ...timeAnalysis, timeSinceEnd }
  };
}
