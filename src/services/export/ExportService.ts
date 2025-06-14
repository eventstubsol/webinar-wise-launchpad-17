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
        export_config: config as any, // Cast to any for Supabase Json type
        status: 'pending'
      })
      .select()
      .single();

    if (error) throw error;
    
    // Trigger background processing
    // Consider moving this to a Supabase Edge Function or a dedicated worker
    // if processExportJob is long-running.
    // For now, calling it directly for simplicity in this context.
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

      // Cast the config back to our type
      const config = job.export_config as unknown as ExportConfig; // Safer cast

      // Fetch webinar data based on config
      const webinarData = await this.fetchWebinarData(config);
      
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
          fileBlob = await PDFGenerator.generateAnalyticsReport(webinarData, config);
          fileName = `${config.title.replace(/\s+/g, '_')}_report.pdf`;
          break;
        case 'excel':
          fileBlob = ExcelGenerator.generateWebinarReport(webinarData, config);
          fileName = `${config.title.replace(/\s+/g, '_')}_data.xlsx`;
          break;
        case 'powerpoint':
          fileBlob = await PowerPointGenerator.generateAnalyticsPresentation({
            totalWebinars: webinarData.length,
            totalParticipants: webinarData.reduce((sum, w) => sum + (w.total_attendees || 0), 0),
            avgEngagement: webinarData.reduce((sum, w) => sum + (w.engagement_score || 0), 0) / webinarData.length,
            webinars: webinarData
          }, config);
          fileName = `${config.title.replace(/\s+/g, '_')}_presentation.pptx`;
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
          report_type: job.export_type as string, // DB expects text
          report_title: config.title,
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
    
    return (data || []).map(item => ({
      ...item,
      export_config: item.export_config as unknown as ExportConfig,
      export_type: item.export_type as ExportQueueItem['export_type'],
      status: item.status as ExportQueueItem['status'],
      // Ensure all properties from ExportQueueItem are correctly mapped or cast
      progress_percentage: item.progress_percentage || 0,
      // Make sure nullable fields are handled if item can have them as null
      completed_at: item.completed_at || null, 
      created_at: item.created_at || new Date().toISOString(), 
      error_message: item.error_message || null,
      expires_at: item.expires_at || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      export_format: item.export_format || undefined,
      file_size: item.file_size || undefined,
      file_url: item.file_url || undefined,
      started_at: item.started_at || undefined,
      updated_at: item.updated_at || new Date().toISOString(),

    }));
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
    
    return (data || []).map(item => ({
      ...item,
      template_type: item.template_type as ReportTemplate['template_type'],
      branding_config: item.branding_config as unknown as BrandingConfig, // Cast to BrandingConfig
      layout_config: item.layout_config as any,
      content_sections: item.content_sections as string[]
    }));
  }

  static async createReportTemplate(template: Partial<ReportTemplate>): Promise<ReportTemplate> {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('report_templates')
      .insert({
        ...template,
        user_id: user.user.id,
        template_name: template.template_name || 'Untitled Template', // Ensure required field
        template_type: template.template_type || 'pdf', // Ensure required field
        branding_config: template.branding_config as any, // Cast to any for Supabase
        layout_config: template.layout_config as any, // Cast to any for Supabase
        content_sections: template.content_sections as any // Cast to any for Supabase
      })
      .select()
      .single();

    if (error) throw error;
    
    return {
      ...data,
      template_type: data.template_type as ReportTemplate['template_type'],
      branding_config: data.branding_config as unknown as BrandingConfig, // Cast back
      layout_config: data.layout_config as any,
      content_sections: data.content_sections as string[]
    };
  }
}
