
import { ExportConfig } from '../types';

export interface CSVExportOptions {
  delimiter?: string;
  includeHeaders?: boolean;
  encoding?: 'utf-8' | 'utf-16';
  dateFormat?: string;
  customFields?: string[];
}

export interface CSVData {
  headers: string[];
  rows: (string | number | null)[][];
  totalRows: number;
}

export class CSVExportEngine {
  static async generateParticipantsCSV(
    webinarData: any[], 
    config: ExportConfig,
    options: CSVExportOptions = {}
  ): Promise<Blob> {
    const {
      delimiter = ',',
      includeHeaders = true,
      encoding = 'utf-8',
      customFields = []
    } = options;

    // Default participant fields
    const defaultFields = [
      'participant_name',
      'participant_email',
      'webinar_title',
      'join_time',
      'leave_time',
      'duration_minutes',
      'engagement_score',
      'organization',
      'job_title',
      'registration_time'
    ];

    const fields = customFields.length > 0 ? customFields : defaultFields;
    const headers = includeHeaders ? [this.formatCSVHeaders(fields)] : [];

    // Extract participant data from webinars
    const participantRows: string[][] = [];
    
    for (const webinar of webinarData) {
      if (webinar.participants && Array.isArray(webinar.participants)) {
        for (const participant of webinar.participants) {
          const row = fields.map(field => {
            let value = this.getNestedValue(participant, field) || 
                       this.getNestedValue(webinar, field) || '';
            
            // Format specific field types
            if (field.includes('time') && value) {
              value = new Date(value).toLocaleString();
            }
            
            if (field === 'duration_minutes' && typeof value === 'number') {
              value = Math.round(value).toString();
            }

            if (field === 'engagement_score' && typeof value === 'number') {
              value = Math.round(value * 100) / 100; // Round to 2 decimal places
            }

            return this.escapeCSVField(value?.toString() || '', delimiter);
          });
          
          participantRows.push(row);
        }
      }
    }

    const csvContent = [...headers, ...participantRows]
      .map(row => row.join(delimiter))
      .join('\n');

    const encoder = new TextEncoder();
    const csvBytes = encoder.encode(csvContent);
    
    return new Blob([csvBytes], { 
      type: 'text/csv;charset=' + encoding 
    });
  }

  static async generateWebinarsCSV(
    webinarData: any[], 
    config: ExportConfig,
    options: CSVExportOptions = {}
  ): Promise<Blob> {
    const {
      delimiter = ',',
      includeHeaders = true,
      encoding = 'utf-8'
    } = options;

    const headers = [
      'webinar_id',
      'title',
      'start_time',
      'duration_minutes',
      'host_email',
      'total_registrants',
      'total_attendees',
      'attendance_rate',
      'avg_duration',
      'engagement_score',
      'poll_count',
      'qa_count',
      'unique_organizations'
    ];

    const csvHeaders = includeHeaders ? [headers.map(h => this.escapeCSVField(h, delimiter))] : [];

    const dataRows = webinarData.map(webinar => {
      const attendanceRate = webinar.total_registrants > 0 
        ? ((webinar.total_attendees / webinar.total_registrants) * 100).toFixed(1)
        : '0';

      return [
        this.escapeCSVField(webinar.webinar_id || '', delimiter),
        this.escapeCSVField(webinar.title || '', delimiter),
        this.escapeCSVField(webinar.start_time ? new Date(webinar.start_time).toLocaleString() : '', delimiter),
        webinar.duration || 0,
        this.escapeCSVField(webinar.host_email || '', delimiter),
        webinar.total_registrants || 0,
        webinar.total_attendees || 0,
        attendanceRate + '%',
        Math.round(webinar.avg_duration || 0),
        Math.round((webinar.engagement_score || 0) * 100) / 100,
        webinar.poll_count || 0,
        webinar.qa_count || 0,
        webinar.unique_organizations || 0
      ];
    });

    const csvContent = [...csvHeaders, ...dataRows]
      .map(row => row.join(delimiter))
      .join('\n');

    const encoder = new TextEncoder();
    const csvBytes = encoder.encode(csvContent);
    
    return new Blob([csvBytes], { 
      type: 'text/csv;charset=' + encoding 
    });
  }

  static async generateEngagementCSV(
    webinarData: any[], 
    config: ExportConfig,
    options: CSVExportOptions = {}
  ): Promise<Blob> {
    const {
      delimiter = ',',
      includeHeaders = true,
      encoding = 'utf-8'
    } = options;

    const headers = [
      'webinar_title',
      'participant_email',
      'participant_name',
      'join_time',
      'leave_time',
      'duration_minutes',
      'attention_score',
      'poll_responses',
      'qa_questions',
      'chat_messages',
      'engagement_level'
    ];

    const csvHeaders = includeHeaders ? [headers.map(h => this.escapeCSVField(h, delimiter))] : [];
    const engagementRows: string[][] = [];

    for (const webinar of webinarData) {
      if (webinar.participants && Array.isArray(webinar.participants)) {
        for (const participant of webinar.participants) {
          const engagementLevel = this.calculateEngagementLevel(participant);
          
          const row = [
            this.escapeCSVField(webinar.title || '', delimiter),
            this.escapeCSVField(participant.participant_email || '', delimiter),
            this.escapeCSVField(participant.participant_name || '', delimiter),
            this.escapeCSVField(participant.join_time ? new Date(participant.join_time).toLocaleString() : '', delimiter),
            this.escapeCSVField(participant.leave_time ? new Date(participant.leave_time).toLocaleString() : '', delimiter),
            Math.round(participant.duration_minutes || 0),
            Math.round((participant.attention_score || 0) * 100) / 100,
            participant.poll_responses || 0,
            participant.qa_questions || 0,
            participant.chat_messages || 0,
            engagementLevel
          ];
          
          engagementRows.push(row);
        }
      }
    }

    const csvContent = [...csvHeaders, ...engagementRows]
      .map(row => row.join(delimiter))
      .join('\n');

    const encoder = new TextEncoder();
    const csvBytes = encoder.encode(csvContent);
    
    return new Blob([csvBytes], { 
      type: 'text/csv;charset=' + encoding 
    });
  }

  private static escapeCSVField(value: string, delimiter: string): string {
    if (!value) return '';
    
    // Escape quotes by doubling them
    const escaped = value.replace(/"/g, '""');
    
    // Wrap in quotes if contains delimiter, quotes, or newlines
    if (escaped.includes(delimiter) || escaped.includes('"') || escaped.includes('\n') || escaped.includes('\r')) {
      return `"${escaped}"`;
    }
    
    return escaped;
  }

  private static formatCSVHeaders(fields: string[]): string[] {
    return fields.map(field => {
      // Convert snake_case to Title Case
      return field
        .split('_')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
    });
  }

  private static getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  private static calculateEngagementLevel(participant: any): string {
    const duration = participant.duration_minutes || 0;
    const pollResponses = participant.poll_responses || 0;
    const qaQuestions = participant.qa_questions || 0;
    const chatMessages = participant.chat_messages || 0;
    
    const score = duration * 0.4 + pollResponses * 10 + qaQuestions * 15 + chatMessages * 5;
    
    if (score >= 50) return 'High';
    if (score >= 25) return 'Medium';
    return 'Low';
  }
}
