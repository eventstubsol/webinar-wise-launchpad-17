import { supabase } from '@/integrations/supabase/client';

export class ParticipantHistoryService {
  static async getParticipantHistory(participantEmail: string, userId: string) {
    try {
      // Get user's zoom connections first
      const { data: connections } = await supabase
        .from('zoom_connections')
        .select('id')
        .eq('user_id', userId);

      if (!connections || connections.length === 0) {
        return { participantHistory: [], summary: null };
      }

      const connectionIds = connections.map(c => c.id);

      // Fetch participant data with webinar info, using correct field name
      const { data: participants, error: participantsError } = await supabase
        .from('zoom_participants')
        .select(`
          *,
          zoom_webinars!inner(
            id,
            topic,
            start_time,
            duration,
            connection_id
          )
        `)
        .eq('participant_email', participantEmail) // Use correct field name
        .in('zoom_webinars.connection_id', connectionIds)
        .order('zoom_webinars.start_time', { ascending: false });

      if (participantsError) {
        console.error('Error fetching participant history:', participantsError);
        throw participantsError;
      }

      if (!participants || participants.length === 0) {
        return { participantHistory: [], summary: null };
      }

      // Process participant data, ensuring we handle the database structure correctly
      const participantHistory = participants
        .filter(p => p.zoom_webinars && !Array.isArray(p.zoom_webinars)) // Filter out query errors
        .map(participant => ({
          webinarId: participant.webinar_id,
          webinarTitle: (participant.zoom_webinars as any)?.topic || 'Unknown',
          webinarDate: (participant.zoom_webinars as any)?.start_time || null,
          participantName: participant.name || 'Unknown', // Use correct field name
          joinTime: participant.join_time,
          leaveTime: participant.leave_time,
          duration: participant.duration || 0,
          attentionScore: participant.attentiveness_score || 0,
          askedQuestion: participant.asked_question || false,
          answeredPolling: participant.answered_polling || false,
        }));

      // Calculate summary statistics
      const summary = this.calculateSummary(participantHistory);

      return { participantHistory, summary };
    } catch (error) {
      console.error('Error in getParticipantHistory:', error);
      throw error;
    }
  }

  static async calculateParticipantHistory(participantEmail: string, userId: string) {
    return this.getParticipantHistory(participantEmail, userId);
  }

  static async getTopParticipants(userId: string, limit: number = 10) {
    try {
      // Get user's zoom connections
      const { data: connections } = await supabase
        .from('zoom_connections')
        .select('id')
        .eq('user_id', userId);

      if (!connections || connections.length === 0) {
        return [];
      }

      const connectionIds = connections.map(c => c.id);

      // Get participant engagement data using correct field names
      const { data: participants } = await supabase
        .from('zoom_participants')
        .select(`
          participant_email,
          name,
          duration,
          attentiveness_score,
          asked_question,
          answered_polling,
          zoom_webinars!inner(connection_id)
        `)
        .in('zoom_webinars.connection_id', connectionIds);

      if (!participants) return [];

      // Group by email and calculate engagement scores
      const participantMap = new Map();
      
      participants
        .filter(p => p.zoom_webinars && !Array.isArray(p.zoom_webinars)) // Filter valid data
        .forEach(participant => {
          const email = participant.participant_email;
          if (!email) return;

          if (!participantMap.has(email)) {
            participantMap.set(email, {
              email,
              name: participant.name || 'Unknown',
              webinarsAttended: 0,
              totalDuration: 0,
              totalAttentionScore: 0,
              questionsAsked: 0,
              pollsAnswered: 0,
            });
          }

          const summary = participantMap.get(email);
          summary.webinarsAttended++;
          summary.totalDuration += participant.duration || 0;
          summary.totalAttentionScore += participant.attentiveness_score || 0;
          if (participant.asked_question) summary.questionsAsked++;
          if (participant.answered_polling) summary.pollsAnswered++;
        });

      // Calculate engagement scores and sort
      const topParticipants = Array.from(participantMap.values())
        .map(p => ({
          ...p,
          averageAttentionScore: p.webinarsAttended > 0 ? p.totalAttentionScore / p.webinarsAttended : 0,
          averageDuration: p.webinarsAttended > 0 ? p.totalDuration / p.webinarsAttended : 0,
          engagementScore: this.calculateEngagementScore(p),
        }))
        .sort((a, b) => b.engagementScore - a.engagementScore)
        .slice(0, limit);

      return topParticipants;
    } catch (error) {
      console.error('Error getting top participants:', error);
      return [];
    }
  }

  private static calculateSummary(history: any[]) {
    if (history.length === 0) return null;

    const totalDuration = history.reduce((sum, h) => sum + h.duration, 0);
    const totalAttentionScore = history.reduce((sum, h) => sum + h.attentionScore, 0);
    const questionsAsked = history.filter(h => h.askedQuestion).length;
    const pollsAnswered = history.filter(h => h.answeredPolling).length;

    return {
      totalWebinarsAttended: history.length,
      totalTimeSpent: totalDuration,
      averageTimePerWebinar: totalDuration / history.length,
      averageAttentionScore: totalAttentionScore / history.length,
      totalQuestionsAsked: questionsAsked,
      totalPollsAnswered: pollsAnswered,
      engagementRate: ((questionsAsked + pollsAnswered) / history.length) * 100,
      firstWebinarDate: history[history.length - 1]?.webinarDate,
      lastWebinarDate: history[0]?.webinarDate,
    };
  }

  private static calculateEngagementScore(participant: any): number {
    const {
      webinarsAttended,
      averageAttentionScore,
      averageDuration,
      questionsAsked,
      pollsAnswered,
    } = participant;

    // Weight different engagement factors
    const attendanceWeight = webinarsAttended * 10;
    const attentionWeight = averageAttentionScore * 0.3;
    const durationWeight = (averageDuration / 3600) * 20; // Convert to hours
    const interactionWeight = (questionsAsked + pollsAnswered) * 15;

    return Math.min(100, attendanceWeight + attentionWeight + durationWeight + interactionWeight);
  }
}
