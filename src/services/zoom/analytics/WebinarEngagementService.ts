
import { supabase } from '@/integrations/supabase/client';

interface EngagementMetrics {
  averageAttentionScore: number;
  pollParticipationRate: number;
  qaParticipationRate: number;
  averageSessionDuration: number;
  dropoffRate: number;
  peakEngagementTime: string | null;
  averageEngagementScore: number;
}

export class WebinarEngagementService {
  static async calculateEngagementMetrics(webinarId: string): Promise<EngagementMetrics | null> {
    try {
      // Get webinar details
      const { data: webinar, error: webinarError } = await supabase
        .from('zoom_webinars')
        .select('*')
        .eq('id', webinarId)
        .single();

      if (webinarError || !webinar) {
        console.error('Error fetching webinar:', webinarError);
        return null;
      }

      // Get participants for this webinar
      const { data: participants, error: participantsError } = await supabase
        .from('zoom_participants')
        .select('*')
        .eq('webinar_id', webinarId);

      if (participantsError) {
        console.error('Error fetching participants:', participantsError);
        return null;
      }

      if (!participants || participants.length === 0) {
        return {
          averageAttentionScore: 0,
          pollParticipationRate: 0,
          qaParticipationRate: 0,
          averageSessionDuration: 0,
          dropoffRate: 0,
          peakEngagementTime: null,
          averageEngagementScore: 0,
        };
      }

      // Calculate metrics using the actual database fields
      const validParticipants = participants.filter(p => 
        p.name || p.email || p.participant_id // Basic validation with correct field names
      );

      const averageAttentionScore = this.calculateAverageAttentionScore(validParticipants);
      const pollParticipationRate = this.calculatePollParticipationRate(validParticipants);
      const qaParticipationRate = this.calculateQAParticipationRate(validParticipants);
      const averageSessionDuration = this.calculateAverageSessionDuration(validParticipants);
      const dropoffRate = this.calculateDropoffRate(validParticipants, webinar.duration || 0);

      // Calculate overall engagement score
      const averageEngagementScore = (
        averageAttentionScore * 0.3 +
        pollParticipationRate * 0.25 +
        qaParticipationRate * 0.25 +
        (100 - dropoffRate) * 0.2
      );

      return {
        averageAttentionScore,
        pollParticipationRate,
        qaParticipationRate,
        averageSessionDuration,
        dropoffRate,
        peakEngagementTime: null, // Would need more detailed timing data
        averageEngagementScore: Math.max(0, Math.min(100, averageEngagementScore)),
      };
    } catch (error) {
      console.error('Error calculating engagement metrics:', error);
      return null;
    }
  }

  static async calculateWebinarEngagement(webinarId: string) {
    const metrics = await this.calculateEngagementMetrics(webinarId);
    if (!metrics) return null;

    return metrics;
  }

  private static calculateAverageAttentionScore(participants: any[]): number {
    if (participants.length === 0) return 0;
    
    const validScores = participants
      .map(p => p.attentiveness_score)
      .filter(score => score !== null && score !== undefined && !isNaN(score));
    
    if (validScores.length === 0) return 0;
    
    return validScores.reduce((sum, score) => sum + score, 0) / validScores.length;
  }

  private static calculatePollParticipationRate(participants: any[]): number {
    if (participants.length === 0) return 0;
    
    const pollParticipants = participants.filter(p => p.answered_polling === true);
    return (pollParticipants.length / participants.length) * 100;
  }

  private static calculateQAParticipationRate(participants: any[]): number {
    if (participants.length === 0) return 0;
    
    const qaParticipants = participants.filter(p => p.asked_question === true);
    return (qaParticipants.length / participants.length) * 100;
  }

  private static calculateAverageSessionDuration(participants: any[]): number {
    if (participants.length === 0) return 0;
    
    const validDurations = participants
      .map(p => p.duration)
      .filter(duration => duration !== null && duration !== undefined && !isNaN(duration));
    
    if (validDurations.length === 0) return 0;
    
    return validDurations.reduce((sum, duration) => sum + duration, 0) / validDurations.length;
  }

  private static calculateDropoffRate(participants: any[], webinarDuration: number): number {
    if (participants.length === 0 || webinarDuration === 0) return 0;
    
    const averageDuration = this.calculateAverageSessionDuration(participants);
    return Math.max(0, ((webinarDuration - averageDuration) / webinarDuration) * 100);
  }

  static async getEngagementTrends(webinarIds: string[]): Promise<any[]> {
    try {
      const trends = await Promise.all(
        webinarIds.map(async (webinarId) => {
          const metrics = await this.calculateEngagementMetrics(webinarId);
          
          // Get webinar basic info
          const { data: webinar } = await supabase
            .from('zoom_webinars')
            .select('topic, start_time')
            .eq('id', webinarId)
            .single();

          return {
            webinarId,
            title: webinar?.topic || 'Unknown',
            date: webinar?.start_time || null,
            metrics: metrics || {
              averageAttentionScore: 0,
              pollParticipationRate: 0,
              qaParticipationRate: 0,
              averageSessionDuration: 0,
              dropoffRate: 0,
            },
          };
        })
      );

      return trends.filter(trend => trend.date).sort((a, b) => 
        new Date(a.date).getTime() - new Date(b.date).getTime()
      );
    } catch (error) {
      console.error('Error getting engagement trends:', error);
      return [];
    }
  }
}
