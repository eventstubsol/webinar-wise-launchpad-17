
import { supabase } from '@/integrations/supabase/client';
import { PDFGenerator } from '../PDFGenerator';
import { ExcelGenerator } from '../ExcelGenerator';
import { PowerPointGenerator } from '../PowerPointGenerator';
import { ExportConfig } from '../types';
import { ExportDataProvider } from '../data/ExportDataProvider';

export class ExportJobManager {
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
    // Using ExportJobManager.processExportJob as it's a static method of this class.
    await ExportJobManager.processExportJob(data.id);
    
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
      const config = job.export_config as unknown as ExportConfig;

      // Fetch webinar data based on config using ExportDataProvider
      const webinarData = await ExportDataProvider.fetchWebinarData(config);
      
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
            avgEngagement: webinarData.reduce((sum, w) => sum + (w.engagement_score || 0), 0) / (webinarData.length || 1), // Avoid division by zero
            webinars: webinarData
          }, config);
          fileName = `${config.title.replace(/\s+/g, '_')}_presentation.pptx`;
          break;
        default:
          throw new Error(`Unsupported export type: ${job.export_type}`);
      }

      // Upload the file using ExportDataProvider
      const fileUrl = await ExportDataProvider.uploadFile(fileBlob, fileName);

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
          error_message: error instanceof Error ? error.message : String(error), // Ensure error_message is a string
          completed_at: new Date().toISOString()
        })
        .eq('id', jobId);
    }
  }
}
