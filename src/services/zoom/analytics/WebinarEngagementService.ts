
import { supabase } from '@/integrations/supabase/client';

export interface WebinarEngagementMetrics {
  webinarId: string;
  topic: string;
  startTime: string;
  totalRegistrants: number;
  totalAttendees: number;
  attendanceRate: number;
  averageEngagement: number;
  averageDuration: number;
  engagementDistribution: {
    high: number;
    medium: number;
    low: number;
  };
  interactionMetrics: {
    questionsAsked: number;
    pollsAnswered: number;
    chatMessages: number;
    handsRaised: number;
  };
}

export class WebinarEngagementService {
  static async getWebinarEngagement(webinarId: string): Promise<WebinarEngagementMetrics | null> {
    try {
      // Get webinar with participants
      const { data: webinar, error } = await supabase
        .from('zoom_webinars')
        .select(`
          *,
          zoom_participants(*)
        `)
        .eq('id', webinarId)
        .single();

      if (error || !webinar) {
        console.error('Error fetching webinar:', error);
        return null;
      }

      const participants = webinar.zoom_participants || [];
      const totalAttendees = participants.length;
      
      // Safe access to total_registrants with fallback
      const totalRegistrants = (webinar as any).total_registrants || totalAttendees;
      
      // Calculate engagement metrics with safe property access
      const avgEngagement = participants.reduce((sum, p) => {
        const score = (p as any).attentiveness_score || 0;
        return sum + score;
      }, 0) / (totalAttendees || 1);

      const avgDuration = participants.reduce((sum, p) => sum + (p.duration || 0), 0) / (totalAttendees || 1);

      // Calculate engagement distribution with safe property access
      const engagementDistribution = participants.reduce((dist, p) => {
        const score = (p as any).attentiveness_score || 0;
        if (score >= 80) dist.high++;
        else if (score >= 50) dist.medium++;
        else dist.low++;
        return dist;
      }, { high: 0, medium: 0, low: 0 });

      // Calculate interaction metrics with safe property access
      const interactionMetrics = participants.reduce((metrics, p) => {
        return {
          questionsAsked: metrics.questionsAsked + ((p as any).asked_question ? 1 : 0),
          pollsAnswered: metrics.pollsAnswered + ((p as any).answered_polling ? 1 : 0),
          chatMessages: metrics.chatMessages + ((p as any).posted_chat ? 1 : 0),
          handsRaised: metrics.handsRaised + ((p as any).raised_hand ? 1 : 0),
        };
      }, { questionsAsked: 0, pollsAnswered: 0, chatMessages: 0, handsRaised: 0 });

      return {
        webinarId: webinar.id,
        topic: webinar.topic,
        startTime: webinar.start_time,
        totalRegistrants,
        totalAttendees,
        attendanceRate: totalRegistrants > 0 ? (totalAttendees / totalRegistrants) * 100 : 0,
        averageEngagement: avgEngagement,
        averageDuration: avgDuration,
        engagementDistribution,
        interactionMetrics,
      };
    } catch (error) {
      console.error('Error calculating webinar engagement:', error);
      return null;
    }
  }

  static async calculateEngagementMetrics(connectionId: string): Promise<WebinarEngagementMetrics[]> {
    try {
      const { data: webinars, error } = await supabase
        .from('zoom_webinars')
        .select(`
          *,
          zoom_participants(*)
        `)
        .eq('connection_id', connectionId)
        .order('start_time', { ascending: false });

      if (error) throw error;

      const metrics = await Promise.all(
        (webinars || []).map(async (webinar) => {
          const engagement = await this.getWebinarEngagement(webinar.id);
          return engagement;
        })
      );

      return metrics.filter(Boolean) as WebinarEngagementMetrics[];
    } catch (error) {
      console.error('Error calculating engagement metrics:', error);
      return [];
    }
  }
}
