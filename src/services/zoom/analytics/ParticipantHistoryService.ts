
import { supabase } from '@/integrations/supabase/client';

export interface ParticipantEngagementHistory {
  participantEmail: string;
  participantName: string;
  webinarHistory: WebinarParticipation[];
  engagementTrend: EngagementTrendData;
  totalWebinarsAttended: number;
  averageEngagementScore: number;
  totalHoursAttended: number;
}

export interface WebinarParticipation {
  webinarId: string;
  webinarTopic: string;
  webinarDate: string;
  duration: number;
  engagementScore: number;
  joinTime: string;
  leaveTime: string;
  interactionMetrics: {
    askedQuestions: boolean;
    answeredPolls: boolean;
    sentChatMessages: boolean;
    raisedHand: boolean;
  };
}

export interface EngagementTrendData {
  trend: 'improving' | 'stable' | 'declining';
  changePercentage: number;
  dataPoints: Array<{
    date: string;
    score: number;
  }>;
}

export class ParticipantHistoryService {
  static async getParticipantEngagementHistory(
    participantEmail: string,
    connectionId: string,
    dateRange?: { startDate: string; endDate: string }
  ): Promise<ParticipantEngagementHistory | null> {
    try {
      let query = supabase
        .from('zoom_participants')
        .select(`
          *,
          zoom_webinars!inner(
            id,
            topic,
            start_time,
            connection_id
          )
        `)
        .eq('email', participantEmail)
        .eq('zoom_webinars.connection_id', connectionId);

      if (dateRange) {
        query = query
          .gte('zoom_webinars.start_time', dateRange.startDate)
          .lte('zoom_webinars.start_time', dateRange.endDate);
      }

      const { data: participantData, error } = await query.order('zoom_webinars.start_time', { ascending: false });

      if (error || !participantData || participantData.length === 0) {
        return null;
      }

      // Build webinar history with safe property access
      const webinarHistory: WebinarParticipation[] = participantData.map(participation => ({
        webinarId: participation.webinar_id || '',
        webinarTopic: participation.zoom_webinars?.topic || 'Unknown Topic',
        webinarDate: participation.zoom_webinars?.start_time || '',
        duration: participation.duration || 0,
        engagementScore: (participation as any).attentiveness_score || 0,
        joinTime: participation.join_time || '',
        leaveTime: participation.leave_time || '',
        interactionMetrics: {
          askedQuestions: (participation as any).asked_questions || false,
          answeredPolls: (participation as any).answered_polls || false,
          sentChatMessages: (participation as any).sent_chat_messages || false,
          raisedHand: (participation as any).raised_hand || false,
        }
      }));

      // Calculate aggregate metrics
      const totalWebinarsAttended = webinarHistory.length;
      const averageEngagementScore = webinarHistory.reduce((sum, w) => sum + w.engagementScore, 0) / totalWebinarsAttended;
      const totalHoursAttended = webinarHistory.reduce((sum, w) => sum + w.duration, 0) / 60; // Convert to hours

      // Calculate engagement trend
      const engagementTrend = this.calculateEngagementTrend(webinarHistory);

      return {
        participantEmail,
        participantName: participantData[0].participant_name || 'Unknown',
        webinarHistory,
        engagementTrend,
        totalWebinarsAttended,
        averageEngagementScore,
        totalHoursAttended
      };
    } catch (error) {
      console.error('Error getting participant engagement history:', error);
      return null;
    }
  }

  private static calculateEngagementTrend(webinarHistory: WebinarParticipation[]): EngagementTrendData {
    if (webinarHistory.length < 2) {
      return {
        trend: 'stable',
        changePercentage: 0,
        dataPoints: webinarHistory.map(w => ({
          date: w.webinarDate,
          score: w.engagementScore
        }))
      };
    }

    // Sort by date (oldest first)
    const sortedHistory = [...webinarHistory].sort((a, b) => 
      new Date(a.webinarDate).getTime() - new Date(b.webinarDate).getTime()
    );

    // Calculate trend using first and last quarters of data
    const quarterSize = Math.max(1, Math.floor(sortedHistory.length / 4));
    const firstQuarter = sortedHistory.slice(0, quarterSize);
    const lastQuarter = sortedHistory.slice(-quarterSize);

    const firstQuarterAvg = firstQuarter.reduce((sum, w) => sum + w.engagementScore, 0) / firstQuarter.length;
    const lastQuarterAvg = lastQuarter.reduce((sum, w) => sum + w.engagementScore, 0) / lastQuarter.length;

    const changePercentage = ((lastQuarterAvg - firstQuarterAvg) / firstQuarterAvg) * 100;

    let trend: 'improving' | 'stable' | 'declining' = 'stable';
    if (changePercentage > 10) trend = 'improving';
    else if (changePercentage < -10) trend = 'declining';

    return {
      trend,
      changePercentage,
      dataPoints: sortedHistory.map(w => ({
        date: w.webinarDate,
        score: w.engagementScore
      }))
    };
  }

  static async getTopEngagedParticipants(
    connectionId: string,
    limit: number = 10,
    dateRange?: { startDate: string; endDate: string }
  ): Promise<ParticipantEngagementHistory[]> {
    try {
      let query = supabase
        .from('zoom_participants')
        .select(`
          email,
          name,
          zoom_webinars!inner(connection_id, start_time)
        `)
        .eq('zoom_webinars.connection_id', connectionId);

      if (dateRange) {
        query = query
          .gte('zoom_webinars.start_time', dateRange.startDate)
          .lte('zoom_webinars.start_time', dateRange.endDate);
      }

      const { data: participants, error } = await query;

      if (error || !participants) {
        return [];
      }

      // Get unique participant emails
      const uniqueEmails = [...new Set(participants.map((p: any) => p.participant_email).filter(Boolean))];

      // Get engagement history for each participant
      const participantHistories = await Promise.all(
        uniqueEmails.slice(0, limit * 2).map(email => // Get more than needed to filter later
          email ? this.getParticipantEngagementHistory(email, connectionId, dateRange) : null
        )
      );

      // Filter out nulls and sort by average engagement score
      return participantHistories
        .filter(Boolean)
        .sort((a, b) => (b?.averageEngagementScore || 0) - (a?.averageEngagementScore || 0))
        .slice(0, limit) as ParticipantEngagementHistory[];
    } catch (error) {
      console.error('Error getting top engaged participants:', error);
      return [];
    }
  }
}
