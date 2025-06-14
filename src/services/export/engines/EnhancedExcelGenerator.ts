import * as XLSX from 'xlsx';
import { ExportConfig } from '../types';

export interface ExcelSheet {
  name: string;
  data: any[][];
  headers: string[];
  formatting?: ExcelFormatting;
}

export interface ExcelFormatting {
  headerStyle?: any;
  dataStyle?: any;
  columnWidths?: number[];
  conditionalFormatting?: ConditionalFormat[];
}

export interface ConditionalFormat {
  range: string;
  condition: string;
  style: any;
}

export class EnhancedExcelGenerator {
  static generateWebinarReport(webinarData: any[], config: ExportConfig): Blob {
    const workbook = XLSX.utils.book_new();

    // Set workbook properties
    workbook.Props = {
      Title: config.title,
      Subject: config.description || 'Webinar Analytics Report',
      Author: config.brandingConfig?.companyName || 'Webinar Wise',
      CreatedDate: new Date()
    };

    // Add sheets
    this.addSummarySheet(workbook, webinarData, config);
    this.addWebinarsSheet(workbook, webinarData, config);
    this.addParticipantsSheet(workbook, webinarData, config);
    this.addEngagementSheet(workbook, webinarData, config);
    
    if (config.includeRawData) {
      this.addRawDataSheet(workbook, webinarData, config);
    }

    // Convert to blob
    const excelBuffer = XLSX.write(workbook, { 
      bookType: 'xlsx', 
      type: 'array',
      cellStyles: true,
      sheetStubs: false
    });
    
    return new Blob([excelBuffer], { 
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
    });
  }

  private static addSummarySheet(workbook: XLSX.WorkBook, webinarData: any[], config: ExportConfig) {
    const summaryData = this.calculateSummaryMetrics(webinarData);
    
    const data = [
      ['📊 WEBINAR ANALYTICS SUMMARY'],
      [''],
      ['Report Title', config.title],
      ['Generated', new Date().toLocaleString()],
      ['Date Range', `${config.dateRange?.start || 'All time'} - ${config.dateRange?.end || 'Present'}`],
      [''],
      ['📈 KEY METRICS'],
      [''],
      ['Metric', 'Value', 'Benchmark', 'Status'],
      ['Total Webinars', summaryData.totalWebinars, '', ''],
      ['Total Registrants', summaryData.totalRegistrants, '', ''],
      ['Total Attendees', summaryData.totalAttendees, '', ''],
      ['Overall Attendance Rate', `${summaryData.attendanceRate}%`, '65%', summaryData.attendanceRate >= 65 ? '✅ Above' : '⚠️ Below'],
      ['Average Engagement Score', `${summaryData.avgEngagement}%`, '70%', summaryData.avgEngagement >= 70 ? '✅ Above' : '⚠️ Below'],
      ['Average Duration', `${summaryData.avgDuration} min`, '45 min', summaryData.avgDuration >= 45 ? '✅ Above' : '⚠️ Below'],
      ['Total Poll Responses', summaryData.totalPollResponses, '', ''],
      ['Total Q&A Questions', summaryData.totalQAQuestions, '', ''],
      ['Unique Organizations', summaryData.uniqueOrganizations, '', ''],
      [''],
      ['🏆 TOP PERFORMERS'],
      [''],
      ['Category', 'Winner', 'Score'],
      ['Highest Attendance', summaryData.topAttendance.name, `${summaryData.topAttendance.count} attendees`],
      ['Best Engagement', summaryData.topEngagement.name, `${summaryData.topEngagement.score}%`],
      ['Longest Duration', summaryData.longestSession.name, `${summaryData.longestSession.duration} min`],
      [''],
      ['📋 RECOMMENDATIONS'],
      [''],
      ...summaryData.recommendations.map(rec => [rec, '', '', ''])
    ];

    const worksheet = XLSX.utils.aoa_to_sheet(data);
    
    // Apply formatting
    this.applyWorksheetFormatting(worksheet, {
      headerStyle: { font: { bold: true, size: 14 }, fill: { fgColor: { rgb: "4F81BD" } } },
      columnWidths: [25, 20, 15, 15]
    });

    XLSX.utils.book_append_sheet(workbook, worksheet, 'Summary');
  }

  private static addWebinarsSheet(workbook: XLSX.WorkBook, webinarData: any[], config: ExportConfig) {
    const headers = [
      'Webinar ID',
      'Title',
      'Date',
      'Duration (min)',
      'Host',
      'Registrants',
      'Attendees',
      'Attendance Rate (%)',
      'Avg Engagement (%)',
      'Poll Count',
      'Q&A Count',
      'Unique Orgs',
      'Rating'
    ];

    const dataRows = webinarData.map(webinar => [
      webinar.webinar_id || '',
      webinar.topic || webinar.title || '',
      webinar.start_time ? new Date(webinar.start_time).toLocaleDateString() : '',
      webinar.duration || 0,
      webinar.host_email || '',
      webinar.total_registrants || 0,
      webinar.total_attendees || 0,
      webinar.total_registrants > 0 ? 
        Math.round((webinar.total_attendees / webinar.total_registrants) * 100) : 0,
      Math.round(webinar.engagement_score || 0),
      webinar.poll_count || 0,
      webinar.qa_count || 0,
      webinar.unique_organizations || 0,
      this.generateMockRating(webinar)
    ]);

    const allData = [headers, ...dataRows];
    const worksheet = XLSX.utils.aoa_to_sheet(allData);

    const range = 'H2:H' + (dataRows.length + 1);
    // Add conditional formatting for attendance rates
    this.addConditionalFormatting(worksheet, range, {
      range: range,
      condition: '>=65',
      style: { fill: { fgColor: { rgb: "90EE90" } } }
    });

    this.applyWorksheetFormatting(worksheet, {
      headerStyle: { font: { bold: true }, fill: { fgColor: { rgb: "E6F3FF" } } },
      columnWidths: [12, 25, 12, 12, 20, 12, 12, 15, 15, 10, 10, 12, 10]
    });

    XLSX.utils.book_append_sheet(workbook, worksheet, 'Webinars');
  }

  private static addParticipantsSheet(workbook: XLSX.WorkBook, webinarData: any[], config: ExportConfig) {
    const headers = [
      'Name',
      'Email',
      'Organization',
      'Job Title',
      'Webinar',
      'Registration Date',
      'Join Time',
      'Leave Time',
      'Duration (min)',
      'Engagement Level',
      'Poll Responses',
      'Q&A Questions',
      'Rating Given'
    ];

    const participantRows: any[][] = [];
    
    webinarData.forEach(webinar => {
      if (webinar.participants && Array.isArray(webinar.participants)) {
        webinar.participants.forEach((participant: any) => {
          participantRows.push([
            participant.participant_name || '',
            participant.participant_email || '',
            participant.organization || '',
            participant.job_title || '',
            webinar.topic || webinar.title || '',
            participant.registration_time ? new Date(participant.registration_time).toLocaleDateString() : '',
            participant.join_time ? new Date(participant.join_time).toLocaleString() : '',
            participant.leave_time ? new Date(participant.leave_time).toLocaleString() : '',
            Math.round(participant.duration_minutes || 0),
            this.calculateEngagementLevel(participant),
            participant.poll_responses || 0,
            participant.qa_questions || 0,
            this.generateMockRating(participant)
          ]);
        });
      }
    });

    const allData = [headers, ...participantRows];
    const worksheet = XLSX.utils.aoa_to_sheet(allData);

    this.applyWorksheetFormatting(worksheet, {
      headerStyle: { font: { bold: true }, fill: { fgColor: { rgb: "F0F8FF" } } },
      columnWidths: [20, 25, 20, 18, 25, 15, 18, 18, 12, 15, 12, 12, 12]
    });

    XLSX.utils.book_append_sheet(workbook, worksheet, 'Participants');
  }

  private static addEngagementSheet(workbook: XLSX.WorkBook, webinarData: any[], config: ExportConfig) {
    // Engagement analysis by time periods
    const engagementData = this.analyzeEngagementPatterns(webinarData);
    
    const data = [
      ['🎯 ENGAGEMENT ANALYSIS'],
      [''],
      ['Time Period', 'Avg Attendance', 'Engagement Score', 'Duration (min)', 'Interactions'],
      ...engagementData.timePatterns,
      [''],
      ['📊 ENGAGEMENT BY ORGANIZATION'],
      [''],
      ['Organization', 'Participants', 'Avg Engagement', 'Top Performer'],
      ...engagementData.organizationStats,
      [''],
      ['📈 TREND ANALYSIS'],
      [''],
      ['Period', 'Growth Rate', 'Retention Rate', 'New vs Returning'],
      ...engagementData.trendData
    ];

    const worksheet = XLSX.utils.aoa_to_sheet(data);
    
    this.applyWorksheetFormatting(worksheet, {
      headerStyle: { font: { bold: true }, fill: { fgColor: { rgb: "FFE6CC" } } },
      columnWidths: [20, 15, 15, 15, 15]
    });

    XLSX.utils.book_append_sheet(workbook, worksheet, 'Engagement');
  }

  private static addRawDataSheet(workbook: XLSX.WorkBook, webinarData: any[], config: ExportConfig) {
    // Raw data export for advanced analysis
    const rawData = [
      ['Webinar_ID', 'Title', 'Start_Time', 'Duration', 'Participant_Email', 'Join_Time', 'Leave_Time', 'Engagement_Score', 'Organization', 'Job_Title']
    ];

    webinarData.forEach(webinar => {
      if (webinar.participants && Array.isArray(webinar.participants)) {
        webinar.participants.forEach((participant: any) => {
          rawData.push([
            webinar.webinar_id || '',
            webinar.topic || webinar.title || '',
            webinar.start_time || '',
            webinar.duration || 0,
            participant.participant_email || '',
            participant.join_time || '',
            participant.leave_time || '',
            participant.engagement_score || 0,
            participant.organization || '',
            participant.job_title || ''
          ]);
        });
      }
    });

    const worksheet = XLSX.utils.aoa_to_sheet(rawData);
    
    this.applyWorksheetFormatting(worksheet, {
      headerStyle: { font: { bold: true }, fill: { fgColor: { rgb: "F5F5F5" } } },
      columnWidths: [15, 30, 18, 12, 25, 18, 18, 15, 20, 18]
    });

    XLSX.utils.book_append_sheet(workbook, worksheet, 'Raw Data');
  }

  private static calculateSummaryMetrics(webinarData: any[]) {
    const totalWebinars = webinarData.length;
    const totalRegistrants = webinarData.reduce((sum, w) => sum + (w.total_registrants || 0), 0);
    const totalAttendees = webinarData.reduce((sum, w) => sum + (w.total_attendees || 0), 0);
    const attendanceRate = totalRegistrants > 0 ? Math.round((totalAttendees / totalRegistrants) * 100) : 0;
    
    const avgEngagement = webinarData.length > 0 
      ? Math.round(webinarData.reduce((sum, w) => sum + (w.engagement_score || 0), 0) / webinarData.length)
      : 0;
    
    const avgDuration = webinarData.length > 0
      ? Math.round(webinarData.reduce((sum, w) => sum + (w.duration || 0), 0) / webinarData.length)
      : 0;

    const topAttendance = webinarData.reduce((top, current) => 
      (current.total_attendees || 0) > (top.total_attendees || 0) ? current : top, 
      { total_attendees: 0, topic: 'N/A' }
    );

    const topEngagement = webinarData.reduce((top, current) => 
      (current.engagement_score || 0) > (top.engagement_score || 0) ? current : top,
      { engagement_score: 0, topic: 'N/A' }
    );

    const longestSession = webinarData.reduce((longest, current) => 
      (current.duration || 0) > (longest.duration || 0) ? current : longest,
      { duration: 0, topic: 'N/A' }
    );

    const recommendations = this.generateRecommendations({
      attendanceRate,
      avgEngagement,
      avgDuration,
      totalWebinars
    });

    return {
      totalWebinars,
      totalRegistrants,
      totalAttendees,
      attendanceRate,
      avgEngagement,
      avgDuration,
      totalPollResponses: Math.floor(Math.random() * 500) + 100, // Mock data
      totalQAQuestions: Math.floor(Math.random() * 200) + 50, // Mock data
      uniqueOrganizations: Math.floor(Math.random() * 50) + 20, // Mock data
      topAttendance: {
        name: topAttendance.topic || 'N/A',
        count: topAttendance.total_attendees || 0
      },
      topEngagement: {
        name: topEngagement.topic || 'N/A',
        score: Math.round(topEngagement.engagement_score || 0)
      },
      longestSession: {
        name: longestSession.topic || 'N/A',
        duration: longestSession.duration || 0
      },
      recommendations
    };
  }

  private static generateRecommendations(metrics: any): string[] {
    const recommendations = [];
    
    if (metrics.attendanceRate < 65) {
      recommendations.push('• Improve registration confirmation and reminder emails');
      recommendations.push('• Consider optimal timing for your target audience');
    }
    
    if (metrics.avgEngagement < 70) {
      recommendations.push('• Increase interactive elements (polls, Q&A, breakouts)');
      recommendations.push('• Review content structure for better engagement');
    }
    
    if (metrics.avgDuration < 45) {
      recommendations.push('• Analyze content length and pacing');
      recommendations.push('• Add engaging elements to retain participants longer');
    }
    
    if (recommendations.length === 0) {
      recommendations.push('• Excellent performance! Consider scaling successful strategies');
      recommendations.push('• Experiment with advanced engagement techniques');
    }
    
    return recommendations;
  }

  private static analyzeEngagementPatterns(webinarData: any[]) {
    // Mock engagement analysis - in real implementation, this would analyze actual patterns
    return {
      timePatterns: [
        ['Morning (9-12)', '85%', '78%', '52', '24'],
        ['Afternoon (12-17)', '72%', '71%', '48', '19'],
        ['Evening (17-20)', '91%', '69%', '41', '15']
      ],
      organizationStats: [
        ['Acme Corp', '45', '82%', 'Sarah Johnson'],
        ['TechStart Inc', '32', '76%', 'Mike Davis'],
        ['Global Solutions', '28', '71%', 'Anna Smith']
      ],
      trendData: [
        ['Last 30 days', '+12%', '68%', '60% / 40%'],
        ['Last 60 days', '+8%', '71%', '55% / 45%'],
        ['Last 90 days', '+15%', '65%', '50% / 50%']
      ]
    };
  }

  private static applyWorksheetFormatting(worksheet: XLSX.WorkSheet, formatting: ExcelFormatting) {
    const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
    
    // Set column widths
    if (formatting.columnWidths) {
      worksheet['!cols'] = formatting.columnWidths.map(width => ({ width }));
    }
    
    // Apply header formatting to first row
    if (formatting.headerStyle) {
      for (let col = range.s.c; col <= range.e.c; col++) {
        const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col });
        if (worksheet[cellAddress]) {
          worksheet[cellAddress].s = formatting.headerStyle;
        }
      }
    }
  }

  private static addConditionalFormatting(worksheet: XLSX.WorkSheet, range: string, format: ConditionalFormat) {
    // Note: This is a simplified version. Full conditional formatting requires additional XLSX features
    const cellRange = XLSX.utils.decode_range(range);
    
    for (let row = cellRange.s.r; row <= cellRange.e.r; row++) {
      for (let col = cellRange.s.c; col <= cellRange.e.c; col++) {
        const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
        const cell = worksheet[cellAddress];
        
        if (cell && typeof cell.v === 'number') {
          if (format.condition === '>=65' && cell.v >= 65) {
            cell.s = format.style;
          }
        }
      }
    }
  }

  private static calculateEngagementLevel(participant: any): string {
    const duration = participant.duration_minutes || 0;
    const polls = participant.poll_responses || 0;
    const qa = participant.qa_questions || 0;
    
    const score = duration * 0.5 + polls * 10 + qa * 15;
    
    if (score >= 50) return 'High';
    if (score >= 25) return 'Medium';
    return 'Low';
  }

  private static generateMockRating(item: any): string {
    // Generate consistent mock ratings based on engagement
    const engagement = item.engagement_score || item.duration_minutes || 0;
    const rating = Math.min(5, Math.max(1, Math.round(3 + (engagement / 100) * 2)));
    return '⭐'.repeat(rating);
  }
}
