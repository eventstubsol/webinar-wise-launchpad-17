
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
      // Session tracking fields will be handled by database triggers/functions
      session_sequence: 1, // Default to first session
      is_rejoin_session: false, // Will be calculated by database
      participant_session_id: apiParticipant.email && apiParticipant.join_time 
        ? `${apiParticipant.email}_${new Date(apiParticipant.join_time).getTime()}`
        : null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
  }

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

  /**
   * Analyze participant session patterns
   */
  static analyzeSessionPatterns(participants: any[]) {
    const sessionAnalysis = {
      totalParticipants: participants.length,
      uniqueParticipants: new Set(participants.map(p => p.participant_email)).size,
      rejoinSessions: participants.filter(p => p.is_rejoin_session).length,
      avgSessionsPerParticipant: 0,
      maxSessionsPerParticipant: 0
    };

    // Group by participant email to analyze session patterns
    const participantSessions: Record<string, any[]> = participants.reduce((acc, p) => {
      if (p.participant_email) {
        if (!acc[p.participant_email]) {
          acc[p.participant_email] = [];
        }
        acc[p.participant_email].push(p);
      }
      return acc;
    }, {} as Record<string, any[]>);

    // Calculate session statistics
    const sessionCounts: number[] = Object.values(participantSessions).map((sessions: any[]) => sessions.length);
    sessionAnalysis.avgSessionsPerParticipant = sessionCounts.length > 0 
      ? sessionCounts.reduce((sum, count) => sum + count, 0) / sessionCounts.length 
      : 0;
    sessionAnalysis.maxSessionsPerParticipant = sessionCounts.length > 0 ? Math.max(...sessionCounts) : 0;

    return sessionAnalysis;
  }
}
