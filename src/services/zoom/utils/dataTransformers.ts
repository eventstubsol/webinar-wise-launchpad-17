
import { ZoomWebinar, ZoomRegistrant, ZoomParticipant, ZoomPoll, ZoomQna } from '@/types/zoom';

/**
 * Data transformation utilities for converting Zoom API responses to database formats
 */
export class ZoomDataTransformers {
  /**
   * Transform Zoom API webinar to database format
   */
  static transformWebinarForDatabase(
    apiWebinar: any,
    connectionId: string
  ): Omit<ZoomWebinar, 'id' | 'created_at' | 'updated_at'> {
    return {
      connection_id: connectionId,
      webinar_id: apiWebinar.id,
      webinar_uuid: apiWebinar.uuid,
      host_id: apiWebinar.host_id,
      host_email: apiWebinar.host_email || null,
      topic: apiWebinar.topic,
      agenda: apiWebinar.agenda || null,
      type: apiWebinar.type,
      status: apiWebinar.status,
      start_time: apiWebinar.start_time || null,
      duration: apiWebinar.duration || null,
      timezone: apiWebinar.timezone || null,
      registration_required: !!apiWebinar.registration_url,
      registration_type: apiWebinar.settings?.registration_type || null,
      registration_url: apiWebinar.registration_url || null,
      join_url: apiWebinar.join_url || null,
      approval_type: apiWebinar.settings?.approval_type || null,
      alternative_hosts: apiWebinar.settings?.alternative_hosts ? 
        apiWebinar.settings.alternative_hosts.split(',').map(h => h.trim()) : null,
      max_registrants: null,
      max_attendees: null,
      occurrence_id: apiWebinar.occurrences?.[0]?.occurrence_id || null,
      total_registrants: null,
      total_attendees: null,
      total_minutes: null,
      avg_attendance_duration: null,
      synced_at: new Date().toISOString(),
    };
  }

  /**
   * Transform Zoom API registrant to database format
   */
  static transformRegistrant(
    apiRegistrant: any,
    webinarId: string
  ): Omit<ZoomRegistrant, 'id' | 'created_at' | 'updated_at'> {
    return {
      webinar_id: webinarId,
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
      custom_questions: apiRegistrant.custom_questions || null,
      registration_time: apiRegistrant.registration_time,
      source_id: apiRegistrant.source_id || null,
      tracking_source: apiRegistrant.tracking_source || null,
      status: apiRegistrant.status || 'approved',
      join_time: apiRegistrant.join_time || null,
      leave_time: apiRegistrant.leave_time || null,
      duration: apiRegistrant.duration || null,
      attended: !!apiRegistrant.join_time,
    };
  }

  /**
   * Transform Zoom API participant to database format
   */
  static transformParticipant(
    apiParticipant: any,
    webinarId: string
  ): Omit<ZoomParticipant, 'id' | 'created_at' | 'updated_at'> {
    const details = apiParticipant.details?.[0] || {};
    
    return {
      webinar_id: webinarId,
      participant_id: apiParticipant.id || apiParticipant.participant_id,
      registrant_id: null, // This would need to be linked separately
      participant_name: apiParticipant.name || apiParticipant.participant_name,
      participant_email: apiParticipant.user_email || apiParticipant.participant_email || null,
      participant_user_id: apiParticipant.user_id || null,
      join_time: apiParticipant.join_time,
      leave_time: apiParticipant.leave_time || null,
      duration: apiParticipant.duration || null,
      attentiveness_score: apiParticipant.attentiveness_score || null,
      camera_on_duration: details.camera_on_duration || null,
      share_application_duration: details.share_application_duration || null,
      share_desktop_duration: details.share_desktop_duration || null,
      posted_chat: apiParticipant.posted_chat || false,
      raised_hand: apiParticipant.raised_hand || false,
      answered_polling: apiParticipant.answered_polling || false,
      asked_question: apiParticipant.asked_question || false,
      device: details.device || null,
      ip_address: details.ip_address || null,
      location: details.location || null,
      network_type: details.network_type || null,
      version: details.version || null,
      customer_key: apiParticipant.customer_key || null,
    };
  }

  /**
   * Transform Zoom API poll to database format
   */
  static transformPoll(
    apiPoll: any,
    webinarId: string
  ): Omit<ZoomPoll, 'id' | 'created_at' | 'updated_at'> {
    return {
      webinar_id: webinarId,
      poll_id: apiPoll.id || apiPoll.poll_id,
      poll_title: apiPoll.title || apiPoll.poll_title,
      poll_type: apiPoll.type || null,
      status: apiPoll.status || null,
      anonymous: apiPoll.anonymous || false,
      questions: apiPoll.questions || [],
    };
  }

  /**
   * Transform Zoom API Q&A to database format
   */
  static transformQnA(
    apiQnA: any,
    webinarId: string
  ): Omit<ZoomQna, 'id' | 'created_at' | 'updated_at'> {
    return {
      webinar_id: webinarId,
      question_id: apiQnA.question_id || apiQnA.id,
      question: apiQnA.question,
      answer: apiQnA.answer || null,
      asker_name: apiQnA.asker_name,
      asker_email: apiQnA.asker_email || null,
      answered_by: apiQnA.answered_by || null,
      asked_at: apiQnA.asked_at || apiQnA.question_time,
      answered_at: apiQnA.answered_at || apiQnA.answer_time || null,
      upvote_count: apiQnA.upvote_count || 0,
      status: apiQnA.status || 'open',
      anonymous: apiQnA.anonymous || false,
    };
  }

  /**
   * Calculate webinar summary metrics from participants data
   */
  static calculateWebinarMetrics(participants: any[]): {
    total_attendees: number;
    total_minutes: number;
    avg_attendance_duration: number;
  } {
    const totalAttendees = participants.length;
    const totalMinutes = participants.reduce((sum, p) => sum + (p.duration || 0), 0);
    const avgDuration = totalAttendees > 0 ? Math.round(totalMinutes / totalAttendees) : 0;

    return {
      total_attendees: totalAttendees,
      total_minutes: totalMinutes,
      avg_attendance_duration: avgDuration,
    };
  }

  /**
   * Extract custom question responses from registrant data
   */
  static extractCustomQuestions(registrant: any): Array<{ title: string; value: string }> {
    if (!registrant.custom_questions || !Array.isArray(registrant.custom_questions)) {
      return [];
    }

    return registrant.custom_questions.map((q: any) => ({
      title: q.title || q.question || '',
      value: q.value || q.answer || '',
    }));
  }

  /**
   * Normalize participant engagement data
   */
  static normalizeEngagementData(participant: any): {
    engagement_score: number;
    participation_summary: {
      polls_answered: boolean;
      questions_asked: boolean;
      chat_messages: boolean;
      hand_raised: boolean;
      camera_usage_percent: number;
    };
  } {
    const duration = participant.duration || 0;
    const cameraOnDuration = participant.camera_on_duration || 0;
    const cameraUsagePercent = duration > 0 ? Math.round((cameraOnDuration / duration) * 100) : 0;

    // Calculate engagement score (0-100)
    let score = 0;
    score += Math.min(40, (duration / 60) * 10); // Duration points
    if (participant.answered_polling) score += 20;
    if (participant.asked_question) score += 20;
    if (participant.posted_chat) score += 10;
    if (participant.raised_hand) score += 10;

    return {
      engagement_score: Math.round(Math.min(100, score)),
      participation_summary: {
        polls_answered: !!participant.answered_polling,
        questions_asked: !!participant.asked_question,
        chat_messages: !!participant.posted_chat,
        hand_raised: !!participant.raised_hand,
        camera_usage_percent: cameraUsagePercent,
      },
    };
  }
}
