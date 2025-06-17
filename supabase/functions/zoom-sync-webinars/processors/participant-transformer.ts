
/**
 * Transform Zoom API participant to database format with enhanced logging
 */
export function transformParticipantForDatabase(apiParticipant: any, webinarDbId: string, debugMode = false): any {
  if (debugMode) {
    console.log(`DEBUG: Starting participant transformation:`);
    console.log(`  - Input participant ID: ${apiParticipant.id || apiParticipant.participant_id || 'MISSING'}`);
    console.log(`  - Input participant name: ${apiParticipant.name || apiParticipant.participant_name || 'MISSING'}`);
    console.log(`  - Input participant email: ${apiParticipant.user_email || apiParticipant.participant_email || apiParticipant.email || 'MISSING'}`);
  }

  // Map Zoom API status to database participant_status enum
  let participantStatus = 'in_meeting'; // Default status
  
  if (debugMode) {
    console.log(`  - Original status: ${apiParticipant.status || 'MISSING'}`);
  }
  
  // If participant has join_time but no leave_time, they might still be in meeting
  // If they have both join_time and leave_time, they were in meeting and left
  // For simplicity in this sync, we'll mark all as 'in_meeting' since they participated
  if (apiParticipant.status) {
    const statusMap: { [key: string]: string } = {
      'in_meeting': 'in_meeting',
      'in_waiting_room': 'in_waiting_room',
      'left': 'in_meeting', // They were in meeting but left
      'joined': 'in_meeting'
    };
    participantStatus = statusMap[apiParticipant.status.toLowerCase()] || 'in_meeting';
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
    participantStatus = 'in_meeting';
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
    participant_status: participantStatus
  };

  if (debugMode) {
    console.log(`  - Mapped status: ${participantStatus}`);
    console.log(`  - Transformation completed with ${Object.keys(transformed).length} fields`);
    console.log(`  - Required fields check:`);
    console.log(`    * webinar_id: ${transformed.webinar_id ? 'OK' : 'MISSING'}`);
    console.log(`    * participant_id: ${transformed.participant_id ? 'OK' : 'MISSING'}`);
    console.log(`    * participant_status: ${transformed.participant_status ? 'OK' : 'MISSING'}`);
  }

  return transformed;
}
