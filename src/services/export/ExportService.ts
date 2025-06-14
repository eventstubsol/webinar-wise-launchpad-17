
import { supabase } from '@/integrations/supabase/client';
import { PDFGenerator } from './PDFGenerator';
import { ExcelGenerator } from './ExcelGenerator';
import { PowerPointGenerator } from './PowerPointGenerator';
import { ExportConfig, ExportQueueItem, ReportTemplate } from './types';

export class ExportService {
  static async createExportJob(
    exportType: 'pdf' | 'excel' | 'powerpoint' | 'csv',
    config: ExportConfig
  ): Promise<string> {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('export_queue')
      .insert({
        user_id: user.user.id,
        export_type: exportType,
        export_config: config,
        status: 'pending'
      })
      .select()
      .single();

    if (error) throw error;
    
    // Trigger background processing
    await this.processExportJob(data.id);
    
    return data.id;
  }

  static async processExportJob(jobId: string): Promise<void> {
    try {
      // Update status to processing
      await supabase
        .from('export_queue')
        .update({ 
          status: 'processing', 
          started_at: new Date().toISOString(),
          progress_percentage: 10 
        })
        .eq('id', jobId);

      // Get job details
      const { data: job, error: jobError } = await supabase
        .from('export_queue')
        .select('*')
        .eq('id', jobId)
        .single();

      if (jobError) throw jobError;

      // Fetch webinar data based on config
      const webinarData = await this.fetchWebinarData(job.export_config);
      
      // Update progress
      await supabase
        .from('export_queue')
        .update({ progress_percentage: 50 })
        .eq('id', jobId);

      let fileBlob: Blob;
      let fileName: string;

      // Generate export based on type
      switch (job.export_type) {
        case 'pdf':
          fileBlob = await PDFGenerator.generateAnalyticsReport(webinarData, job.export_config);
          fileName = `${job.export_config.title.replace(/\s+/g, '_')}_report.pdf`;
          break;
        case 'excel':
          fileBlob = ExcelGenerator.generateWebinarReport(webinarData, job.export_config);
          fileName = `${job.export_config.title.replace(/\s+/g, '_')}_data.xlsx`;
          break;
        case 'powerpoint':
          fileBlob = await PowerPointGenerator.generateAnalyticsPresentation({
            totalWebinars: webinarData.length,
            totalParticipants: webinarData.reduce((sum, w) => sum + (w.total_attendees || 0), 0),
            avgEngagement: webinarData.reduce((sum, w) => sum + (w.engagement_score || 0), 0) / webinarData.length,
            webinars: webinarData
          }, job.export_config);
          fileName = `${job.export_config.title.replace(/\s+/g, '_')}_presentation.pptx`;
          break;
        default:
          throw new Error(`Unsupported export type: ${job.export_type}`);
      }

      // In a real implementation, you would upload the file to storage
      // For now, we'll create a data URL
      const fileUrl = await this.uploadFile(fileBlob, fileName);

      // Update job with completion
      await supabase
        .from('export_queue')
        .update({
          status: 'completed',
          progress_percentage: 100,
          file_url: fileUrl,
          file_size: fileBlob.size,
          completed_at: new Date().toISOString()
        })
        .eq('id', jobId);

      // Add to report history
      await supabase
        .from('report_history')
        .insert({
          user_id: job.user_id,
          export_queue_id: jobId,
          report_type: job.export_type,
          report_title: job.export_config.title,
          file_url: fileUrl,
          file_size: fileBlob.size,
          delivery_status: 'sent'
        });

    } catch (error) {
      await supabase
        .from('export_queue')
        .update({
          status: 'failed',
          error_message: error instanceof Error ? error.message : 'Unknown error',
          completed_at: new Date().toISOString()
        })
        .eq('id', jobId);
    }
  }

  private static async fetchWebinarData(config: ExportConfig): Promise<any[]> {
    let query = supabase.from('zoom_webinars').select('*');

    if (config.webinarIds && config.webinarIds.length > 0) {
      query = query.in('id', config.webinarIds);
    }

    if (config.dateRange) {
      query = query
        .gte('start_time', config.dateRange.start)
        .lte('start_time', config.dateRange.end);
    }

    const { data, error } = await query.order('start_time', { ascending: false });
    
    if (error) throw error;
    return data || [];
  }

  private static async uploadFile(blob: Blob, fileName: string): Promise<string> {
    // In a real implementation, upload to Supabase Storage or another service
    // For now, return a placeholder URL
    return `https://placeholder-storage.com/${fileName}`;
  }

  static async getExportHistory(): Promise<ExportQueueItem[]> {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('export_queue')
      .select('*')
      .eq('user_id', user.user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  static async getReportTemplates(): Promise<ReportTemplate[]> {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('report_templates')
      .select('*')
      .eq('user_id', user.user.id)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  static async createReportTemplate(template: Partial<ReportTemplate>): Promise<ReportTemplate> {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('report_templates')
      .insert({
        ...template,
        user_id: user.user.id
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }
}
