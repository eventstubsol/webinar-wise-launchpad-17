import { StyleSheet } from '@react-pdf/renderer';
import { BrandingConfig } from '../../types';

export const createDynamicStyles = (branding: BrandingConfig) => {
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
      borderLeftWidth: 4,
      borderLeftColor: primaryColor,
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
