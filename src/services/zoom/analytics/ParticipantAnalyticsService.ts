
import { supabase } from '@/integrations/supabase/client';
import { WebinarEngagementService } from './WebinarEngagementService';
import { EngagementTrendsService } from './EngagementTrendsService';

export interface ParticipantProfile {
  email: string;
  name: string;
  totalWebinars: number;
  totalDuration: number;
  averageEngagement: number;
  webinarHistory: ParticipantHistory[];
  engagementTrend: 'improving' | 'stable' | 'declining';
  lastActivity: string;
}

export interface ParticipantHistory {
  webinarId: string;
  webinarTopic: string;
  startTime: string;
  duration: number;
  engagementScore: number;
  joinTime: string;
  leaveTime: string;
}

export interface ParticipantSummary {
  totalUniqueParticipants: number;
  averageParticipantsPerWebinar: number;
  topPerformers: ParticipantProfile[];
  engagementDistribution: {
    high: number;
    medium: number;
    low: number;
  };
}

export class ParticipantAnalyticsService {
  static async getParticipantProfile(email: string, connectionId: string): Promise<ParticipantProfile | null> {
    try {
      const { data: participantData, error } = await supabase
        .from('zoom_participants')
        .select(`
          participant_email,
          participant_name,
          duration,
          join_time,
          leave_time,
          webinar_id,
          zoom_webinars!inner(
            id,
            topic,
            start_time,
            connection_id
          )
        `)
        .eq('participant_email', email)
        .eq('zoom_webinars.connection_id', connectionId)
        .order('zoom_webinars.start_time', { ascending: false }) as any;

      if (error || !participantData || participantData.length === 0) {
        return null;
      }

      // Calculate metrics safely
      const totalWebinars = participantData.length;
      const totalDuration = participantData.reduce((sum, p) => sum + (p.duration || 0), 0);
      const averageEngagement = participantData.reduce((sum, p) => {
        const score = (p as any).attentiveness_score || 0;
        return sum + score;
      }, 0) / totalWebinars;

      // Build webinar history
      const webinarHistory: ParticipantHistory[] = participantData.map(p => ({
        webinarId: p.webinar_id || '',
        webinarTopic: p.zoom_webinars?.topic || 'Unknown',
        startTime: p.zoom_webinars?.start_time || '',
        duration: p.duration || 0,
        engagementScore: (p as any).attentiveness_score || 0,
        joinTime: p.join_time || '',
        leaveTime: p.leave_time || ''
      }));

      // Determine engagement trend
      const recentScores = webinarHistory.slice(0, 3).map(h => h.engagementScore);
      const olderScores = webinarHistory.slice(-3).map(h => h.engagementScore);
      const recentAvg = recentScores.reduce((sum, score) => sum + score, 0) / (recentScores.length || 1);
      const olderAvg = olderScores.reduce((sum, score) => sum + score, 0) / (olderScores.length || 1);
      
      let engagementTrend: 'improving' | 'stable' | 'declining' = 'stable';
      if (recentAvg > olderAvg + 5) engagementTrend = 'improving';
      else if (recentAvg < olderAvg - 5) engagementTrend = 'declining';

      return {
        email,
        name: participantData[0].participant_name || 'Unknown',
        totalWebinars,
        totalDuration,
        averageEngagement,
        webinarHistory,
        engagementTrend,
        lastActivity: participantData[0].join_time || ''
      };
    } catch (error) {
      console.error('Error getting participant profile:', error);
      return null;
    }
  }

  static async getParticipantSummary(connectionId: string): Promise<ParticipantSummary> {
    try {
      const { data: participants, error } = await supabase
        .from('zoom_participants')
        .select(`
          *,
          zoom_webinars!inner(connection_id)
        `)
        .eq('zoom_webinars.connection_id', connectionId);

      if (error || !participants) {
        return this.getEmptyParticipantSummary();
      }

      // Calculate unique participants
      const uniqueEmails = new Set(participants.map((p: any) => p.participant_email).filter(Boolean));
      const totalUniqueParticipants = uniqueEmails.size;

      // Calculate average participants per webinar
      const webinarIds = new Set(participants.map(p => p.webinar_id));
      const averageParticipantsPerWebinar = participants.length / (webinarIds.size || 1);

      // Get top performers
      const participantProfiles = await Promise.all(
        Array.from(uniqueEmails).slice(0, 10).map(email => 
          email ? this.getParticipantProfile(email, connectionId) : null
        )
      );

      const topPerformers = participantProfiles
        .filter(Boolean)
        .sort((a, b) => (b?.averageEngagement || 0) - (a?.averageEngagement || 0))
        .slice(0, 5) as ParticipantProfile[];

      // Calculate engagement distribution
      const engagementDistribution = participants.reduce((dist, p) => {
        const score = (p as any).attentiveness_score || 0;
        if (score >= 80) dist.high++;
        else if (score >= 50) dist.medium++;
        else dist.low++;
        return dist;
      }, { high: 0, medium: 0, low: 0 });

      return {
        totalUniqueParticipants,
        averageParticipantsPerWebinar,
        topPerformers,
        engagementDistribution
      };
    } catch (error) {
      console.error('Error getting participant summary:', error);
      return this.getEmptyParticipantSummary();
    }
  }

  static async getEngagementTrends(connectionId: string, startDate: string, endDate: string) {
    return await EngagementTrendsService.getEngagementTrends(connectionId, startDate, endDate);
  }

  private static getEmptyParticipantSummary(): ParticipantSummary {
    return {
      totalUniqueParticipants: 0,
      averageParticipantsPerWebinar: 0,
      topPerformers: [],
      engagementDistribution: { high: 0, medium: 0, low: 0 }
    };
  }
}
