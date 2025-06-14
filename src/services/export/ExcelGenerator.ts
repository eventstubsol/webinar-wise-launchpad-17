
import * as XLSX from 'xlsx';
import { ExportConfig } from './types';

export class ExcelGenerator {
  static generateWebinarReport(webinarData: any[], config: ExportConfig): Blob {
    const workbook = XLSX.utils.book_new();

    // Summary Sheet
    const summaryData = [
      ['Metric', 'Value'],
      ['Total Webinars', webinarData.length],
      ['Total Participants', webinarData.reduce((sum, w) => sum + (w.total_attendees || 0), 0)],
      ['Total Registrants', webinarData.reduce((sum, w) => sum + (w.total_registrants || 0), 0)],
      ['Average Attendance Rate', `${Math.round(webinarData.reduce((sum, w) => sum + ((w.total_attendees / w.total_registrants) * 100 || 0), 0) / webinarData.length)}%`],
      ['Date Range', `${config.dateRange?.start || 'All time'} - ${config.dateRange?.end || 'Present'}`],
    ];
    
    const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');

    // Webinars Sheet
    const webinarHeaders = [
      'Webinar ID',
      'Topic',
      'Start Time',
      'Duration (min)',
      'Total Registrants',
      'Total Attendees',
      'Attendance Rate',
      'Host Email',
      'Status'
    ];

    const webinarRows = webinarData.map(webinar => [
      webinar.webinar_id,
      webinar.topic,
      webinar.start_time,
      webinar.duration,
      webinar.total_registrants,
      webinar.total_attendees,
      `${Math.round((webinar.total_attendees / webinar.total_registrants) * 100) || 0}%`,
      webinar.host_email,
      webinar.status
    ]);

    const webinarSheet = XLSX.utils.aoa_to_sheet([webinarHeaders, ...webinarRows]);
    XLSX.utils.book_append_sheet(workbook, webinarSheet, 'Webinars');

    // Convert to blob
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    return new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  }

  static generateParticipantReport(participantData: any[], config: ExportConfig): Blob {
    const workbook = XLSX.utils.book_new();

    const headers = [
      'Participant Name',
      'Email',
      'Webinar Topic',
      'Join Time',
      'Leave Time',
      'Duration (min)',
      'Engagement Score',
      'Posted Chat',
      'Asked Questions',
      'Answered Polls'
    ];

    const rows = participantData.map(participant => [
      participant.participant_name,
      participant.participant_email,
      participant.webinar_topic,
      participant.join_time,
      participant.leave_time,
      participant.duration,
      participant.engagement_score || 0,
      participant.posted_chat ? 'Yes' : 'No',
      participant.asked_question ? 'Yes' : 'No',
      participant.answered_polling ? 'Yes' : 'No'
    ]);

    const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Participants');

    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    return new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  }

  static generateAnalyticsReport(analyticsData: any, config: ExportConfig): Blob {
    const workbook = XLSX.utils.book_new();

    // Overview Sheet
    const overviewData = [
      ['Analytics Overview', ''],
      ['Report Generated', new Date().toISOString()],
      ['Date Range', `${config.dateRange?.start || 'All time'} - ${config.dateRange?.end || 'Present'}`],
      ['', ''],
      ['Key Metrics', ''],
      ['Total Webinars', analyticsData.totalWebinars],
      ['Total Participants', analyticsData.totalParticipants],
      ['Average Engagement', `${analyticsData.avgEngagement}%`],
      ['Top Performing Webinar', analyticsData.topWebinar],
    ];

    const overviewSheet = XLSX.utils.aoa_to_sheet(overviewData);
    XLSX.utils.book_append_sheet(workbook, overviewSheet, 'Overview');

    // Trends Sheet
    if (analyticsData.trends) {
      const trendHeaders = ['Date', 'Webinars', 'Participants', 'Engagement %'];
      const trendRows = analyticsData.trends.map((trend: any) => [
        trend.date,
        trend.webinars,
        trend.participants,
        trend.engagement
      ]);

      const trendSheet = XLSX.utils.aoa_to_sheet([trendHeaders, ...trendRows]);
      XLSX.utils.book_append_sheet(workbook, trendSheet, 'Trends');
    }

    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    return new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  }
}
