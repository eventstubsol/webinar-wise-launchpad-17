
import { ZoomParticipant } from '@/types/zoom';
import { 
  WebinarEngagementSummary, 
  ParticipantHistory, 
  EngagementTrends,
  EngagementBreakdown
} from './types';
import { EngagementCalculator } from './EngagementCalculator';
import { AnalyticsHelpers } from './AnalyticsHelpers';
import { DatabaseOperations } from './DatabaseOperations';
import { WebinarEngagementService } from './WebinarEngagementService';
import { ParticipantHistoryService } from './ParticipantHistoryService';
import { EngagementTrendsService } from './EngagementTrendsService';

/**
 * Main service for analyzing participant engagement and generating insights
 */
export class ParticipantAnalyticsService {
  
  /**
   * Calculate engagement score for a participant (0-100 scale)
   */
  static calculateEngagementScore(
    participant: ZoomParticipant,
    webinarDuration: number
  ): EngagementBreakdown {
    return EngagementCalculator.calculateEngagementScore(participant, webinarDuration);
  }

  /**
   * Calculate comprehensive engagement metrics for a webinar
   */
  static async calculateWebinarEngagement(webinarId: string): Promise<WebinarEngagementSummary | null> {
    const engagement = await WebinarEngagementService.calculateEngagementMetrics(webinarId);
    if (!engagement) return null;

    // Create a proper WebinarEngagementSummary object
    return {
      webinarId,
      totalParticipants: 0, // Will be calculated in the service
      averageEngagementScore: engagement.averageEngagementScore,
      averageAttentionScore: engagement.averageAttentionScore,
      pollParticipationRate: engagement.pollParticipationRate,
      qaParticipationRate: engagement.qaParticipationRate,
      averageSessionDuration: engagement.averageSessionDuration,
      averageAttendanceDuration: engagement.averageSessionDuration,
      averageAttendancePercentage: 100 - engagement.dropoffRate,
      dropoffRate: engagement.dropoffRate,
      peakEngagementTime: engagement.peakEngagementTime,
      engagementTrend: 'stable',
      topEngagedParticipants: [],
      engagementDistribution: { high: 0, medium: 0, low: 0 }
    };
  }

  /**
   * Calculate participant history across multiple webinars
   */
  static async calculateParticipantHistory(participantEmail: string, userId: string): Promise<ParticipantHistory | null> {
    const historyData = await ParticipantHistoryService.getParticipantHistory(participantEmail, userId);
    if (!historyData || !historyData.summary) return null;

    // Transform to match ParticipantHistory interface
    return {
      participantEmail,
      participantName: 'Unknown', // Would need to be derived from data
      totalWebinarsAttended: historyData.summary.totalWebinarsAttended,
      averageEngagementScore: historyData.summary.averageAttentionScore,
      totalTimeSpent: historyData.summary.totalTimeSpent,
      averageAttendanceDuration: historyData.summary.averageTimePerWebinar,
      firstWebinarDate: historyData.summary.firstWebinarDate,
      lastWebinarDate: historyData.summary.lastWebinarDate,
      engagementTrend: 'stable',
      webinarHistory: historyData.participantHistory.map(h => ({
        webinarId: h.webinarId,
        webinarTitle: h.webinarTitle,
        attendanceDate: h.webinarDate,
        attendanceDuration: h.duration,
        engagementScore: h.attentionScore,
        pollParticipation: h.answeredPolling,
        qaParticipation: h.askedQuestion
      }))
    };
  }

  /**
   * Get engagement trends over a date range
   */
  static async getEngagementTrends(
    connectionId: string, 
    dateRange: { from: Date; to: Date }
  ): Promise<EngagementTrends | null> {
    return EngagementTrendsService.getEngagementTrends(connectionId, dateRange);
  }

  /**
   * Helper: Calculate attendance rate
   */
  static calculateAttendanceRate(registrants: number, attendees: number): number {
    return EngagementCalculator.calculateAttendanceRate(registrants, attendees);
  }

  /**
   * Helper: Identify highly engaged participants
   */
  static async flagHighlyEngagedParticipants(connectionId: string, threshold: number = 70) {
    return DatabaseOperations.flagHighlyEngagedParticipants(connectionId, threshold);
  }

  /**
   * Generate insights based on engagement data
   */
  static generateInsights(engagement: WebinarEngagementSummary): string[] {
    return AnalyticsHelpers.generateInsights(engagement);
  }
}
