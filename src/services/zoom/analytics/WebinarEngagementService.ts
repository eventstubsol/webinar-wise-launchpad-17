
import { supabase } from '@/integrations/supabase/client';

export interface WebinarEngagementAnalysis {
  webinar_id: string;
  webinar_title: string;
  webinar_date: string;
  total_registrants: number;
  total_attendees: number;
  attendance_rate: number;
  avg_engagement_score: number;
  avg_duration_minutes: number;
  engagement_distribution: {
    high: number; // 80-100
    medium: number; // 50-79
    low: number; // 0-49
  };
  top_engaged_participants: ParticipantEngagement[];
  engagement_timeline: EngagementTimePoint[];
}

export interface ParticipantEngagement {
  participant_uuid: string;
  participant_name: string;
  participant_email: string;
  engagement_score: number;
  duration_minutes: number;
  interactions: {
    asked_questions: boolean;
    answered_polls: boolean;
    posted_chat: boolean;
    raised_hand: boolean;
  };
}

export interface EngagementTimePoint {
  time_minutes: number;
  active_participants: number;
  avg_engagement: number;
}

export class WebinarEngagementService {
  static async analyzeWebinarEngagement(
    userId: string,
    webinarId: string
  ): Promise<WebinarEngagementAnalysis> {
    // Get webinar details with participants
    const { data: webinar, error } = await supabase
      .from('zoom_webinars')
      .select(`
        *,
        zoom_connections!inner(user_id),
        zoom_participants(*)
      `)
      .eq('id', webinarId)
      .eq('zoom_connections.user_id', userId)
      .single();

    if (error) {
      console.error('Error fetching webinar:', error);
      throw error;
    }

    if (!webinar) {
      throw new Error('Webinar not found');
    }

    const participants = webinar.zoom_participants || [];
    const totalAttendees = participants.length;
    const totalRegistrants = webinar.total_registrants || totalAttendees;

    // Calculate engagement metrics
    const engagementScores = participants.map(p => p.attentiveness_score || 0);
    const avgEngagementScore = engagementScores.length > 0 
      ? engagementScores.reduce((sum, score) => sum + score, 0) / engagementScores.length
      : 0;

    const durations = participants.map(p => (p.duration || 0) / 60); // Convert to minutes
    const avgDurationMinutes = durations.length > 0
      ? durations.reduce((sum, duration) => sum + duration, 0) / durations.length
      : 0;

    // Calculate engagement distribution
    const engagementDistribution = {
      high: engagementScores.filter(score => score >= 80).length,
      medium: engagementScores.filter(score => score >= 50 && score < 80).length,
      low: engagementScores.filter(score => score < 50).length
    };

    // Get top engaged participants
    const topEngagedParticipants: ParticipantEngagement[] = participants
      .sort((a, b) => (b.attentiveness_score || 0) - (a.attentiveness_score || 0))
      .slice(0, 10)
      .map(p => ({
        participant_uuid: p.participant_uuid || p.id,
        participant_name: p.name,
        participant_email: p.email || '',
        engagement_score: p.attentiveness_score || 0,
        duration_minutes: Math.round((p.duration || 0) / 60),
        interactions: {
          asked_questions: p.asked_question || false,
          answered_polls: p.answered_polling || false,
          posted_chat: p.posted_chat || false,
          raised_hand: p.raised_hand || false
        }
      }));

    // Generate engagement timeline (simplified)
    const engagementTimeline = this.generateEngagementTimeline(webinar, participants);

    return {
      webinar_id: webinar.id,
      webinar_title: webinar.topic,
      webinar_date: webinar.start_time,
      total_registrants: totalRegistrants,
      total_attendees: totalAttendees,
      attendance_rate: totalRegistrants > 0 ? (totalAttendees / totalRegistrants) * 100 : 0,
      avg_engagement_score: Math.round(avgEngagementScore * 100) / 100,
      avg_duration_minutes: Math.round(avgDurationMinutes * 100) / 100,
      engagement_distribution,
      top_engaged_participants: topEngagedParticipants,
      engagement_timeline
    };
  }

  private static generateEngagementTimeline(
    webinar: any,
    participants: any[]
  ): EngagementTimePoint[] {
    const webinarDurationMinutes = Math.ceil((webinar.duration || 60) / 60);
    const timeline: EngagementTimePoint[] = [];
    
    // Generate timeline points every 5 minutes
    for (let minute = 0; minute <= webinarDurationMinutes; minute += 5) {
      const activeParticipants = participants.filter(p => {
        const joinTime = p.join_time ? new Date(p.join_time) : null;
        const leaveTime = p.leave_time ? new Date(p.leave_time) : null;
        const webinarStart = new Date(webinar.start_time);
        
        if (!joinTime) return false;
        
        const currentTime = new Date(webinarStart.getTime() + minute * 60 * 1000);
        const wasActive = joinTime <= currentTime && (!leaveTime || leaveTime >= currentTime);
        
        return wasActive;
      });

      const avgEngagement = activeParticipants.length > 0
        ? activeParticipants.reduce((sum, p) => sum + (p.attentiveness_score || 0), 0) / activeParticipants.length
        : 0;

      timeline.push({
        time_minutes: minute,
        active_participants: activeParticipants.length,
        avg_engagement: Math.round(avgEngagement * 100) / 100
      });
    }

    return timeline;
  }

  static async compareWebinarPerformance(
    userId: string,
    webinarIds: string[]
  ): Promise<{
    comparison: WebinarEngagementAnalysis[];
    insights: string[];
  }> {
    const analyses = await Promise.all(
      webinarIds.map(id => this.analyzeWebinarEngagement(userId, id))
    );

    const insights: string[] = [];
    
    // Generate comparative insights
    const bestPerforming = analyses.reduce((best, current) => 
      current.avg_engagement_score > best.avg_engagement_score ? current : best
    );

    const worstPerforming = analyses.reduce((worst, current) => 
      current.avg_engagement_score < worst.avg_engagement_score ? current : worst
    );

    insights.push(`Best performing webinar: "${bestPerforming.webinar_title}" with ${bestPerforming.avg_engagement_score}% engagement`);
    insights.push(`Lowest performing webinar: "${worstPerforming.webinar_title}" with ${worstPerforming.avg_engagement_score}% engagement`);

    const avgAttendanceRate = analyses.reduce((sum, a) => sum + a.attendance_rate, 0) / analyses.length;
    insights.push(`Average attendance rate across webinars: ${Math.round(avgAttendanceRate)}%`);

    return {
      comparison: analyses,
      insights
    };
  }
}
