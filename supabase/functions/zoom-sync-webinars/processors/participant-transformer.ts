
/**
 * FIXED: Transform Zoom API participant to database format with proper field mapping
 */
export function transformParticipantForDatabase(apiParticipant: any, webinarDbId: string, debugMode = false): any {
  if (debugMode) {
    console.log(`DEBUG: Starting participant transformation:`);
    console.log(`  - Input participant ID: ${apiParticipant.id || apiParticipant.participant_id || 'MISSING'}`);
    console.log(`  - Input participant name: ${apiParticipant.name || apiParticipant.participant_name || 'MISSING'}`);
    console.log(`  - Input participant email: ${apiParticipant.user_email || apiParticipant.participant_email || apiParticipant.email || 'MISSING'}`);
  }

  // FIXED: Map Zoom API status to database participant_status enum
  let participantStatus = 'attended'; // Default status
  
  if (debugMode) {
    console.log(`  - Original status: ${apiParticipant.status || 'MISSING'}`);
  }
  
  // FIXED: Enhanced status mapping to use correct enum values
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
    participantStatus = statusMap[apiParticipant.status.toLowerCase()] || 'attended';
  }

  // Enhanced timing logic
  const hasJoinTime = !!apiParticipant.join_time;
  const hasLeaveTime = !!apiParticipant.leave_time;
  
  if (debugMode) {
    console.log(`  - Timing data: join=${hasJoinTime}, leave=${hasLeaveTime}`);
    console.log(`  - Join time: ${apiParticipant.join_time || 'MISSING'}`);
    console.log(`  - Leave time: ${apiParticipant.leave_time || 'MISSING'}`);
    console.log(`  - Duration: ${apiParticipant.duration || 'MISSING'}`);
  }

  // If participant has timing data, they were definitely in the meeting
  if (hasJoinTime && hasLeaveTime) {
    participantStatus = 'attended';
  }

  const transformed = {
    webinar_id: webinarDbId,
    participant_id: apiParticipant.id || apiParticipant.participant_id,
    registrant_id: apiParticipant.registrant_id || null,
    participant_name: apiParticipant.name || apiParticipant.participant_name || null,
    participant_email: apiParticipant.user_email || apiParticipant.participant_email || apiParticipant.email || null,
    participant_user_id: apiParticipant.user_id || null,
    join_time: apiParticipant.join_time || null,
    leave_time: apiParticipant.leave_time || null,
    duration: apiParticipant.duration || null,
    attentiveness_score: apiParticipant.attentiveness_score || null,
    camera_on_duration: apiParticipant.camera_on_duration || null,
    share_application_duration: apiParticipant.share_application_duration || null,
    share_desktop_duration: apiParticipant.share_desktop_duration || null,
    posted_chat: apiParticipant.posted_chat || false,
    raised_hand: apiParticipant.raised_hand || false,
    answered_polling: apiParticipant.answered_polling || false,
    asked_question: apiParticipant.asked_question || false,
    device: apiParticipant.device || null,
    ip_address: apiParticipant.ip_address ? String(apiParticipant.ip_address) : null,
    location: apiParticipant.location || null,
    network_type: apiParticipant.network_type || null,
    version: apiParticipant.version || null,
    customer_key: apiParticipant.customer_key || null,
    // FIXED: Use 'status' field to match database schema
    status: participantStatus,
    // NEW: Added missing fields from API spec
    failover: apiParticipant.failover || false,
    internal_user: apiParticipant.internal_user || false
  };

  if (debugMode) {
    console.log(`  - Mapped status: ${participantStatus}`);
    console.log(`  - Transformation completed with ${Object.keys(transformed).length} fields`);
    console.log(`  - Required fields check:`);
    console.log(`    * webinar_id: ${transformed.webinar_id ? 'OK' : 'MISSING'}`);
    console.log(`    * participant_id: ${transformed.participant_id ? 'OK' : 'MISSING'}`);
    console.log(`    * status: ${transformed.status ? 'OK' : 'MISSING'}`);
  }

  return transformed;
}
