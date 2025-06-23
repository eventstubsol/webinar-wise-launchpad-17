
/**
 * Participant data transformation utilities
 */
export class ParticipantTransformers {
  static transformParticipant(apiParticipant: any, webinarId: string) {
    return {
      webinar_id: webinarId,
      participant_id: apiParticipant.id || apiParticipant.participant_id,
      participant_email: apiParticipant.email,
      participant_name: apiParticipant.name,
      join_time: apiParticipant.join_time,
      leave_time: apiParticipant.leave_time,
      duration: apiParticipant.duration,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
  }

  // FIXED: Added missing normalizeEngagementData method
  static normalizeEngagementData(participant: any) {
    return {
      engagement_score: participant.attentiveness_score || 0,
      interaction_count: (participant.posted_chat ? 1 : 0) + 
                        (participant.answered_polling ? 1 : 0) + 
                        (participant.asked_question ? 1 : 0),
      total_participation_time: participant.duration || 0,
      camera_usage: participant.camera_on_duration || 0,
      screen_share_usage: (participant.share_application_duration || 0) + 
                          (participant.share_desktop_duration || 0)
    };
  }
}
