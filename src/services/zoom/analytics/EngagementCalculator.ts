
import { ZoomParticipant } from '@/types/zoom';
import { EngagementBreakdown } from './types';

/**
 * Service for calculating participant engagement scores
 */
export class EngagementCalculator {
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
   * Calculate attendance rate
   */
  static calculateAttendanceRate(registrants: number, attendees: number): number {
    if (registrants === 0) return 0;
    return Math.round((attendees / registrants) * 100 * 100) / 100;
  }

  /**
   * Calculate engagement trend direction
   */
  static calculateEngagementTrend(scores: number[]): 'improving' | 'declining' | 'stable' {
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
   * Calculate trend direction from monthly data
   */
  static calculateTrendDirection(monthlyTrends: any[]): 'improving' | 'declining' | 'stable' {
    if (monthlyTrends.length < 2) return 'stable';
    
    const firstMonth = monthlyTrends[0];
    const lastMonth = monthlyTrends[monthlyTrends.length - 1];
    
    const difference = lastMonth.avgEngagement - firstMonth.avgEngagement;
    
    if (difference > 5) return 'improving';
    if (difference < -5) return 'declining';
    return 'stable';
  }
}
