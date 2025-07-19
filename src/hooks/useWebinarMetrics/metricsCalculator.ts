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

    const totalParticipants = webinars.reduce((sum, webinar) => {
      return sum + (webinar.total_attendees || 0);
    }, 0);

    const averageAttendees = totalWebinars > 0 ? Math.round(totalParticipants / totalWebinars) : 0;
    
    const totalDuration = webinars.reduce((sum, webinar) => {
      return sum + (webinar.duration || 0);
    }, 0);
    
    const averageDuration = totalWebinars > 0 ? Math.round(totalDuration / totalWebinars) : 0;

    const mostRecentWebinar = webinars.length > 0 
      ? webinars.sort((a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime())[0]
      : null;

    return {
      totalWebinars,
      totalParticipants,
      averageAttendees,
      averageDuration,
      mostRecentWebinar,
      lastSyncAt: lastSync,
      syncHistoryCount,
      isEmpty: false, // Not empty if we have webinars or sync history
    };
  }

  static createEmptyMetrics(): WebinarMetrics {
    return {
      totalWebinars: 0,
      totalParticipants: 0,
      averageAttendees: 0,
      averageDuration: 0,
      mostRecentWebinar: null,
      lastSyncAt: null,
      syncHistoryCount: 0,
      isEmpty: true,
    };
  }
}
