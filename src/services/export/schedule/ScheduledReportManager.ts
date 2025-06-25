
import { supabase } from '@/integrations/supabase/client';
import { ScheduledReport } from '../types';

export class ScheduledReportManager {
  static async getScheduledReports(): Promise<ScheduledReport[]> {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) throw new Error('User not authenticated');

    console.warn('ScheduledReportManager: scheduled_reports table not implemented yet');
    
    // Return mock scheduled reports data
    const mockReports: ScheduledReport[] = [
      {
        id: 'mock-report-1',
        user_id: user.user.id,
        report_name: 'Weekly Analytics Summary',
        report_type: 'pdf', // Fixed: Use valid report_type
        template_id: 'template-1',
        schedule_frequency: 'weekly',
        schedule_config: { time: '09:00', day: 'monday' },
        recipient_list: ['john@example.com', 'sarah@example.com'],
        filter_config: { dateRange: '7d' },
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        last_sent_at: null, // Fixed: Use correct property name
        next_send_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      }
    ];

    return mockReports;
  }

  static async createScheduledReport(report: Partial<ScheduledReport>): Promise<ScheduledReport> {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) throw new Error('User not authenticated');

    if (!report.report_name || !report.report_type || !report.schedule_frequency) {
        throw new Error("Report name, type, and schedule frequency are required.");
    }

    console.warn('ScheduledReportManager: scheduled_reports table not implemented yet');
    
    // Return mock created report
    const mockReport: ScheduledReport = {
      id: `mock-report-${Date.now()}`,
      user_id: user.user.id,
      report_name: report.report_name,
      report_type: report.report_type,
      template_id: report.template_id,
      schedule_frequency: report.schedule_frequency,
      schedule_config: report.schedule_config || {},
      recipient_list: report.recipient_list || [],
      filter_config: report.filter_config || {},
      is_active: report.is_active !== false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      last_sent_at: null, // Fixed: Use correct property name
      next_send_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    };
    
    return mockReport;
  }
}
