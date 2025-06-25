
import { supabase } from '@/integrations/supabase/client';

export interface ParticipantHistory {
  participant_id: string;
  participant_name: string;
  participant_email: string;
  webinar_history: WebinarParticipation[];
  total_webinars_attended: number;
  avg_engagement_score: number;
  avg_duration_minutes: number;
  last_attended: string;
  engagement_trend: 'improving' | 'declining' | 'stable';
}

export interface WebinarParticipation {
  webinar_id: string;
  webinar_title: string;
  webinar_date: string;
  duration_minutes: number;
  engagement_score: number;
  asked_questions: boolean;
  answered_polls: boolean;
  join_time: string;
  leave_time: string;
}

export class ParticipantHistoryService {
  static async getParticipantHistory(
    userId: string,
    participantEmail?: string,
    limit: number = 100
  ): Promise<ParticipantHistory[]> {
    let query = supabase
      .from('zoom_participants')
      .select(`
        *,
        zoom_webinars!inner(
          id,
          topic,
          start_time,
          duration,
          zoom_connections!inner(user_id)
        )
      `)
      .eq('zoom_webinars.zoom_connections.user_id', userId)
      .not('email', 'is', null)
      .order('join_time', { ascending: false })
      .limit(limit);

    if (participantEmail) {
      query = query.eq('email', participantEmail);
    }

    const { data: participants, error } = await query;

    if (error) {
      console.error('Error fetching participant history:', error);
      throw error;
    }

    if (!participants || participants.length === 0) {
      return [];
    }

    // Group participants by email
    const participantGroups = this.groupParticipantsByEmail(participants);

    return Object.entries(participantGroups).map(([email, participantData]) => {
      const webinarHistory: WebinarParticipation[] = participantData.map(p => ({
        webinar_id: p.zoom_webinars.id,
        webinar_title: p.zoom_webinars.topic,
        webinar_date: p.zoom_webinars.start_time,
        duration_minutes: Math.round((p.duration || 0) / 60),
        engagement_score: p.attentiveness_score || 0,
        asked_questions: p.asked_question || false,
        answered_polls: p.answered_polling || false,
        join_time: p.join_time || '',
        leave_time: p.leave_time || ''
      }));

      const totalWebinars = webinarHistory.length;
      const avgEngagementScore = totalWebinars > 0 
        ? webinarHistory.reduce((sum, w) => sum + w.engagement_score, 0) / totalWebinars
        : 0;
      
      const avgDurationMinutes = totalWebinars > 0
        ? webinarHistory.reduce((sum, w) => sum + w.duration_minutes, 0) / totalWebinars
        : 0;

      const sortedHistory = webinarHistory.sort((a, b) => 
        new Date(b.webinar_date).getTime() - new Date(a.webinar_date).getTime()
      );

      const engagementTrend = this.calculateEngagementTrend(sortedHistory);

      return {
        participant_id: participantData[0].participant_uuid || participantData[0].id,
        participant_name: participantData[0].name,
        participant_email: email,
        webinar_history: sortedHistory,
        total_webinars_attended: totalWebinars,
        avg_engagement_score: Math.round(avgEngagementScore * 100) / 100,
        avg_duration_minutes: Math.round(avgDurationMinutes * 100) / 100,
        last_attended: sortedHistory[0]?.webinar_date || '',
        engagement_trend
      };
    });
  }

  private static groupParticipantsByEmail(participants: any[]): Record<string, any[]> {
    const groups: Record<string, any[]> = {};
    
    participants.forEach(participant => {
      const email = participant.email;
      if (!groups[email]) {
        groups[email] = [];
      }
      groups[email].push(participant);
    });

    return groups;
  }

  private static calculateEngagementTrend(
    history: WebinarParticipation[]
  ): 'improving' | 'declining' | 'stable' {
    if (history.length < 3) return 'stable';

    const recent = history.slice(0, Math.ceil(history.length / 2));
    const older = history.slice(Math.ceil(history.length / 2));

    const recentAvg = recent.reduce((sum, w) => sum + w.engagement_score, 0) / recent.length;
    const olderAvg = older.reduce((sum, w) => sum + w.engagement_score, 0) / older.length;

    const difference = recentAvg - olderAvg;

    if (difference > 10) return 'improving';
    if (difference < -10) return 'declining';
    return 'stable';
  }

  static async getTopParticipants(
    userId: string,
    metric: 'engagement' | 'participation' | 'duration' = 'engagement',
    limit: number = 10
  ): Promise<ParticipantHistory[]> {
    const allHistory = await this.getParticipantHistory(userId, undefined, 1000);

    let sorted: ParticipantHistory[];
    
    switch (metric) {
      case 'engagement':
        sorted = allHistory.sort((a, b) => b.avg_engagement_score - a.avg_engagement_score);
        break;
      case 'participation':
        sorted = allHistory.sort((a, b) => b.total_webinars_attended - a.total_webinars_attended);
        break;
      case 'duration':
        sorted = allHistory.sort((a, b) => b.avg_duration_minutes - a.avg_duration_minutes);
        break;
      default:
        sorted = allHistory.sort((a, b) => b.avg_engagement_score - a.avg_engagement_score);
    }

    return sorted.slice(0, limit);
  }

  static async getParticipantInsights(userId: string, participantEmail: string): Promise<{
    participant: ParticipantHistory;
    insights: string[];
    recommendations: string[];
  }> {
    const [participant] = await this.getParticipantHistory(userId, participantEmail, 50);
    
    if (!participant) {
      throw new Error('Participant not found');
    }

    const insights: string[] = [];
    const recommendations: string[] = [];

    // Generate insights
    if (participant.avg_engagement_score > 80) {
      insights.push('Highly engaged participant with consistently high attention scores');
    } else if (participant.avg_engagement_score < 40) {
      insights.push('Low engagement participant - may need different content approach');
    }

    if (participant.engagement_trend === 'improving') {
      insights.push('Engagement is improving over time - positive trend');
    } else if (participant.engagement_trend === 'declining') {
      insights.push('Engagement has been declining - may need intervention');
    }

    // Generate recommendations
    if (participant.avg_engagement_score < 50) {
      recommendations.push('Consider personalized follow-up content');
      recommendations.push('Segment into re-engagement campaign');
    }

    if (participant.total_webinars_attended > 5) {
      recommendations.push('Potential candidate for advanced content or VIP treatment');
    }

    return {
      participant,
      insights,
      recommendations
    };
  }
}
