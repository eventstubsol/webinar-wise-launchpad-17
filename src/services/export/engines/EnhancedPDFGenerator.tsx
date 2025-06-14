
import React from 'react';
import { pdf, Font } from '@react-pdf/renderer';
import { ExportConfig } from '../types';
import { EnhancedPDFReport } from './pdf/PDFComponents';

// Register custom fonts (optional)
Font.register({
  family: 'Inter',
  src: 'https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfAZ9hiA.woff2'
});


export class EnhancedPDFGenerator {
  static async generateAnalyticsReport(webinarData: any[], config: ExportConfig): Promise<Blob> {
    const branding = config.brandingConfig || {};
    
    const processedData = this.processWebinarData(webinarData, config);
    
    const docElement = (
      <EnhancedPDFReport 
        config={config} 
        data={processedData} 
        branding={branding} 
      />
    );
    
    try {
      const pdfBlob = await pdf(docElement as React.ReactElement).toBlob();
      return pdfBlob;
    } catch (error) {
      console.error("Error generating PDF:", error);
      throw error;
    }
  }

  private static processWebinarData(webinarData: any[], config: ExportConfig) {
    const totalWebinars = webinarData.length;
    const totalParticipants = webinarData.reduce((sum, w) => sum + (w.total_attendees || 0), 0);
    const totalRegistrants = webinarData.reduce((sum, w) => sum + (w.total_registrants || 0), 0);
    const avgEngagement = webinarData.length > 0 
      ? webinarData.reduce((sum, w) => sum + (w.engagement_score || 0), 0) / webinarData.length 
      : 0;
    const attendanceRate = totalRegistrants > 0 ? (totalParticipants / totalRegistrants) * 100 : 0;

    const insights = this.generateInsights(webinarData);
    const trends = this.generateTrends(webinarData);
    const topContent = this.identifyTopContent(webinarData);

    return {
      summary: {
        totalWebinars,
        totalParticipants,
        totalRegistrants,
        avgEngagement: Math.round(avgEngagement * 100) / 100,
        attendanceRate: Math.round(attendanceRate * 100) / 100,
      },
      insights,
      trends,
      topContent,
      webinars: webinarData.map(w => ({
        ...w,
        engagement_score: Math.round((w.engagement_score || 0) * 100) / 100,
        rating: w.rating || Math.random() * 2 + 3 // Mock rating for demo
      }))
    };
  }

  private static generateInsights(webinarData: any[]): any[] {
    const insights = [];
    
    if (webinarData.length > 0) {
      const avgDuration = webinarData.reduce((sum, w) => sum + (w.duration || 0), 0) / webinarData.length;
      let bestPerformer = webinarData[0];
      if(webinarData.length > 1) {
        bestPerformer = webinarData.reduce((best, current) => 
          (current.engagement_score || 0) > (best.engagement_score || 0) ? current : best
        );
      }


      insights.push(
        { text: `Analyzed ${webinarData.length} webinar sessions with comprehensive metrics` },
        { text: `Average webinar duration is ${Math.round(avgDuration)} minutes` },
        { text: `Best performing webinar: "${bestPerformer.topic}" with ${Math.round(bestPerformer.engagement_score || 0)}% engagement` },
        { text: `Total reach across all webinars: ${webinarData.reduce((sum, w) => sum + (w.total_attendees || 0), 0)} participants` }
      );
    }

    return insights;
  }

  private static generateTrends(webinarData: any[]): any {
    // Mock trend data - in real implementation, this would analyze historical data
    return {
      participationTrends: [
        { period: 'Last 30 days', value: 78 },
        { period: 'Last 60 days', value: 72 },
        { period: 'Last 90 days', value: 68 }
      ]
    };
  }

  private static identifyTopContent(webinarData: any[]): any[] {
    return webinarData
      .sort((a, b) => (b.engagement_score || 0) - (a.engagement_score || 0))
      .slice(0, 3)
      .map(webinar => ({
        title: webinar.topic,
        description: `Achieved ${Math.round(webinar.engagement_score || 0)}% engagement with ${webinar.total_attendees || 0} attendees`
      }));
  }
}
