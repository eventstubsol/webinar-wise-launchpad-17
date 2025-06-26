
/**
 * Enhanced participant data transformation with comprehensive field mapping
 * FIXED: Now maps ALL available Zoom API fields to correct database columns
 */

/**
 * Transform Zoom API participant to database format - COMPREHENSIVE VERSION
 * Maps all available fields from Zoom API response to database schema
 */
export function transformParticipantForDatabase(
  apiParticipant: any, 
  webinarDbId: string, 
  debugMode = false
): any {
  if (!apiParticipant) {
    throw new Error('Cannot transform null/undefined participant');
  }
  
  if (!webinarDbId) {
    throw new Error('Cannot transform participant without webinar DB ID');
  }

  if (debugMode) {
    console.log(`🔄 Transforming participant:`, {
      id: apiParticipant.id,
      email: apiParticipant.email,
      name: apiParticipant.name,
      join_time: apiParticipant.join_time
    });
  }

  // CRITICAL: Ensure participant_id is extracted correctly
  const participantId = apiParticipant.id || 
                       apiParticipant.participant_id || 
                       apiParticipant.user_id || 
                       null;

  if (!participantId) {
    console.error('❌ CRITICAL: No participant ID found in API response:', apiParticipant);
    throw new Error('Participant ID is required but not found in API response');
  }

  // CRITICAL: Ensure name field is present (NOT NULL constraint)
  let participantName = apiParticipant.name || 
                       apiParticipant.participant_name || 
                       apiParticipant.user_name ||
                       apiParticipant.email ||
                       `Participant ${participantId}`;

  // Generate session ID for tracking multiple sessions
  const sessionId = apiParticipant.email && apiParticipant.join_time 
    ? `${apiParticipant.email}_${new Date(apiParticipant.join_time).getTime()}`
    : `${participantId}_${Date.now()}`;

  // Transform all available fields with proper mapping
  const transformed = {
    // Required fields
    webinar_id: webinarDbId,
    participant_id: participantId,
    name: participantName.trim(),
    
    // Core participant information
    participant_name: apiParticipant.name || apiParticipant.participant_name || null,
    participant_email: apiParticipant.email || null,
    email: apiParticipant.email || null, // Map to both fields for compatibility
    participant_user_id: apiParticipant.user_id || null,
    participant_uuid: apiParticipant.participant_uuid || apiParticipant.uuid || null,
    registrant_id: apiParticipant.registrant_id || null,
    user_id: apiParticipant.user_id || null,
    customer_key: apiParticipant.customer_key || null,
    
    // Session tracking - ENHANCED
    participant_session_id: sessionId,
    session_sequence: 1, // Will be calculated by database if multiple sessions
    is_rejoin_session: false, // Will be calculated by database
    
    // Timing information
    join_time: apiParticipant.join_time || null,
    leave_time: apiParticipant.leave_time || null,
    duration: apiParticipant.duration || 0,
    
    // Technical information
    device: apiParticipant.device || null,
    ip_address: apiParticipant.ip_address || null,
    location: apiParticipant.location || null,
    network_type: apiParticipant.network_type || null,
    version: apiParticipant.version || null,
    
    // Status information
    status: apiParticipant.status || 'joined',
    participant_status: apiParticipant.participant_status || 'in_meeting',
    failover: apiParticipant.failover || false,
    
    // Engagement metrics - FIXED: Now properly mapped
    attentiveness_score: apiParticipant.attentiveness_score || null,
    camera_on_duration: apiParticipant.camera_on_duration || 0,
    share_application_duration: apiParticipant.share_application_duration || 0,
    share_desktop_duration: apiParticipant.share_desktop_duration || 0,
    share_whiteboard_duration: apiParticipant.share_whiteboard_duration || 0,
    
    // Interaction flags - FIXED: Now properly mapped
    posted_chat: apiParticipant.posted_chat || false,
    raised_hand: apiParticipant.raised_hand || false,
    answered_polling: apiParticipant.answered_polling || false,
    asked_question: apiParticipant.asked_question || false,
    
    // Timestamps
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  if (debugMode) {
    console.log(`✅ Transformed participant:`, {
      participant_id: transformed.participant_id,
      name: transformed.name,
      email: transformed.email,
      session_id: transformed.participant_session_id,
      attentiveness_score: transformed.attentiveness_score,
      engagement_flags: {
        posted_chat: transformed.posted_chat,
        answered_polling: transformed.answered_polling,
        asked_question: transformed.asked_question
      }
    });
  }

  return transformed;
}

/**
 * Validate participant data before database insertion
 */
export function validateParticipantData(participant: any, index: number): any {
  // CRITICAL: Validate required fields
  if (!participant.webinar_id) {
    throw new Error(`Participant ${index}: webinar_id is required`);
  }
  
  if (!participant.participant_id) {
    throw new Error(`Participant ${index}: participant_id is required`);
  }
  
  if (!participant.name || typeof participant.name !== 'string' || participant.name.trim() === '') {
    throw new Error(`Participant ${index}: name is required and cannot be empty`);
  }

  // Ensure name is properly trimmed
  participant.name = participant.name.trim();
  
  // Validate numeric fields
  const numericFields = ['duration', 'attentiveness_score', 'camera_on_duration', 
                        'share_application_duration', 'share_desktop_duration', 'share_whiteboard_duration'];
  
  numericFields.forEach(field => {
    if (participant[field] !== null && participant[field] !== undefined) {
      const value = parseInt(participant[field]);
      participant[field] = isNaN(value) ? 0 : value;
    }
  });

  // Validate boolean fields
  const booleanFields = ['posted_chat', 'raised_hand', 'answered_polling', 'asked_question', 
                        'failover', 'is_rejoin_session'];
  
  booleanFields.forEach(field => {
    if (participant[field] !== null && participant[field] !== undefined) {
      participant[field] = Boolean(participant[field]);
    }
  });

  return participant;
}
