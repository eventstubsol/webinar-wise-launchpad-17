
import React from 'react';
import { Document, Page, Text, View, Image } from '@react-pdf/renderer';
import { ExportConfig, BrandingConfig } from '../../types';
import { createDynamicStyles } from './PDFStyles';

interface EnhancedPDFReportProps {
  config: ExportConfig;
  data: any;
  branding: BrandingConfig;
}

const SummaryPage: React.FC<EnhancedPDFReportProps> = ({ config, data, branding }) => {
  const styles = createDynamicStyles(branding);
  return (
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
};

const PerformancePage: React.FC<EnhancedPDFReportProps> = ({ data, branding }) => {
  const styles = createDynamicStyles(branding);
  return (
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
};

const EngagementPage: React.FC<EnhancedPDFReportProps> = ({ data, branding }) => {
  const styles = createDynamicStyles(branding);
  return (
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
};


export const EnhancedPDFReport: React.FC<EnhancedPDFReportProps> = (props) => {
  return (
    <Document>
      <SummaryPage {...props} />
      <PerformancePage {...props} />
      <EngagementPage {...props} />
    </Document>
  );
};
