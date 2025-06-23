
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
}
