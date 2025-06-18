
/**
 * ENHANCED: Robust participant transformation with comprehensive fallback handling
 */

export interface TransformationResult {
  participant: any;
  warnings: string[];
  fallbacks_used: string[];
}

export function transformParticipantForDatabaseEnhanced(
  apiParticipant: any, 
  webinarDbId: string, 
  debugMode = false
): TransformationResult {
  const warnings: string[] = [];
  const fallbacks_used: string[] = [];

  if (debugMode) {
    console.log(`🔧 ENHANCED TRANSFORMER: Starting robust transformation`);
    console.log(`  - Input keys: [${Object.keys(apiParticipant || {}).join(', ')}]`);
    console.log(`  - Raw participant data:`, JSON.stringify(apiParticipant, null, 2));
  }

  // PHASE 1: Critical field validation and fallback
  let participant_id = null;
  let participant_email = null;
  let participant_name = null;

  // Handle participant_id with multiple fallbacks
  if (apiParticipant.id) {
    participant_id = String(apiParticipant.id);
  } else if (apiParticipant.participant_id) {
    participant_id = String(apiParticipant.participant_id);
  } else if (apiParticipant.user_id) {
    participant_id = String(apiParticipant.user_id);
    fallbacks_used.push('Used user_id as participant_id');
  } else {
    // participant_id will be null, database trigger will generate fallback
    warnings.push('No participant_id found in API response - will use generated ID');
    fallbacks_used.push('Database will generate participant_id');
  }

  // Handle email with fallbacks
  if (apiParticipant.user_email) {
    participant_email = apiParticipant.user_email;
  } else if (apiParticipant.participant_email) {
    participant_email = apiParticipant.participant_email;
  } else if (apiParticipant.email) {
    participant_email = apiParticipant.email;
  } else {
    warnings.push('No email found in API response');
  }

  // Handle name with fallbacks
  if (apiParticipant.name) {
    participant_name = apiParticipant.name;
  } else if (apiParticipant.participant_name) {
    participant_name = apiParticipant.participant_name;
  } else if (apiParticipant.display_name) {
    participant_name = apiParticipant.display_name;
    fallbacks_used.push('Used display_name as participant_name');
  } else if (participant_email) {
    participant_name = participant_email.split('@')[0];
    fallbacks_used.push('Generated name from email');
  } else {
    participant_name = 'Unknown Participant';
    fallbacks_used.push('Used default name');
    warnings.push('No name found - using default');
  }

  // PHASE 2: Safe field extraction with type coercion
  const safeExtractString = (obj: any, keys: string[], defaultValue: string | null = null): string | null => {
    for (const key of keys) {
      if (obj[key] !== undefined && obj[key] !== null) {
        return String(obj[key]);
      }
    }
    return defaultValue;
  };

  const safeExtractNumber = (obj: any, keys: string[], defaultValue: number | null = null): number | null => {
    for (const key of keys) {
      if (obj[key] !== undefined && obj[key] !== null) {
        const num = Number(obj[key]);
        return isNaN(num) ? defaultValue : num;
      }
    }
    return defaultValue;
  };

  const safeExtractBoolean = (obj: any, keys: string[], defaultValue: boolean | null = null): boolean | null => {
    for (const key of keys) {
      if (obj[key] !== undefined && obj[key] !== null) {
        return Boolean(obj[key]);
      }
    }
    return defaultValue;
  };

  // PHASE 3: Enhanced status mapping with fallbacks
  let participantStatus = 'attended'; // Safe default

  if (apiParticipant.status) {
    const statusMap: { [key: string]: string } = {
      'in_meeting': 'attended',
      'in_waiting_room': 'in_waiting_room', 
      'left': 'left_early',
      'joined': 'attended',
      'attended': 'attended',
      'not_attended': 'not_attended',
      'left_early': 'left_early'
    };
    participantStatus = statusMap[String(apiParticipant.status).toLowerCase()] || 'attended';
  } else {
    // Infer status from timing data
    const hasJoinTime = !!apiParticipant.join_time;
    const hasLeaveTime = !!apiParticipant.leave_time;
    const duration = safeExtractNumber(apiParticipant, ['duration'], 0);

    if (hasJoinTime && hasLeaveTime && duration && duration > 0) {
      participantStatus = 'attended';
    } else if (hasJoinTime && !hasLeaveTime) {
      participantStatus = 'attended'; // Still in meeting when data captured
    } else {
      participantStatus = 'not_attended';
    }
    fallbacks_used.push(`Inferred status '${participantStatus}' from timing data`);
  }

  // PHASE 4: Construct final participant object
  const transformedParticipant = {
    webinar_id: webinarDbId,
    participant_id: participant_id, // Can be null - database will handle
    registrant_id: safeExtractString(apiParticipant, ['registrant_id']),
    participant_name: participant_name,
    participant_email: participant_email,
    participant_user_id: safeExtractString(apiParticipant, ['user_id', 'participant_user_id']),
    
    // Timing data
    join_time: safeExtractString(apiParticipant, ['join_time']),
    leave_time: safeExtractString(apiParticipant, ['leave_time']),
    duration: safeExtractNumber(apiParticipant, ['duration']),
    
    // Engagement metrics
    attentiveness_score: safeExtractNumber(apiParticipant, ['attentiveness_score', 'attention_score']),
    camera_on_duration: safeExtractNumber(apiParticipant, ['camera_on_duration']),
    share_application_duration: safeExtractNumber(apiParticipant, ['share_application_duration']),
    share_desktop_duration: safeExtractNumber(apiParticipant, ['share_desktop_duration']),
    
    // Interaction flags
    posted_chat: safeExtractBoolean(apiParticipant, ['posted_chat'], false),
    raised_hand: safeExtractBoolean(apiParticipant, ['raised_hand'], false),
    answered_polling: safeExtractBoolean(apiParticipant, ['answered_polling'], false),
    asked_question: safeExtractBoolean(apiParticipant, ['asked_question'], false),
    
    // Technical data
    device: safeExtractString(apiParticipant, ['device']),
    ip_address: safeExtractString(apiParticipant, ['ip_address']),
    location: safeExtractString(apiParticipant, ['location']),
    network_type: safeExtractString(apiParticipant, ['network_type']),
    version: safeExtractString(apiParticipant, ['version']),
    customer_key: safeExtractString(apiParticipant, ['customer_key']),
    
    // Status and flags
    status: participantStatus,
    failover: safeExtractBoolean(apiParticipant, ['failover'], false),
    internal_user: safeExtractBoolean(apiParticipant, ['internal_user'], false),
  };

  if (debugMode) {
    console.log(`✅ ENHANCED TRANSFORMATION COMPLETE:`);
    console.log(`  - Warnings: ${warnings.length}`);
    console.log(`  - Fallbacks used: ${fallbacks_used.length}`);
    console.log(`  - Final participant_id: ${transformedParticipant.participant_id || 'NULL (will be generated)'}`);
    console.log(`  - Final participant_name: ${transformedParticipant.participant_name}`);
    console.log(`  - Final participant_email: ${transformedParticipant.participant_email || 'NULL'}`);
    console.log(`  - Final status: ${transformedParticipant.status}`);
  }

  return {
    participant: transformedParticipant,
    warnings,
    fallbacks_used
  };
}

/**
 * Log transformation issues for debugging
 */
export async function logTransformationIssues(
  supabase: any,
  webinarId: string,
  rawParticipantData: any,
  warnings: string[],
  fallbacks: string[]
): Promise<void> {
  try {
    const { error } = await supabase
      .from('participant_sync_debug_log')
      .insert({
        webinar_id: webinarId,
        raw_participant_data: rawParticipantData,
        processing_errors: warnings,
        field_issues: {
          fallbacks_used: fallbacks,
          missing_critical_fields: warnings.filter(w => w.includes('No') && w.includes('found')),
          data_quality_score: Math.max(0, 100 - (warnings.length * 10) - (fallbacks.length * 5))
        }
      });

    if (error) {
      console.warn('Failed to log transformation issues:', error);
    }
  } catch (logError) {
    console.warn('Error logging transformation issues:', logError);
  }
}
