
export interface ExportConfig {
  title: string;
  description?: string;
  dateRange?: {
    start: string;
    end: string;
  };
  webinarIds?: string[];
  includeCharts?: boolean;
  includeRawData?: boolean;
  brandingConfig?: BrandingConfig;
  templateId?: string;
}

export interface BrandingConfig {
  logo?: string;
  primaryColor?: string;
  secondaryColor?: string;
  fontFamily?: string;
  companyName?: string;
  headerText?: string;
  footerText?: string;
}

export interface ReportTemplate {
  id: string;
  user_id: string;
  template_name: string;
  template_type: 'pdf' | 'excel' | 'powerpoint';
  template_description?: string;
  branding_config: BrandingConfig;
  layout_config: any;
  content_sections: string[];
  is_default: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ScheduledReport {
  id: string;
  user_id: string;
  report_name: string;
  report_type: 'pdf' | 'excel' | 'powerpoint' | 'multi';
  template_id?: string;
  schedule_frequency: 'daily' | 'weekly' | 'monthly' | 'custom';
  schedule_config: any;
  recipient_list: string[];
  filter_config: any;
  last_sent_at?: string;
  next_send_at?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ExportQueueItem {
  id: string;
  user_id: string;
  export_type: 'pdf' | 'excel' | 'powerpoint' | 'csv';
  export_format?: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  progress_percentage: number;
  file_url?: string;
  file_size?: number;
  export_config: ExportConfig;
  error_message?: string;
  started_at?: string;
  completed_at?: string;
  expires_at: string;
  created_at: string;
  updated_at: string;
}

export interface EmailTemplate {
  id: string;
  user_id: string;
  template_name: string;
  template_type: 'scheduled_report' | 'export_ready' | 'report_failed';
  subject_template: string;
  html_template: string;
  text_template?: string;
  variables: string[];
  is_default: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}
