
import { WebinarStatusDetector } from './webinar-status-detector.ts';

/**
 * Transform webinar with enhanced status detection
 */
export function transformWebinarWithStatusDetection(apiWebinar: any, connectionId: string): any {
  // Detect proper status using the enhanced detector
  const detectedStatus = WebinarStatusDetector.detectStatus(apiWebinar);
  
  console.log(`Status detection for webinar ${apiWebinar.id}:`, {
    originalStatus: apiWebinar.status,
    detectedStatus: detectedStatus,
    startTime: apiWebinar.start_time
  });
  
  return {
    connection_id: connectionId,
    webinar_id: apiWebinar.id?.toString() || apiWebinar.webinar_id?.toString(),
    webinar_uuid: apiWebinar.uuid,
    host_id: apiWebinar.host_id,
    host_email: apiWebinar.host_email || null,
    topic: apiWebinar.topic,
    agenda: apiWebinar.agenda || null,
    type: apiWebinar.type || 5,
    status: detectedStatus,
    start_time: apiWebinar.start_time || null,
    duration: apiWebinar.duration || null,
    timezone: apiWebinar.timezone || null,
    registration_required: !!apiWebinar.registration_url,
    registration_type: apiWebinar.settings?.registration_type || null,
    registration_url: apiWebinar.registration_url || null,
    join_url: apiWebinar.join_url || null,
    approval_type: apiWebinar.settings?.approval_type || null,
    alternative_hosts: apiWebinar.settings?.alternative_hosts ? 
      apiWebinar.settings.alternative_hosts.split(',').map((h: string) => h.trim()) : null,
    max_registrants: apiWebinar.settings?.registrants_restrict_number || null,
    max_attendees: null,
    occurrence_id: apiWebinar.occurrences?.[0]?.occurrence_id || apiWebinar.occurrence_id || null,
    total_registrants: null,
    total_attendees: null,
    total_minutes: null,
    avg_attendance_duration: null,
    synced_at: new Date().toISOString(),
    
    // Enhanced field mapping
    password: apiWebinar.password || null,
    h323_password: apiWebinar.h323_password || apiWebinar.h323_passcode || null,
    pstn_password: apiWebinar.pstn_password || null,
    encrypted_password: apiWebinar.encrypted_password || apiWebinar.encrypted_passcode || null,
    settings: apiWebinar.settings || null,
    tracking_fields: apiWebinar.tracking_fields || null,
    recurrence: apiWebinar.recurrence || null,
    occurrences: apiWebinar.occurrences || null,
    
    // New fields from schema
    start_url: apiWebinar.start_url || null,
    encrypted_passcode: apiWebinar.encrypted_passcode || apiWebinar.encrypted_password || null,
    creation_source: apiWebinar.creation_source || null,
    is_simulive: apiWebinar.is_simulive || false,
    record_file_id: apiWebinar.record_file_id || null,
    transition_to_live: apiWebinar.transition_to_live || false,
    webinar_created_at: apiWebinar.created_at || null,
    
    updated_at: new Date().toISOString()
  };
}

/**
 * Transform registrant data for database insertion
 */
export function transformRegistrantForDatabase(apiRegistrant: any, webinarDbId: string): any {
  return {
    webinar_id: webinarDbId,
    registrant_id: apiRegistrant.id || apiRegistrant.registrant_id,
    registrant_email: apiRegistrant.email,
    first_name: apiRegistrant.first_name || null,
    last_name: apiRegistrant.last_name || null,
    address: apiRegistrant.address || null,
    city: apiRegistrant.city || null,
    state: apiRegistrant.state || null,
    zip: apiRegistrant.zip || null,
    country: apiRegistrant.country || null,
    phone: apiRegistrant.phone || null,
    comments: apiRegistrant.comments || null,
    custom_questions: apiRegistrant.custom_questions ? JSON.stringify(apiRegistrant.custom_questions) : null,
    registration_time: apiRegistrant.registration_time || apiRegistrant.create_time || new Date().toISOString(),
    source_id: apiRegistrant.source_id || null,
    tracking_source: apiRegistrant.tracking_source || null,
    status: apiRegistrant.status || 'approved',
    join_time: apiRegistrant.join_time || null,
    leave_time: apiRegistrant.leave_time || null,
    duration: apiRegistrant.duration || null,
    attended: !!apiRegistrant.join_time,
    job_title: apiRegistrant.job_title || null,
    purchasing_time_frame: apiRegistrant.purchasing_time_frame || null,
    role_in_purchase_process: apiRegistrant.role_in_purchase_process || null,
    no_of_employees: apiRegistrant.no_of_employees || null,
    industry: apiRegistrant.industry || null,
    org: apiRegistrant.org || null,
    language: apiRegistrant.language || null,
    join_url: apiRegistrant.join_url || null,
    create_time: apiRegistrant.create_time || apiRegistrant.registration_time || null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
}

/**
 * Transform participant data for database insertion with enhanced validation and constraint fixing
 */
export function transformParticipantForDatabase(apiParticipant: any, webinarDbId: string): any {
  console.log(`=== TRANSFORMING PARTICIPANT ===`);
  console.log(`Input webinarDbId: ${webinarDbId}`);
  console.log(`Input participant:`, JSON.stringify(apiParticipant, null, 2));
  
  // Validate required fields
  if (!webinarDbId) {
    throw new Error('webinarDbId is required for participant transformation');
  }
  
  // Handle different API response structures
  const details = apiParticipant.details?.[0] || apiParticipant;
  
  // Generate a unique participant_id if missing - this is the key fix
  const participantId = apiParticipant.id || 
                       apiParticipant.participant_id || 
                       apiParticipant.user_id || 
                       details.id ||
                       details.user_id ||
                       `participant_${webinarDbId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  // Extract participant name from various possible fields
  const participantName = apiParticipant.name || 
                         apiParticipant.participant_name || 
                         apiParticipant.user_name ||
                         details.name ||
                         details.participant_name ||
                         details.user_name ||
                         'Unknown Participant';
  
  // Extract participant email from various possible fields
  const participantEmail = apiParticipant.user_email || 
                          apiParticipant.participant_email || 
                          apiParticipant.email ||
                          details.user_email ||
                          details.participant_email ||
                          details.email ||
                          null;
  
  // Handle IP address conversion safely - ensure string or null
  let ipAddress = null;
  const rawIpAddress = details.ip_address || apiParticipant.ip_address;
  if (rawIpAddress) {
    try {
      ipAddress = String(rawIpAddress).trim();
      // Ensure it's not an empty string
      if (ipAddress === '') ipAddress = null;
    } catch (ipError) {
      console.log(`IP address conversion failed: ${ipError.message}`);
      ipAddress = null;
    }
  }
  
  // Extract timing and duration information
  const joinTime = apiParticipant.join_time || details.join_time || null;
  const leaveTime = apiParticipant.leave_time || details.leave_time || null;
  const duration = apiParticipant.duration || details.duration || null;
  
  const transformedParticipant = {
    webinar_id: webinarDbId,
    participant_id: participantId,
    registrant_id: null, // This would need to be linked separately
    participant_name: participantName,
    participant_email: participantEmail,
    participant_user_id: apiParticipant.user_id || details.user_id || null,
    join_time: joinTime,
    leave_time: leaveTime,
    duration: duration,
    attentiveness_score: apiParticipant.attentiveness_score || details.attentiveness_score || null,
    camera_on_duration: details.camera_on_duration || null,
    share_application_duration: details.share_application_duration || null,
    share_desktop_duration: details.share_desktop_duration || null,
    posted_chat: apiParticipant.posted_chat || details.posted_chat || false,
    raised_hand: apiParticipant.raised_hand || details.raised_hand || false,
    answered_polling: apiParticipant.answered_polling || details.answered_polling || false,
    asked_question: apiParticipant.asked_question || details.asked_question || false,
    device: details.device || apiParticipant.device || null,
    ip_address: ipAddress,
    location: details.location || apiParticipant.location || null,
    network_type: details.network_type || apiParticipant.network_type || null,
    version: details.version || apiParticipant.version || null,
    customer_key: apiParticipant.customer_key || details.customer_key || null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
  
  console.log(`=== TRANSFORMED PARTICIPANT ===`);
  console.log(`Output:`, JSON.stringify(transformedParticipant, null, 2));
  
  // Validate the transformed participant
  if (!transformedParticipant.participant_id) {
    throw new Error('Failed to generate participant_id');
  }
  
  if (!transformedParticipant.participant_name) {
    throw new Error('Failed to extract participant_name');
  }
  
  return transformedParticipant;
}
