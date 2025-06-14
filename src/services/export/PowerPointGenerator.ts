
import pptxgen from 'pptxgenjs';
import { ExportConfig, BrandingConfig } from './types';

export class PowerPointGenerator {
  static async generatePresentation(data: any, config: ExportConfig): Promise<Blob> {
    const pptx = new pptxgen();
    const branding = config.brandingConfig || {};

    // Set presentation properties
    pptx.author = branding.companyName || 'Webinar Wise';
    pptx.company = branding.companyName || 'Webinar Wise';
    pptx.subject = config.title;
    pptx.title = config.title;

    // Title Slide
    const titleSlide = pptx.addSlide();
    titleSlide.addText(config.title, {
      x: 1,
      y: 2,
      w: 8,
      h: 1.5,
      fontSize: 36,
      bold: true,
      color: branding.primaryColor || '363636',
      align: 'center'
    });

    if (config.description) {
      titleSlide.addText(config.description, {
        x: 1,
        y: 3.5,
        w: 8,
        h: 1,
        fontSize: 18,
        color: '666666',
        align: 'center'
      });
    }

    titleSlide.addText(`Generated on ${new Date().toLocaleDateString()}`, {
      x: 1,
      y: 6,
      w: 8,
      h: 0.5,
      fontSize: 12,
      color: '999999',
      align: 'center'
    });

    // Executive Summary Slide
    const summarySlide = pptx.addSlide();
    summarySlide.addText('Executive Summary', {
      x: 0.5,
      y: 0.5,
      w: 9,
      h: 1,
      fontSize: 28,
      bold: true,
      color: branding.primaryColor || '363636'
    });

    const summaryData = [
      ['Metric', 'Value'],
      ['Total Webinars', data.summary?.totalWebinars?.toString() || '0'],
      ['Total Participants', data.summary?.totalParticipants?.toString() || '0'],
      ['Average Engagement', `${data.summary?.avgEngagement || 0}%`],
      ['Peak Attendance', data.summary?.peakAttendance?.toString() || '0']
    ];

    summarySlide.addTable(summaryData, {
      x: 1,
      y: 2,
      w: 8,
      h: 3,
      fontSize: 14,
      border: { type: 'solid', color: 'CFCFCF' },
      fill: { color: 'F7F7F7' }
    });

    // Key Insights Slide
    const insightsSlide = pptx.addSlide();
    insightsSlide.addText('Key Insights', {
      x: 0.5,
      y: 0.5,
      w: 9,
      h: 1,
      fontSize: 28,
      bold: true,
      color: branding.primaryColor || '363636'
    });

    if (data.insights && data.insights.length > 0) {
      data.insights.forEach((insight: any, index: number) => {
        insightsSlide.addText(`• ${insight.text}`, {
          x: 1,
          y: 2 + (index * 0.8),
          w: 8,
          h: 0.6,
          fontSize: 16,
          bullet: true
        });
      });
    }

    // Webinar Performance Slide
    if (data.webinars && data.webinars.length > 0) {
      const performanceSlide = pptx.addSlide();
      performanceSlide.addText('Webinar Performance', {
        x: 0.5,
        y: 0.5,
        w: 9,
        h: 1,
        fontSize: 28,
        bold: true,
        color: branding.primaryColor || '363636'
      });

      const performanceData = [
        ['Webinar Topic', 'Attendance Rate', 'Participants'],
        ...data.webinars.slice(0, 8).map((webinar: any) => [
          webinar.topic?.substring(0, 40) + (webinar.topic?.length > 40 ? '...' : ''),
          `${webinar.attendance_rate}%`,
          webinar.total_attendees?.toString() || '0'
        ])
      ];

      performanceSlide.addTable(performanceData, {
        x: 0.5,
        y: 2,
        w: 9,
        h: 4,
        fontSize: 12,
        border: { type: 'solid', color: 'CFCFCF' },
        fill: { color: 'F7F7F7' }
      });
    }

    // Generate and return blob
    const pptxBlob = await pptx.write({ outputType: 'blob' });
    return pptxBlob as Blob;
  }

  static async generateAnalyticsPresentation(analyticsData: any, config: ExportConfig): Promise<Blob> {
    const data = {
      summary: {
        totalWebinars: analyticsData.totalWebinars,
        totalParticipants: analyticsData.totalParticipants,
        avgEngagement: Math.round(analyticsData.avgEngagement || 0),
        peakAttendance: analyticsData.peakAttendance
      },
      insights: [
        { text: `Analyzed ${analyticsData.totalWebinars} webinar sessions` },
        { text: `${analyticsData.totalParticipants} total participants engaged` },
        { text: `${Math.round(analyticsData.avgEngagement || 0)}% average engagement rate` },
        { text: 'Detailed metrics available in accompanying reports' }
      ],
      webinars: analyticsData.webinars || []
    };

    return this.generatePresentation(data, config);
  }
}
