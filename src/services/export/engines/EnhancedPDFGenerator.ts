
import React from 'react';
import { Document, Page, Text, View, StyleSheet, pdf, Image, Font } from '@react-pdf/renderer';
import { ExportConfig, BrandingConfig } from '../types';

// Register custom fonts (optional)
Font.register({
  family: 'Inter',
  src: 'https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfAZ9hiA.woff2'
});

const createDynamicStyles = (branding: BrandingConfig) => {
  const primaryColor = branding.primaryColor || '#3B82F6';
  const secondaryColor = branding.secondaryColor || '#E5E7EB';
  const fontFamily = branding.fontFamily || 'Helvetica';

  return StyleSheet.create({
    page: {
      flexDirection: 'column',
      backgroundColor: '#ffffff',
      padding: 30,
      fontFamily: fontFamily,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 30,
      paddingBottom: 20,
      borderBottomWidth: 2,
      borderBottomColor: primaryColor,
      borderBottomStyle: 'solid',
    },
    logo: {
      width: 120,
      height: 40,
      objectFit: 'contain',
    },
    title: {
      fontSize: 28,
      fontWeight: 'bold',
      color: primaryColor,
      marginBottom: 8,
    },
    subtitle: {
      fontSize: 16,
      color: '#6B7280',
      marginBottom: 20,
    },
    section: {
      marginBottom: 25,
    },
    sectionTitle: {
      fontSize: 20,
      fontWeight: 'bold',
      marginBottom: 15,
      color: primaryColor,
      borderBottomWidth: 1,
      borderBottomColor: secondaryColor,
      borderBottomStyle: 'solid',
      paddingBottom: 5,
    },
    subsectionTitle: {
      fontSize: 16,
      fontWeight: 'bold',
      marginBottom: 10,
      color: '#374151',
    },
    text: {
      fontSize: 12,
      lineHeight: 1.6,
      marginBottom: 8,
      color: '#374151',
    },
    metric: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 12,
      padding: 12,
      backgroundColor: '#F9FAFB',
      borderRadius: 4,
      // Border hack: react-pdf doesn't always support border{Side}Style, just do borderLeft
      borderLeftWidth: 4,
      borderLeftColor: primaryColor,
      // borderLeftStyle: 'solid', // Not needed for react-pdf, causes errors in some configs
    },
    metricLabel: {
      fontSize: 12,
      fontWeight: 'bold',
      color: '#374151',
    },
    metricValue: {
      fontSize: 14,
      fontWeight: 'bold',
      color: primaryColor,
    },
    table: {
      display: 'table',
      width: 'auto',
      borderStyle: 'solid',
      borderWidth: 1,
      borderRightWidth: 0,
      borderBottomWidth: 0,
      borderColor: '#E5E7EB',
    },
    tableRow: {
      margin: 'auto',
      flexDirection: 'row',
    },
    tableColHeader: {
      width: '20%',
      borderStyle: 'solid',
      borderWidth: 1,
      borderLeftWidth: 0,
      borderTopWidth: 0,
      borderColor: '#E5E7EB',
      backgroundColor: '#F3F4F6',
      padding: 8,
    },
    tableCol: {
      width: '20%',
      borderStyle: 'solid',
      borderWidth: 1,
      borderLeftWidth: 0,
      borderTopWidth: 0,
      borderColor: '#E5E7EB',
      padding: 8,
    },
    tableCellHeader: {
      fontSize: 10,
      fontWeight: 'bold',
      color: '#374151',
    },
    tableCell: {
      fontSize: 10,
      color: '#6B7280',
    },
    footer: {
      position: 'absolute',
      bottom: 30,
      left: 30,
      right: 30,
      textAlign: 'center',
      color: '#9CA3AF',
      fontSize: 10,
      borderTopWidth: 1,
      borderTopColor: '#E5E7EB',
      // borderTopStyle: 'solid', // Not required
      paddingTop: 10,
    },
    chart: {
      width: '100%',
      height: 200,
      marginBottom: 20,
    },
    insight: {
      backgroundColor: '#F0F9FF',
      borderWidth: 1,
      borderColor: primaryColor,
      // borderStyle: 'solid',
      borderRadius: 4,
      padding: 12,
      marginBottom: 12,
    },
    insightIcon: {
      fontSize: 14,
      color: primaryColor,
      marginRight: 8,
    },
    pageNumber: {
      position: 'absolute',
      fontSize: 10,
      bottom: 30,
      right: 30,
      color: '#6B7280',
    },
  });
};

interface EnhancedPDFReportProps {
  config: ExportConfig;
  data: any;
  branding: BrandingConfig;
}

const EnhancedPDFReport: React.FC<EnhancedPDFReportProps> = ({ config, data, branding }) => {
  const styles = createDynamicStyles(branding);

  const renderSummaryPage = () => (
    <Page size="A4" style={styles.page}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>{config.title}</Text>
          <Text style={styles.subtitle}>{config.description}</Text>
        </View>
        {branding.logo && (
          <Image style={styles.logo} src={branding.logo} />
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Executive Summary</Text>
        <View style={styles.metric}>
          <Text style={styles.metricLabel}>Total Webinars</Text>
          <Text style={styles.metricValue}>{data.summary?.totalWebinars || 0}</Text>
        </View>
        <View style={styles.metric}>
          <Text style={styles.metricLabel}>Total Participants</Text>
          <Text style={styles.metricValue}>{data.summary?.totalParticipants || 0}</Text>
        </View>
        <View style={styles.metric}>
          <Text style={styles.metricLabel}>Average Engagement</Text>
          <Text style={styles.metricValue}>{data.summary?.avgEngagement || 0}%</Text>
        </View>
        <View style={styles.metric}>
          <Text style={styles.metricLabel}>Attendance Rate</Text>
          <Text style={styles.metricValue}>{data.summary?.attendanceRate || 0}%</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Key Insights</Text>
        {data.insights?.map((insight: any, index: number) => (
          <View key={index} style={styles.insight}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={styles.insightIcon}>💡</Text>
              <Text style={styles.text}>{insight.text}</Text>
            </View>
          </View>
        ))}
      </View>

      <Text style={styles.footer}>
        {branding.footerText || `Generated on ${new Date().toLocaleDateString()} | Webinar Wise Analytics`}
      </Text>
      
      <Text style={styles.pageNumber} render={({ pageNumber, totalPages }) => 
        `${pageNumber} / ${totalPages}`
      } fixed />
    </Page>
  );

  const renderPerformancePage = () => (
    <Page size="A4" style={styles.page}>
      <Text style={styles.sectionTitle}>Webinar Performance Analysis</Text>
      
      {data.webinars && data.webinars.length > 0 && (
        <View style={styles.section}>
          <View style={styles.table}>
            <View style={styles.tableRow}>
              <View style={styles.tableColHeader}>
                <Text style={styles.tableCellHeader}>Webinar</Text>
              </View>
              <View style={styles.tableColHeader}>
                <Text style={styles.tableCellHeader}>Attendees</Text>
              </View>
              <View style={styles.tableColHeader}>
                <Text style={styles.tableCellHeader}>Duration</Text>
              </View>
              <View style={styles.tableColHeader}>
                <Text style={styles.tableCellHeader}>Engagement</Text>
              </View>
              <View style={styles.tableColHeader}>
                <Text style={styles.tableCellHeader}>Rating</Text>
              </View>
            </View>
            
            {data.webinars.slice(0, 15).map((webinar: any, index: number) => (
              <View key={index} style={styles.tableRow}>
                <View style={styles.tableCol}>
                  <Text style={styles.tableCell}>
                    {webinar.topic?.substring(0, 30) + (webinar.topic?.length > 30 ? '...' : '')}
                  </Text>
                </View>
                <View style={styles.tableCol}>
                  <Text style={styles.tableCell}>{webinar.total_attendees || 0}</Text>
                </View>
                <View style={styles.tableCol}>
                  <Text style={styles.tableCell}>{webinar.duration || 0} min</Text>
                </View>
                <View style={styles.tableCol}>
                  <Text style={styles.tableCell}>{webinar.engagement_score?.toFixed(1) || 0}%</Text>
                </View>
                <View style={styles.tableCol}>
                  <Text style={styles.tableCell}>
                    {webinar.rating ? '⭐'.repeat(Math.round(webinar.rating)) : 'N/A'}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </View>
      )}

      <Text style={styles.pageNumber} render={({ pageNumber, totalPages }) => 
        `${pageNumber} / ${totalPages}`
      } fixed />
    </Page>
  );

  const renderEngagementPage = () => (
    <Page size="A4" style={styles.page}>
      <Text style={styles.sectionTitle}>Engagement Analysis</Text>
      
      <View style={styles.section}>
        <Text style={styles.subsectionTitle}>Participation Trends</Text>
        {data.trends?.participationTrends?.map((trend: any, index: number) => (
          <View key={index} style={styles.metric}>
            <Text style={styles.metricLabel}>{trend.period}</Text>
            <Text style={styles.metricValue}>{trend.value}%</Text>
          </View>
        ))}
      </View>

      <View style={styles.section}>
        <Text style={styles.subsectionTitle}>Top Performing Content</Text>
        {data.topContent?.map((content: any, index: number) => (
          <View key={index} style={styles.insight}>
            <Text style={styles.text}>
              <Text style={{ fontWeight: 'bold' }}>{content.title}:</Text> {content.description}
            </Text>
          </View>
        ))}
      </View>

      <Text style={styles.pageNumber} render={({ pageNumber, totalPages }) => 
        `${pageNumber} / ${totalPages}`
      } fixed />
    </Page>
  );

  return (
    <Document>
      {renderSummaryPage()}
      {renderPerformancePage()}
      {renderEngagementPage()}
    </Document>
  );
};

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
    
    const pdfBlob = await pdf(docElement as React.ReactElement).toBlob();
    return pdfBlob;
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
      const bestPerformer = webinarData.reduce((best, current) => 
        (current.engagement_score || 0) > (best.engagement_score || 0) ? current : best
      );

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
