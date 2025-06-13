
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
    return WebinarEngagementService.calculateWebinarEngagement(webinarId);
  }

  /**
   * Calculate participant history across multiple webinars
   */
  static async calculateParticipantHistory(participantEmail: string): Promise<ParticipantHistory | null> {
    return ParticipantHistoryService.calculateParticipantHistory(participantEmail);
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
