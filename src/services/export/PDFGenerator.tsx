import React from 'react';
import { Document, Page, Text, View, StyleSheet, pdf, DocumentProps } from '@react-pdf/renderer';
import { ExportConfig, BrandingConfig } from './types';

const styles = StyleSheet.create({
  page: {
    flexDirection: 'column',
    backgroundColor: '#ffffff',
    padding: 30,
  },
  header: {
    marginBottom: 20,
    borderBottom: 1,
    paddingBottom: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#666666',
    marginBottom: 20,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333333',
  },
  text: {
    fontSize: 12,
    lineHeight: 1.5,
    marginBottom: 5,
  },
  metric: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
    padding: 8,
    backgroundColor: '#f8f9fa',
  },
  metricLabel: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  metricValue: {
    fontSize: 12,
    color: '#007bff',
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 30,
    right: 30,
    textAlign: 'center',
    color: '#666666',
    fontSize: 10,
  },
});

interface PDFReportProps {
  config: ExportConfig;
  data: any;
  branding: BrandingConfig;
}

const PDFReport: React.FC<PDFReportProps> = ({ config, data, branding }) => (
  <Document>
    <Page size="A4" style={styles.page}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: branding.primaryColor || '#000000' }]}>
          {config.title}
        </Text>
        {config.description && (
          <Text style={styles.subtitle}>{config.description}</Text>
        )}
        {branding.companyName && (
          <Text style={styles.text}>{branding.companyName}</Text>
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
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Key Insights</Text>
        {data.insights?.map((insight: any, index: number) => (
          <Text key={index} style={styles.text}>
            • {insight.text}
          </Text>
        ))}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Performance Metrics</Text>
        {data.webinars?.map((webinar: any, index: number) => (
          <View key={index} style={styles.metric}>
            <Text style={styles.metricLabel}>{webinar.topic}</Text>
            <Text style={styles.metricValue}>{webinar.attendance_rate}% attendance</Text>
          </View>
        ))}
      </View>

      <Text style={styles.footer}>
        Generated on {new Date().toLocaleDateString()} | {branding.footerText || 'Webinar Wise Analytics'}
      </Text>
    </Page>
  </Document>
);

export class PDFGenerator {
  static async generateReport(config: ExportConfig, data: any): Promise<Blob> {
    const branding = config.brandingConfig || {};
    
    const docElement = <PDFReport config={config} data={data} branding={branding} />;
    // Explicitly cast to React.ReactElement to satisfy the pdf() function's type expectation
    const pdfBlob = await pdf(docElement as React.ReactElement<DocumentProps>).toBlob();
    
    return pdfBlob;
  }

  static async generateAnalyticsReport(webinarData: any[], config: ExportConfig): Promise<Blob> {
    const data = {
      summary: {
        totalWebinars: webinarData.length,
        totalParticipants: webinarData.reduce((sum, w) => sum + (w.total_attendees || 0), 0),
        avgEngagement: webinarData.length > 0 ? webinarData.reduce((sum, w) => sum + (w.engagement_score || 0), 0) / webinarData.length : 0,
      },
      insights: [
        { text: `Analyzed ${webinarData.length} webinar sessions` },
        { text: `Peak attendance was ${Math.max(0, ...webinarData.map(w => w.total_attendees || 0))} participants` },
        { text: `Average session duration was ${webinarData.length > 0 ? Math.round(webinarData.reduce((sum, w) => sum + (w.duration || 0), 0) / webinarData.length) : 0} minutes` },
      ],
      webinars: webinarData.map(w => ({
        topic: w.topic,
        attendance_rate: w.total_registrants > 0 ? Math.round((w.total_attendees / w.total_registrants) * 100) : 0,
      })),
    };

    return this.generateReport(config, data);
  }
}
