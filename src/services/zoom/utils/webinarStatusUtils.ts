
/**
 * Enhanced webinar status utilities with proper past webinar detection
 */

export interface WebinarStatusInfo {
  status: 'upcoming' | 'live' | 'ended' | 'cancelled';
  isPastWebinar: boolean;
  isEligibleForParticipantSync: boolean;
  minutesSinceEnd?: number;
  minutesUntilStart?: number;
}

/**
 * FIXED: Properly determine if a webinar is past based on start time and duration
 */
export function determineIfPastWebinar(webinarData: any): boolean {
  console.log(`🕒 ENHANCED determineIfPastWebinar for webinar ${webinarData.id}`);
  
  if (!webinarData.start_time) {
    console.log(`❌ No start_time available - cannot determine if past webinar`);
    return false;
  }

  const now = new Date();
  const startTime = new Date(webinarData.start_time);
  const duration = webinarData.duration || 60; // Default 60 minutes
  const estimatedEndTime = new Date(startTime.getTime() + (duration * 60 * 1000));
  
  // Add 10 minute buffer after estimated end time
  const bufferEndTime = new Date(estimatedEndTime.getTime() + (10 * 60 * 1000));
  
  const isPast = now > bufferEndTime;
  
  console.log(`📊 PAST WEBINAR ANALYSIS:`);
  console.log(`  - Start time: ${startTime.toISOString()}`);
  console.log(`  - Current time: ${now.toISOString()}`);
  console.log(`  - Duration: ${duration} minutes`);
  console.log(`  - Estimated end: ${estimatedEndTime.toISOString()}`);
  console.log(`  - Buffer end: ${bufferEndTime.toISOString()}`);
  console.log(`  - Is past webinar: ${isPast}`);
  
  return isPast;
}

/**
 * ENHANCED: Calculate comprehensive webinar status with proper timing logic
 */
export function calculateWebinarStatus(webinarData: any): WebinarStatusInfo {
  console.log(`🔍 CALCULATING STATUS for webinar ${webinarData.id}`);
  
  if (!webinarData.start_time) {
    return {
      status: 'upcoming',
      isPastWebinar: false,
      isEligibleForParticipantSync: false
    };
  }

  const now = new Date();
  const startTime = new Date(webinarData.start_time);
  const duration = webinarData.duration || 60;
  const estimatedEndTime = new Date(startTime.getTime() + (duration * 60 * 1000));
  const bufferEndTime = new Date(estimatedEndTime.getTime() + (5 * 60 * 1000));

  let status: 'upcoming' | 'live' | 'ended' | 'cancelled';
  let isPastWebinar: boolean;
  let isEligibleForParticipantSync: boolean;
  let minutesSinceEnd: number | undefined;
  let minutesUntilStart: number | undefined;

  // Check if webinar is cancelled or deleted from API status
  if (webinarData.status && ['cancelled', 'deleted'].includes(webinarData.status.toLowerCase())) {
    status = 'cancelled';
    isPastWebinar = false;
    isEligibleForParticipantSync = false;
  } else if (now < startTime) {
    // Future webinar
    status = 'upcoming';
    isPastWebinar = false;
    isEligibleForParticipantSync = false;
    minutesUntilStart = Math.round((startTime.getTime() - now.getTime()) / (1000 * 60));
  } else if (now >= startTime && now <= bufferEndTime) {
    // Currently in progress or just ended (within buffer)
    status = 'live';
    isPastWebinar = false;
    isEligibleForParticipantSync = false;
  } else {
    // Past webinar (ended beyond buffer)
    status = 'ended';
    isPastWebinar = true;
    isEligibleForParticipantSync = true;
    minutesSinceEnd = Math.round((now.getTime() - estimatedEndTime.getTime()) / (1000 * 60));
  }

  console.log(`✅ STATUS CALCULATION RESULT:`);
  console.log(`  - Status: ${status}`);
  console.log(`  - Is past webinar: ${isPastWebinar}`);
  console.log(`  - Eligible for participant sync: ${isEligibleForParticipantSync}`);
  console.log(`  - Minutes since end: ${minutesSinceEnd}`);
  console.log(`  - Minutes until start: ${minutesUntilStart}`);

  return {
    status,
    isPastWebinar,
    isEligibleForParticipantSync,
    minutesSinceEnd,
    minutesUntilStart
  };
}

/**
 * FIXED: Determine participant sync status based on webinar timing and data availability
 */
export function determineParticipantSyncStatus(webinarData: any): 'not_applicable' | 'pending' | 'completed' | 'failed' {
  console.log(`🔄 DETERMINING PARTICIPANT SYNC STATUS for webinar ${webinarData.id}`);
  
  const statusInfo = calculateWebinarStatus(webinarData);
  
  if (!statusInfo.isEligibleForParticipantSync) {
    console.log(`❌ Not eligible for participant sync - status: ${statusInfo.status}`);
    return 'not_applicable';
  }
  
  // Check if we have existing participant data
  if (webinarData.total_attendees && webinarData.total_attendees > 0) {
    console.log(`✅ Has existing participant data - marking as completed`);
    return 'completed';
  }
  
  console.log(`🔄 Past webinar without participant data - marking as pending`);
  return 'pending';
}
