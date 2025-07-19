import type { WebinarMetrics } from './types';

export class WebinarMetricsCalculator {
  static async calculateMetrics(
    webinars: any[],
    lastSync: string | null,
    syncHistoryCount: number
  ): Promise<WebinarMetrics> {
    const totalWebinars = webinars.length;
    const isEmpty = totalWebinars === 0 && syncHistoryCount === 0;

    if (isEmpty) {
      return this.createEmptyMetrics();
    }

    const totalAttendees = webinars.reduce((sum, webinar) => {
      return sum + (webinar.total_attendees || 0);
    }, 0);

    const averageAttendees = totalWebinars > 0 ? Math.round(totalAttendees / totalWebinars) : 0;
    
    const totalDuration = webinars.reduce((sum, webinar) => {
      return sum + (webinar.duration || 0);
    }, 0);
    
    const averageDuration = totalWebinars > 0 ? Math.round(totalDuration / totalWebinars) : 0;

    const mostRecentWebinar = webinars.length > 0 
      ? webinars.sort((a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime())[0]
      : null;

    return {
      totalWebinars,
      totalRegistrants: 0, // TODO: Calculate from webinar data
      totalAttendees,
      attendanceRate: totalWebinars > 0 ? totalAttendees / totalWebinars : 0,
      totalEngagement: 0, // TODO: Calculate engagement metrics
      averageDuration,
      monthlyTrends: [], // TODO: Calculate monthly trends
      recentWebinars: [], // TODO: Transform recent webinars
      upcomingWebinars: [], // TODO: Get upcoming webinars
      hasData: totalWebinars > 0,
      isEmpty: false,
      lastSyncAt: lastSync,
      syncHistoryCount,
    };
  }

  static createEmptyMetrics(): WebinarMetrics {
    return {
      totalWebinars: 0,
      totalRegistrants: 0,
      totalAttendees: 0,
      attendanceRate: 0,
      totalEngagement: 0,
      averageDuration: 0,
      monthlyTrends: [],
      recentWebinars: [],
      upcomingWebinars: [],
      hasData: false,
      isEmpty: true,
      lastSyncAt: null,
      syncHistoryCount: 0,
    };
  }
}
