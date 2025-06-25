
import type { WebinarMetrics, WebinarData, SyncHistoryData } from './types';
import { WebinarMetricsDataService } from './dataService';

export class WebinarMetricsCalculator {
  static createEmptyMetrics(lastSyncAt?: string, syncHistoryCount = 0): WebinarMetrics {
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
      lastSyncAt,
      syncHistoryCount,
    };
  }

  static async calculateMetrics(
    webinars: WebinarData[], 
    lastSync: SyncHistoryData | null, 
    syncHistoryCount: number
  ): Promise<WebinarMetrics> {
    if (!webinars.length) {
      return this.createEmptyMetrics(lastSync?.completed_at, syncHistoryCount);
    }

    const totalWebinars = webinars.length;
    let totalRegistrants = 0;
    let totalAttendees = 0;
    let totalDuration = 0;

    // Calculate totals
    for (const webinar of webinars) {
      const registrantCount = await WebinarMetricsDataService.getRegistrantCount(webinar.id);
      const participantCount = await WebinarMetricsDataService.getParticipantCount(webinar.id);

      totalRegistrants += registrantCount;
      totalAttendees += participantCount;
      totalDuration += webinar.duration || 0;
    }

    const attendanceRate = totalRegistrants > 0 ? (totalAttendees / totalRegistrants) * 100 : 0;
    const averageDuration = totalWebinars > 0 ? totalDuration / totalWebinars : 0;

    // Generate monthly trends, recent webinars, and upcoming webinars
    const monthlyTrends = await this.generateMonthlyTrends(webinars);
    const recentWebinars = await this.generateRecentWebinars(webinars);
    const upcomingWebinars = await this.generateUpcomingWebinars(webinars);

    return {
      totalWebinars,
      totalRegistrants,
      totalAttendees,
      attendanceRate: Math.round(attendanceRate * 10) / 10,
      totalEngagement: Math.round(totalDuration / 3600),
      averageDuration: Math.round(averageDuration / 60),
      monthlyTrends,
      recentWebinars,
      upcomingWebinars,
      hasData: true,
      isEmpty: false,
      lastSyncAt: lastSync?.completed_at,
      syncHistoryCount,
    };
  }

  private static async generateMonthlyTrends(webinars: WebinarData[]) {
    const monthlyTrends = [];
    
    for (let i = 5; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const monthKey = date.toISOString().slice(0, 7);
      
      const monthWebinars = webinars.filter(w => 
        w.start_time?.startsWith(monthKey)
      );
      
      let monthRegistrants = 0;
      let monthAttendees = 0;
      
      for (const webinar of monthWebinars) {
        const regCount = await WebinarMetricsDataService.getRegistrantCount(webinar.id);
        const partCount = await WebinarMetricsDataService.getParticipantCount(webinar.id);
        
        monthRegistrants += regCount;
        monthAttendees += partCount;
      }
      
      monthlyTrends.push({
        month: date.toLocaleDateString('en', { month: 'short' }),
        webinars: monthWebinars.length,
        registrants: monthRegistrants,
        attendees: monthAttendees,
      });
    }
    
    return monthlyTrends;
  }

  private static async generateRecentWebinars(webinars: WebinarData[]) {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const recentWebinarsList = await Promise.all(
      webinars
        .filter(w => w.start_time && new Date(w.start_time) >= thirtyDaysAgo)
        .sort((a, b) => new Date(b.start_time || 0).getTime() - new Date(a.start_time || 0).getTime())
        .slice(0, 5)
        .map(async (w) => {
          const regCount = await WebinarMetricsDataService.getRegistrantCount(w.id);
          const partCount = await WebinarMetricsDataService.getParticipantCount(w.id);

          return {
            id: w.id,
            title: w.topic || 'Untitled Webinar',
            date: w.start_time ? new Date(w.start_time).toLocaleDateString() : '',
            duration: Math.round((w.duration || 0) / 60),
            attendees: partCount,
            registrants: regCount,
            attendanceRate: regCount && partCount ? `${Math.round((partCount / regCount) * 100)}%` : '0%',
          };
        })
    );

    return recentWebinarsList;
  }

  private static async generateUpcomingWebinars(webinars: WebinarData[]) {
    const now = new Date();
    
    const upcomingWebinarsList = await Promise.all(
      webinars
        .filter(w => w.start_time && new Date(w.start_time) > now)
        .sort((a, b) => new Date(a.start_time || 0).getTime() - new Date(b.start_time || 0).getTime())
        .slice(0, 5)
        .map(async (w) => {
          const regCount = await WebinarMetricsDataService.getRegistrantCount(w.id);

          return {
            id: w.id,
            title: w.topic || 'Untitled Webinar',
            date: w.start_time ? new Date(w.start_time).toLocaleDateString() : '',
            time: w.start_time ? new Date(w.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '',
            duration: Math.round((w.duration || 0) / 60),
            registrants: regCount,
            status: 'upcoming',
          };
        })
    );

    return upcomingWebinarsList;
  }
}
