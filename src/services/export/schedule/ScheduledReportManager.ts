
import { supabase } from '@/integrations/supabase/client';
import { ScheduledReport } from '../types';

export class ScheduledReportManager {
  static async getScheduledReports(): Promise<ScheduledReport[]> {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('scheduled_reports')
      .select('*')
      .eq('user_id', user.user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;
    
    return (data || []).map(item => ({
      ...item,
      report_type: item.report_type as ScheduledReport['report_type'],
      schedule_frequency: item.schedule_frequency as ScheduledReport['schedule_frequency'],
      schedule_config: item.schedule_config as any,
      filter_config: item.filter_config as any,
      recipient_list: item.recipient_list as string[]
    }));
  }

  static async createScheduledReport(report: Partial<ScheduledReport>): Promise<ScheduledReport> {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) throw new Error('User not authenticated');

    if (!report.report_name || !report.report_type || !report.schedule_frequency) {
        throw new Error("Report name, type, and schedule frequency are required.");
    }

    const { data, error } = await supabase
      .from('scheduled_reports')
      .insert({
        user_id: user.user.id,
        report_name: report.report_name,
        report_type: report.report_type,
        template_id: report.template_id,
        schedule_frequency: report.schedule_frequency,
        schedule_config: report.schedule_config as any,
        recipient_list: report.recipient_list as any,
        filter_config: report.filter_config as any,
        is_active: report.is_active !== false // Default to true if not specified
      })
      .select()
      .single();

    if (error) throw error;
    
    return {
      ...data,
      report_type: data.report_type as ScheduledReport['report_type'],
      schedule_frequency: data.schedule_frequency as ScheduledReport['schedule_frequency'],
      schedule_config: data.schedule_config as any,
      filter_config: data.filter_config as any,
      recipient_list: data.recipient_list as string[]
    };
  }
}
