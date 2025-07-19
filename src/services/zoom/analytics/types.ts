
/**
 * TypeScript types for Zoom participant analytics
 */

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
