import { supabase } from '@/integrations/supabase/client';
import { ZoomParticipant, ZoomWebinar, ZoomPoll, ZoomQna, WebinarStatus } from '@/types/zoom';

/**
 * Engagement score breakdown for a participant
 */
export interface EngagementBreakdown {
  attendanceScore: number;     // 0-40 points
  cameraScore: number;         // 0-20 points
  interactionScore: number;    // 0-40 points
  attentivenessBonus: number;  // 0-10 bonus points
  totalScore: number;          // 0-100 (+ bonus)
}

/**
 * Participant engagement data with calculated metrics
 */
export interface ParticipantEngagement {
  participantId: string;
  participantName: string;
  participantEmail: string | null;
  webinarId: string;
  webinarTitle: string;
  startTime: string;
  joinTime: string;
  leaveTime: string | null;
  duration: number;
  attendancePercentage: number;
  engagementScore: number;
  engagementBreakdown: EngagementBreakdown;
  activities: {
    postedChat: boolean;
    raisedHand: boolean;
    answeredPolling: boolean;
    askedQuestion: boolean;
  };
  deviceInfo: {
    device: string | null;
    location: string | null;
    networkType: string | null;
  };
}

/**
 * Webinar engagement summary
 */
export interface WebinarEngagementSummary {
  webinarId: string;
  totalParticipants: number;
  averageEngagementScore: number;
  averageAttendanceDuration: number;
  averageAttendancePercentage: number;
  highlyEngagedCount: number;  // Score >= 70
  moderatelyEngagedCount: number;  // Score 40-69
  lowEngagedCount: number;  // Score < 40
  peakAttendanceTime: string | null;
  dropOffAnalysis: {
    early: number;   // Left in first 25%
    middle: number;  // Left in middle 50%
    late: number;    // Left in last 25%
    completed: number; // Stayed until end
  };
  deviceDistribution: Record<string, number>;
  locationDistribution: Record<string, number>;
}

/**
 * Participant history across multiple webinars
 */
export interface ParticipantHistory {
  participantEmail: string;
  participantName: string;
  totalWebinarsAttended: number;
  averageEngagementScore: number;
  averageAttendanceDuration: number;
  totalTimeSpent: number; // in minutes
  engagementTrend: 'improving' | 'declining' | 'stable';
  isHighlyEngaged: boolean;
  recentWebinars: Array<{
    webinarId: string;
    title: string;
    date: string;
    engagementScore: number;
    attendanceDuration: number;
  }>;
}

/**
 * Engagement trends over time
 */
export interface EngagementTrends {
  connectionId: string;
  dateRange: { from: Date; to: Date };
  totalWebinars: number;
  totalParticipants: number;
  uniqueParticipants: number;
  averageEngagementScore: number;
  engagementTrendDirection: 'improving' | 'declining' | 'stable';
  monthlyTrends: Array<{
    month: string;
    webinarCount: number;
    avgEngagement: number;
    avgAttendance: number;
    participantCount: number;
  }>;
  topPerformingWebinars: Array<{
    webinarId: string;
    title: string;
    date: string;
    engagementScore: number;
    attendanceRate: number;
  }>;
}

/**
 * Service for analyzing participant engagement and generating insights
 */
export class ParticipantAnalyticsService {
  
  /**
   * Calculate engagement score for a participant (0-100 scale)
   */
  static calculateEngagementScore(
    participant: ZoomParticipant,
    webinarDuration: number
  ): EngagementBreakdown {
    const duration = participant.duration || 0;
    const attendancePercentage = webinarDuration > 0 ? (duration / webinarDuration) * 100 : 0;
    
    // Attendance Duration Score (0-40 points)
    const attendanceScore = Math.min(40, (attendancePercentage / 100) * 40);
    
    // Camera Engagement Score (0-20 points)
    const cameraOnDuration = participant.camera_on_duration || 0;
    const cameraScore = duration > 0 ? Math.min(20, (cameraOnDuration / duration) * 20) : 0;
    
    // Interactive Participation Score (0-40 points)
    let interactionScore = 0;
    if (participant.answered_polling) interactionScore += 15;
    if (participant.asked_question) interactionScore += 15;
    if (participant.posted_chat) interactionScore += 5;
    if (participant.raised_hand) interactionScore += 5;
    
    // Zoom Attentiveness Bonus (0-10 points)
    const attentivenessScore = participant.attentiveness_score || 0;
    const attentivenessBonus = Math.min(10, (attentivenessScore / 100) * 10);
    
    const totalScore = Math.min(100, attendanceScore + cameraScore + interactionScore + attentivenessBonus);
    
    return {
      attendanceScore: Math.round(attendanceScore),
      cameraScore: Math.round(cameraScore),
      interactionScore: Math.round(interactionScore),
      attentivenessBonus: Math.round(attentivenessBonus),
      totalScore: Math.round(totalScore)
    };
  }

  /**
   * Calculate comprehensive engagement metrics for a webinar
   */
  static async calculateWebinarEngagement(webinarId: string): Promise<WebinarEngagementSummary | null> {
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

      // Get all participants for this webinar
      const { data: participants, error: participantsError } = await supabase
        .from('zoom_participants')
        .select('*')
        .eq('webinar_id', webinarId);

      if (participantsError) {
        console.error('Error fetching participants:', participantsError);
        return null;
      }

      if (!participants || participants.length === 0) {
        return null;
      }

      const webinarDuration = webinar.duration || 0;
      const engagementData = participants.map(p => ({
        participant: p,
        engagement: this.calculateEngagementScore(p, webinarDuration)
      }));

      // Calculate summary metrics
      const totalParticipants = participants.length;
      const averageEngagementScore = engagementData.reduce((sum, p) => sum + p.engagement.totalScore, 0) / totalParticipants;
      const averageAttendanceDuration = participants.reduce((sum, p) => sum + (p.duration || 0), 0) / totalParticipants;
      const averageAttendancePercentage = webinarDuration > 0 ? (averageAttendanceDuration / webinarDuration) * 100 : 0;

      // Engagement distribution
      const highlyEngagedCount = engagementData.filter(p => p.engagement.totalScore >= 70).length;
      const moderatelyEngagedCount = engagementData.filter(p => p.engagement.totalScore >= 40 && p.engagement.totalScore < 70).length;
      const lowEngagedCount = engagementData.filter(p => p.engagement.totalScore < 40).length;

      // Drop-off analysis
      const dropOffAnalysis = this.analyzeDropOffPatterns(participants, webinarDuration);
      
      // Device and location distribution
      const deviceDistribution = this.calculateDeviceDistribution(participants);
      const locationDistribution = this.calculateLocationDistribution(participants);
      
      // Peak attendance time (simplified - could be more sophisticated)
      const peakAttendanceTime = this.calculatePeakAttendanceTime(participants, webinar);

      const summary: WebinarEngagementSummary = {
        webinarId,
        totalParticipants,
        averageEngagementScore: Math.round(averageEngagementScore * 100) / 100,
        averageAttendanceDuration: Math.round(averageAttendanceDuration),
        averageAttendancePercentage: Math.round(averageAttendancePercentage * 100) / 100,
        highlyEngagedCount,
        moderatelyEngagedCount,
        lowEngagedCount,
        peakAttendanceTime,
        dropOffAnalysis,
        deviceDistribution,
        locationDistribution
      };

      // Update webinar record with calculated metrics
      await this.updateWebinarMetrics(webinarId, summary);

      return summary;
    } catch (error) {
      console.error('Error calculating webinar engagement:', error);
      return null;
    }
  }

  /**
   * Calculate participant history across multiple webinars
   */
  static async calculateParticipantHistory(participantEmail: string): Promise<ParticipantHistory | null> {
    try {
      // Get all participations for this email
      const { data: participations, error } = await supabase
        .from('zoom_participants')
        .select(`
          *,
          zoom_webinars!inner(id, topic, start_time, duration)
        `)
        .eq('participant_email', participantEmail)
        .order('join_time', { ascending: false });

      if (error) {
        console.error('Error fetching participant history:', error);
        return null;
      }

      if (!participations || participations.length === 0) {
        return null;
      }

      // Calculate engagement for each participation
      const engagementHistory = participations.map(p => {
        const webinar = (p as any).zoom_webinars;
        const engagement = this.calculateEngagementScore(p, webinar.duration || 0);
        
        return {
          webinarId: webinar.id,
          title: webinar.topic,
          date: webinar.start_time,
          engagementScore: engagement.totalScore,
          attendanceDuration: p.duration || 0,
          participant: p
        };
      });

      // Calculate aggregated metrics
      const totalWebinarsAttended = participations.length;
      const averageEngagementScore = engagementHistory.reduce((sum, e) => sum + e.engagementScore, 0) / totalWebinarsAttended;
      const averageAttendanceDuration = engagementHistory.reduce((sum, e) => sum + e.attendanceDuration, 0) / totalWebinarsAttended;
      const totalTimeSpent = engagementHistory.reduce((sum, e) => sum + e.attendanceDuration, 0);

      // Determine engagement trend
      const engagementTrend = this.calculateEngagementTrend(engagementHistory.map(e => e.engagementScore));
      
      // Determine if highly engaged (average score >= 70)
      const isHighlyEngaged = averageEngagementScore >= 70;

      const history: ParticipantHistory = {
        participantEmail,
        participantName: participations[0].participant_name,
        totalWebinarsAttended,
        averageEngagementScore: Math.round(averageEngagementScore * 100) / 100,
        averageAttendanceDuration: Math.round(averageAttendanceDuration),
        totalTimeSpent: Math.round(totalTimeSpent),
        engagementTrend,
        isHighlyEngaged,
        recentWebinars: engagementHistory.slice(0, 10).map(e => ({
          webinarId: e.webinarId,
          title: e.title,
          date: e.date,
          engagementScore: e.engagementScore,
          attendanceDuration: e.attendanceDuration
        }))
      };

      return history;
    } catch (error) {
      console.error('Error calculating participant history:', error);
      return null;
    }
  }

  /**
   * Get engagement trends over a date range
   */
  static async getEngagementTrends(
    connectionId: string, 
    dateRange: { from: Date; to: Date }
  ): Promise<EngagementTrends | null> {
    try {
      // Get all webinars in the date range
      const { data: webinars, error: webinarsError } = await supabase
        .from('zoom_webinars')
        .select(`
          *,
          zoom_participants(*)
        `)
        .eq('connection_id', connectionId)
        .gte('start_time', dateRange.from.toISOString())
        .lte('start_time', dateRange.to.toISOString())
        .order('start_time', { ascending: true });

      if (webinarsError) {
        console.error('Error fetching webinars for trends:', webinarsError);
        return null;
      }

      if (!webinars || webinars.length === 0) {
        return null;
      }

      // Calculate engagement for all webinars
      const webinarEngagements = await Promise.all(
        webinars.map(async (webinar) => {
          const engagement = await this.calculateWebinarEngagement(webinar.id);
          return {
            webinar,
            engagement
          };
        })
      );

      // Calculate overall metrics
      const totalWebinars = webinars.length;
      const allParticipants = webinars.flatMap((w: any) => w.zoom_participants || []);
      const totalParticipants = allParticipants.length;
      const uniqueParticipants = new Set(allParticipants.map(p => p.participant_email).filter(Boolean)).size;

      const averageEngagementScore = webinarEngagements
        .filter(we => we.engagement)
        .reduce((sum, we) => sum + we.engagement!.averageEngagementScore, 0) / webinarEngagements.filter(we => we.engagement).length;

      // Calculate monthly trends
      const monthlyTrends = this.calculateMonthlyTrends(webinarEngagements);
      
      // Determine trend direction
      const engagementTrendDirection = this.calculateTrendDirection(monthlyTrends);
      
      // Get top performing webinars
      const topPerformingWebinars = webinarEngagements
        .filter(we => we.engagement)
        .sort((a, b) => b.engagement!.averageEngagementScore - a.engagement!.averageEngagementScore)
        .slice(0, 5)
        .map(we => ({
          webinarId: we.webinar.id,
          title: we.webinar.topic,
          date: we.webinar.start_time,
          engagementScore: we.engagement!.averageEngagementScore,
          attendanceRate: we.engagement!.averageAttendancePercentage
        }));

      const trends: EngagementTrends = {
        connectionId,
        dateRange,
        totalWebinars,
        totalParticipants,
        uniqueParticipants,
        averageEngagementScore: Math.round(averageEngagementScore * 100) / 100,
        engagementTrendDirection,
        monthlyTrends,
        topPerformingWebinars
      };

      return trends;
    } catch (error) {
      console.error('Error calculating engagement trends:', error);
      return null;
    }
  }

  /**
   * Helper: Analyze drop-off patterns
   */
  private static analyzeDropOffPatterns(participants: ZoomParticipant[], webinarDuration: number) {
    const dropOff = {
      early: 0,    // Left in first 25%
      middle: 0,   // Left in middle 50%
      late: 0,     // Left in last 25%
      completed: 0 // Stayed until end
    };

    participants.forEach(p => {
      const duration = p.duration || 0;
      const attendancePercentage = webinarDuration > 0 ? (duration / webinarDuration) * 100 : 0;

      if (attendancePercentage >= 95) {
        dropOff.completed++;
      } else if (attendancePercentage >= 75) {
        dropOff.late++;
      } else if (attendancePercentage >= 25) {
        dropOff.middle++;
      } else {
        dropOff.early++;
      }
    });

    return dropOff;
  }

  /**
   * Helper: Calculate device distribution
   */
  private static calculateDeviceDistribution(participants: ZoomParticipant[]): Record<string, number> {
    const distribution: Record<string, number> = {};
    
    participants.forEach(p => {
      const device = p.device || 'Unknown';
      distribution[device] = (distribution[device] || 0) + 1;
    });

    return distribution;
  }

  /**
   * Helper: Calculate location distribution
   */
  private static calculateLocationDistribution(participants: ZoomParticipant[]): Record<string, number> {
    const distribution: Record<string, number> = {};
    
    participants.forEach(p => {
      const location = p.location || 'Unknown';
      distribution[location] = (distribution[location] || 0) + 1;
    });

    return distribution;
  }

  /**
   * Helper: Calculate peak attendance time (simplified)
   */
  private static calculatePeakAttendanceTime(participants: ZoomParticipant[], webinar: any): string | null {
    if (!webinar.start_time) return null;
    
    // For now, return the start time + 15 minutes as a simple heuristic
    // In a real implementation, you'd analyze join/leave times to find the actual peak
    const startTime = new Date(webinar.start_time);
    const peakTime = new Date(startTime.getTime() + 15 * 60 * 1000);
    
    return peakTime.toISOString();
  }

  /**
   * Helper: Calculate engagement trend direction
   */
  private static calculateEngagementTrend(scores: number[]): 'improving' | 'declining' | 'stable' {
    if (scores.length < 2) return 'stable';
    
    const firstHalf = scores.slice(0, Math.floor(scores.length / 2));
    const secondHalf = scores.slice(Math.floor(scores.length / 2));
    
    const firstAvg = firstHalf.reduce((sum, score) => sum + score, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((sum, score) => sum + score, 0) / secondHalf.length;
    
    const difference = secondAvg - firstAvg;
    
    if (difference > 5) return 'improving';
    if (difference < -5) return 'declining';
    return 'stable';
  }

  /**
   * Helper: Calculate monthly trends
   */
  private static calculateMonthlyTrends(webinarEngagements: any[]) {
    const monthlyData: Record<string, any[]> = {};
    
    webinarEngagements.forEach(we => {
      if (!we.webinar.start_time || !we.engagement) return;
      
      const date = new Date(we.webinar.start_time);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      
      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = [];
      }
      monthlyData[monthKey].push(we);
    });

    return Object.entries(monthlyData).map(([month, engagements]) => ({
      month,
      webinarCount: engagements.length,
      avgEngagement: engagements.reduce((sum, e) => sum + e.engagement.averageEngagementScore, 0) / engagements.length,
      avgAttendance: engagements.reduce((sum, e) => sum + e.engagement.averageAttendancePercentage, 0) / engagements.length,
      participantCount: engagements.reduce((sum, e) => sum + e.engagement.totalParticipants, 0)
    }));
  }

  /**
   * Helper: Calculate trend direction from monthly data
   */
  private static calculateTrendDirection(monthlyTrends: any[]): 'improving' | 'declining' | 'stable' {
    if (monthlyTrends.length < 2) return 'stable';
    
    const firstMonth = monthlyTrends[0];
    const lastMonth = monthlyTrends[monthlyTrends.length - 1];
    
    const difference = lastMonth.avgEngagement - firstMonth.avgEngagement;
    
    if (difference > 5) return 'improving';
    if (difference < -5) return 'declining';
    return 'stable';
  }

  /**
   * Helper: Update webinar metrics in database
   */
  private static async updateWebinarMetrics(webinarId: string, summary: WebinarEngagementSummary) {
    try {
      await supabase
        .from('zoom_webinars')
        .update({
          total_attendees: summary.totalParticipants,
          avg_attendance_duration: summary.averageAttendanceDuration,
          updated_at: new Date().toISOString()
        })
        .eq('id', webinarId);
    } catch (error) {
      console.error('Error updating webinar metrics:', error);
    }
  }

  /**
   * Helper: Calculate attendance rate
   */
  static calculateAttendanceRate(registrants: number, attendees: number): number {
    if (registrants === 0) return 0;
    return Math.round((attendees / registrants) * 100 * 100) / 100;
  }

  /**
   * Helper: Identify highly engaged participants
   */
  static async flagHighlyEngagedParticipants(connectionId: string, threshold: number = 70) {
    try {
      // This could be implemented to flag participants in a separate table
      // or add metadata to existing participant records
      console.log(`Flagging highly engaged participants with threshold ${threshold} for connection ${connectionId}`);
    } catch (error) {
      console.error('Error flagging highly engaged participants:', error);
    }
  }

  /**
   * Generate insights based on engagement data
   */
  static generateInsights(engagement: WebinarEngagementSummary): string[] {
    const insights: string[] = [];
    
    // Engagement level insights
    if (engagement.averageEngagementScore >= 70) {
      insights.push('🎉 Excellent engagement! Most participants were highly active.');
    } else if (engagement.averageEngagementScore >= 50) {
      insights.push('👍 Good engagement level with room for improvement.');
    } else {
      insights.push('⚠️ Low engagement detected. Consider more interactive content.');
    }

    // Attendance insights
    if (engagement.averageAttendancePercentage >= 80) {
      insights.push('⏱️ Great retention - participants stayed for most of the webinar.');
    } else if (engagement.averageAttendancePercentage >= 60) {
      insights.push('⏱️ Moderate retention - some participants left early.');
    } else {
      insights.push('⏱️ High drop-off rate - consider shorter sessions or more engaging content.');
    }

    // Drop-off pattern insights
    if (engagement.dropOffAnalysis.early > engagement.totalParticipants * 0.3) {
      insights.push('🚪 High early drop-off - strengthen your opening to hook the audience.');
    }

    // Device insights
    const mobileUsers = Object.entries(engagement.deviceDistribution)
      .filter(([device]) => device.toLowerCase().includes('mobile') || device.toLowerCase().includes('phone'))
      .reduce((sum, [, count]) => sum + count, 0);
    
    if (mobileUsers > engagement.totalParticipants * 0.5) {
      insights.push('📱 Majority of participants used mobile devices - ensure mobile-friendly content.');
    }

    return insights;
  }
}
