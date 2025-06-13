
import { ZoomParticipant } from '@/types/zoom';
import { WebinarEngagementSummary } from './types';

/**
 * Helper utilities for analytics calculations
 */
export class AnalyticsHelpers {
  /**
   * Analyze drop-off patterns
   */
  static analyzeDropOffPatterns(participants: ZoomParticipant[], webinarDuration: number) {
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
   * Calculate device distribution
   */
  static calculateDeviceDistribution(participants: ZoomParticipant[]): Record<string, number> {
    const distribution: Record<string, number> = {};
    
    participants.forEach(p => {
      const device = p.device || 'Unknown';
      distribution[device] = (distribution[device] || 0) + 1;
    });

    return distribution;
  }

  /**
   * Calculate location distribution
   */
  static calculateLocationDistribution(participants: ZoomParticipant[]): Record<string, number> {
    const distribution: Record<string, number> = {};
    
    participants.forEach(p => {
      const location = p.location || 'Unknown';
      distribution[location] = (distribution[location] || 0) + 1;
    });

    return distribution;
  }

  /**
   * Calculate peak attendance time (simplified)
   */
  static calculatePeakAttendanceTime(participants: ZoomParticipant[], webinar: any): string | null {
    if (!webinar.start_time) return null;
    
    // For now, return the start time + 15 minutes as a simple heuristic
    // In a real implementation, you'd analyze join/leave times to find the actual peak
    const startTime = new Date(webinar.start_time);
    const peakTime = new Date(startTime.getTime() + 15 * 60 * 1000);
    
    return peakTime.toISOString();
  }

  /**
   * Calculate monthly trends
   */
  static calculateMonthlyTrends(webinarEngagements: any[]) {
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
